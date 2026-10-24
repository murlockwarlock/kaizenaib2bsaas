import os
import sys
import pytest
from unittest.mock import MagicMock, patch

# Ensure the backend directory is in the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set required env vars BEFORE importing anything from the app
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-only")
os.environ.setdefault("KIE_API_KEY", "mock_key")
os.environ["SMTP_EMAIL"] = ""
os.environ["SMTP_PASSWORD"] = ""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from core.database import Base, get_db
from core.rate_limit import limiter
from main import app


# SQLite remains the fast local default. CI can set TEST_DATABASE_URL to a
# disposable PostgreSQL database so the same API tests exercise real Numeric,
# locking and index behavior.
SQLALCHEMY_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "sqlite:///./test.db")
connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function", autouse=True)
def setup_database():
    """Create tables before each test, drop after."""
    Base.metadata.create_all(bind=engine)
    # Reset rate limiter between tests
    limiter.reset()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    """FastAPI test client."""
    return TestClient(app)


@pytest.fixture()
def db_session():
    """Database session for direct DB operations in tests."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def test_user(client):
    """Register and return a test user."""
    with patch('api.auth.redis_client') as mock_redis:
        mock_redis.get.return_value = None
        response = client.post("/api/v1/auth/register", json={
            "email": "test@example.com",
            "password": "testpassword123"
        })
    return response.json()


@pytest.fixture()
def auth_headers(client, test_user):
    """Get auth headers for an authenticated user."""
    response = client.post("/api/v1/auth/login", data={
        "username": "test@example.com",
        "password": "testpassword123"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
