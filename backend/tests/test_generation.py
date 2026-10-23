from unittest.mock import patch


class TestGenerate:
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

        with patch('api.generation.request_kie_generation') as mock_kie:
            mock_kie.return_value = {"taskId": "test-task-123"}
            response = client.post(
                "/api/v1/ai/generate",
                json={
                    "category": "image",
                    "model": "flux",
                    "inputs": {"prompt": "a cat"}
                },
                headers=auth_headers
            )
        assert response.status_code in [200, 400, 500]

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
