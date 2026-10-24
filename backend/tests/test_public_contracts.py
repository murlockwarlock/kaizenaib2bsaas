from datetime import datetime, timezone

from models.task import Task
from models.user import User


def test_public_catalog_is_readable_without_authentication(client):
    for path in (
        "/api/v1/public/promotions",
        "/api/v1/public/banners",
        "/api/v1/public/faqs",
        "/api/v1/public/examples",
        "/api/v1/public/settings",
        "/api/v1/public/prices",
        "/api/v1/public/featured-audio",
        "/api/v1/public/pricing-plans",
        "/api/v1/public/tasks",
    ):
        response = client.get(path)
        assert response.status_code == 200, (path, response.text)


def test_public_successful_task_contract_and_view_counter(client, db_session):
    user = User(
        email="public-author@example.com",
        hashed_password="not-used",
        balance=0,
        is_verified=True,
        is_active=True,
        display_name="Public Author",
    )
    db_session.add(user)
    db_session.flush()
    task = Task(
        user_id=user.id,
        task_id_vendor="public-task",
        tool_type="general",
        category="image",
        model="flux",
        status="success",
        output_url="https://cdn.example/public.png",
        is_public=True,
        view_count=0,
        completed_at=datetime.now(timezone.utc),
    )
    db_session.add(task)
    db_session.commit()

    response = client.get("/api/v1/public/tasks")
    assert response.status_code == 200
    row = next(item for item in response.json() if item["id"] == task.id)
    assert row["output_url"] == "https://cdn.example/public.png"
    assert row["author_display_name"] == "Public Author"
    assert row["like_count"] == 0
    assert row["is_hot"] is False

    viewed = client.post(f"/api/v1/public/tasks/{task.id}/view")
    assert viewed.status_code == 200
    assert viewed.json()["view_count"] == 1

    profile = client.get(f"/api/v1/public/profiles/{user.id}?category=image")
    assert profile.status_code == 200
    assert profile.json()["stats"]["posts"] == 1
    assert profile.json()["tasks"][0]["id"] == task.id

