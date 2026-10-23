from unittest.mock import patch


class TestRegister:
    def test_register_success(self, client):
        with patch('api.auth.redis_client'):
            response = client.post("/api/v1/auth/register", json={
                "email": "newuser@example.com",
                "password": "password123"
            })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert "id" in data
        assert data["balance"] >= 0

    def test_register_duplicate_email(self, client):
        with patch('api.auth.redis_client'):
            client.post("/api/v1/auth/register", json={
                "email": "dupe@example.com",
                "password": "password123"
            })
            response = client.post("/api/v1/auth/register", json={
                "email": "dupe@example.com",
                "password": "password456"
            })
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]

    def test_register_invalid_email(self, client):
        with patch('api.auth.redis_client'):
            response = client.post("/api/v1/auth/register", json={
                "email": "not-an-email",
                "password": "password123"
            })
        assert response.status_code == 422  # Validation error


class TestLogin:
    def test_login_success(self, client, test_user):
        response = client.post("/api/v1/auth/login", data={
            "username": "test@example.com",
            "password": "testpassword123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client, test_user):
        response = client.post("/api/v1/auth/login", data={
            "username": "test@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 400

    def test_login_nonexistent_user(self, client):
        response = client.post("/api/v1/auth/login", data={
            "username": "noone@example.com",
            "password": "password123"
        })
        assert response.status_code == 400


class TestMe:
    def test_me_authenticated(self, client, auth_headers):
        response = client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"

    def test_me_unauthenticated(self, client):
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401
