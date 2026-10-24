from unittest.mock import patch


class TestGenerate:
    def test_generation_feature_flag_blocks_new_tasks_but_not_history(self, client, auth_headers, db_session):
        from models.user import User
        from core.config import settings

        user = db_session.query(User).filter(User.email == "test@example.com").first()
        user.is_verified = True
        db_session.commit()

        with patch.object(settings, "AI_GENERATION_ENABLED", False):
            response = client.post(
                "/api/v1/ai/generate",
                json={
                    "category": "image",
                    "model": "flux",
                    "inputs": {"prompt": "a cat"},
                },
                headers=auth_headers,
            )
            history = client.get("/api/v1/ai/my-creations", headers=auth_headers)

        assert response.status_code == 503
        assert history.status_code == 200
        assert history.json()["items"] == []

    def test_generate_unauthenticated(self, client):
        response = client.post("/api/v1/ai/generate", json={
            "category": "image",
            "model": "flux",
            "inputs": {"prompt": "a cat"}
        })
        assert response.status_code == 401

    def test_generate_requires_verified_user(self, client, auth_headers, db_session):
        """Test that unverified users get 403."""
        from models.user import User
        user = db_session.query(User).filter(User.email == "test@example.com").first()
        user.balance = 100
        db_session.commit()

        response = client.post(
            "/api/v1/ai/generate",
            json={
                "category": "image",
                "model": "flux",
                "inputs": {"prompt": "a cat"}
            },
            headers=auth_headers
        )
        assert response.status_code == 403

    def test_generate_verified_user(self, client, auth_headers, db_session):
        """Test generation with verified user."""
        from models.user import User
        user = db_session.query(User).filter(User.email == "test@example.com").first()
        user.balance = 100
        user.is_verified = True
        db_session.commit()

        with patch('services.tasks.generate_kie_task.delay') as mock_delay:
            response = client.post(
                "/api/v1/ai/generate",
                json={
                    "category": "image",
                    "model": "flux",
                    "inputs": {"prompt": "a cat"}
                },
                headers=auth_headers
            )
        assert response.status_code == 200
        assert mock_delay.called

        db_session.refresh(user)
        assert user.balance == 98.5

    def test_generate_idempotency_key_returns_same_task_without_second_charge(
        self, client, auth_headers, db_session
    ):
        from models.user import User
        from models.task import Task

        user = db_session.query(User).filter(User.email == "test@example.com").first()
        user.balance = 100
        user.is_verified = True
        db_session.commit()

        with patch("services.tasks.generate_kie_task.delay") as mock_delay:
            payload = {
                "category": "image",
                "model": "flux",
                "inputs": {"prompt": "a cat"},
            }
            first = client.post(
                "/api/v1/ai/generate",
                json=payload,
                headers={**auth_headers, "Idempotency-Key": "client-retry-1"},
            )
            second = client.post(
                "/api/v1/ai/generate",
                json=payload,
                headers={**auth_headers, "Idempotency-Key": "client-retry-1"},
            )

        assert first.status_code == 200
        assert second.status_code == 200
        assert second.json()["task_id"] == first.json()["task_id"]
        assert mock_delay.call_count == 1
        db_session.refresh(user)
        assert user.balance == 98.5
        assert db_session.query(Task).filter(Task.user_id == user.id).count() == 1

    def test_my_creations_unauthenticated(self, client):
        response = client.get("/api/v1/ai/my-creations")
        assert response.status_code == 401

    def test_my_creations_authenticated(self, client, auth_headers, db_session):
        """Verified user can access my-creations."""
        from models.user import User
        user = db_session.query(User).filter(User.email == "test@example.com").first()
        user.is_verified = True
        db_session.commit()

        response = client.get("/api/v1/ai/my-creations", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0
        assert data["page"] == 1
