from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch

from core.security import create_access_token, get_password_hash
from core.rate_limit import limiter
from main import app
from models.task import Task
from models.user import User
from fastapi.testclient import TestClient


def _create_verified_user(db_session, *, email: str, balance: float = 100):
    user = User(
        email=email,
        hashed_password=get_password_hash("password123"),
        balance=balance,
        is_verified=True,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    token = create_access_token({"sub": user.email, "pv": user.password_version})
    return user, {"Authorization": f"Bearer {token}"}


def test_client_generation_failure_flow_returns_credits_and_notification(client, db_session):
    user, headers = _create_verified_user(db_session, email="client-flow@example.com", balance=100)

    with patch("services.tasks.generate_kie_task.delay"):
        create_response = client.post(
            "/api/v1/ai/generate",
            json={
                "category": "image",
                "model": "flux",
                "inputs": {"prompt": "a test image"},
            },
            headers=headers,
        )

    assert create_response.status_code == 200
    task_id = create_response.json()["task_id"]
    task = db_session.query(Task).filter(Task.id == task_id).one()
    assert create_response.json() == {
        "task_id": task_id,
        "status": "pending",
        "message": "Generation queued successfully",
    }

    db_session.refresh(user)
    assert float(user.balance) == 98.5

    task.task_id_vendor = "acceptance-failure-task"
    task.status = "processing"
    db_session.commit()

    with patch("api.generation.settings.KIE_CALLBACK_TOKEN", "callback-token"):
        callback_response = client.post(
            "/api/v1/ai/kie/callback?token=callback-token",
            json={
                "code": 200,
                "data": {
                    "taskId": "acceptance-failure-task",
                    "state": "fail",
                    "failMsg": "Provider rejected the prompt",
                },
            },
        )

    assert callback_response.status_code == 200
    status_response = client.get(f"/api/v1/ai/status/{task_id}", headers=headers)
    assert status_response.status_code == 200
    status = status_response.json()
    assert status["status"] == "failed"
    assert status["credits_refunded"] is True
    assert status["result_url"] is None
    assert "Provider rejected" in status["error_message"]

    db_session.expire_all()
    db_session.refresh(user)
    db_session.refresh(task)
    assert float(user.balance) == 100
    assert task.credits_refunded_at is not None

    notifications = client.get("/api/v1/auth/notifications", headers=headers)
    assert notifications.status_code == 200
    failed = [item for item in notifications.json()["items"] if item["kind"] == "generation_failed"]
    assert len(failed) == 1
    assert failed[0]["metadata"]["credits_refunded"] is True


def test_client_success_flow_exposes_result_and_allows_delete(client, db_session):
    user, headers = _create_verified_user(db_session, email="client-success@example.com", balance=100)

    with patch("services.tasks.generate_kie_task.delay"):
        response = client.post(
            "/api/v1/ai/generate",
            json={
                "category": "image",
                "model": "flux",
                "inputs": {"prompt": "a successful test image"},
            },
            headers=headers,
        )
    task_id = response.json()["task_id"]
    task = db_session.query(Task).filter(Task.id == task_id).one()
    task.task_id_vendor = "acceptance-success-task"
    task.status = "processing"
    db_session.commit()

    with patch("api.generation.settings.KIE_CALLBACK_TOKEN", "callback-token"):
        callback_response = client.post(
            "/api/v1/ai/kie/callback?token=callback-token",
            json={
                "code": 200,
                "data": {
                    "taskId": "acceptance-success-task",
                    "state": "success",
                    "resultUrls": ["https://cdn.example/success.png"],
                },
            },
        )
    assert callback_response.status_code == 200

    status_response = client.get(f"/api/v1/ai/status/{task_id}", headers=headers)
    assert status_response.status_code == 200
    assert status_response.json()["status"] == "success"
    assert status_response.json()["result_url"] == "https://cdn.example/success.png"
    assert status_response.json()["credits_refunded"] is False

    creations = client.get("/api/v1/ai/my-creations", headers=headers)
    assert creations.status_code == 200
    assert creations.json()["total"] == 1
    assert creations.json()["items"][0]["output_url"] == "https://cdn.example/success.png"

    delete_response = client.delete(f"/api/v1/ai/tasks/{task_id}", headers=headers)
    assert delete_response.status_code == 200
    assert client.get(f"/api/v1/ai/status/{task_id}", headers=headers).status_code == 404


def test_client_cannot_read_or_delete_another_clients_task(client, db_session):
    owner, owner_headers = _create_verified_user(db_session, email="owner@example.com")
    other_user, other_headers = _create_verified_user(db_session, email="other@example.com")
    task = Task(
        user_id=owner.id,
        task_id_vendor="owner-task",
        tool_type="general",
        category="image",
        model="flux",
        status="success",
        output_url="https://cdn.example/owner.png",
        cost=1.5,
        completed_at=datetime.now(timezone.utc),
    )
    db_session.add(task)
    db_session.commit()

    status_response = client.get(f"/api/v1/ai/status/{task.id}", headers=other_headers)
    delete_response = client.delete(f"/api/v1/ai/tasks/{task.id}", headers=other_headers)
    assert status_response.status_code == 404
    assert delete_response.status_code == 404

    like_response = client.post(f"/api/v1/ai/likes/{task.id}", headers=other_headers)
    assert like_response.status_code == 200
    assert client.get("/api/v1/ai/likes", headers=other_headers).json()[0]["id"] == task.id

    owner_status = client.get(f"/api/v1/ai/status/{task.id}", headers=owner_headers)
    assert owner_status.status_code == 200
    assert owner_status.json()["result_url"] == "https://cdn.example/owner.png"


def test_unverified_client_cannot_generate_and_admin_cannot_be_reached_by_client(client, auth_headers):
    generation_response = client.post(
        "/api/v1/ai/generate",
        json={"category": "image", "model": "flux", "inputs": {"prompt": "test"}},
        headers=auth_headers,
    )
    assert generation_response.status_code == 403

    for path in ("/api/v1/admin/stats", "/api/v1/admin/users", "/api/v1/billing/admin/payments"):
        response = client.get(path, headers=auth_headers)
        assert response.status_code == 403


def test_parallel_requests_cannot_overspend_the_same_balance(db_session):
    _user, headers = _create_verified_user(
        db_session,
        email="parallel-balance@example.com",
        balance=1.5,
    )
    limiter.reset()

    def submit(key: str):
        with TestClient(app) as local_client:
            response = local_client.post(
                "/api/v1/ai/generate",
                json={
                    "category": "image",
                    "model": "flux",
                    "inputs": {"prompt": "parallel test"},
                },
                headers={**headers, "Idempotency-Key": key},
            )
            return response.status_code, response.json()

    with patch("services.tasks.generate_kie_task.delay"):
        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(submit, ("parallel-a", "parallel-b")))

    assert sorted(status for status, _body in results) == [200, 400], results
    db_session.expire_all()
    user = db_session.query(User).filter(User.email == "parallel-balance@example.com").one()
    assert float(user.balance) == 0
    assert db_session.query(Task).filter(Task.user_id == user.id).count() == 1
