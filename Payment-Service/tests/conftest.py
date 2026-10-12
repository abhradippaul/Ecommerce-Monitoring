import os
from pathlib import Path
import pytest
import jwt
from fastapi.testclient import TestClient

# Ensure environment variables before importing app
os.environ["NODE_ENV"] = "test"
os.environ["LOG_TO_FILE"] = "false"
os.environ["MONGODB_URI"] = "mongodb://localhost:27017/test_db"
os.environ["JWT_PUBLIC_KEY_FILE_LOCATION"] = str(Path(__file__).parent.parent / "keys" / "public.pem")

from app.main import app

PRIVATE_KEY_PATH = Path(__file__).parent.parent / "keys" / "private.pem"


@pytest.fixture(scope="session")
def private_key():
    with open(PRIVATE_KEY_PATH, "r", encoding="utf-8") as f:
        return f.read()


@pytest.fixture
def make_auth_token(private_key):
    def _generator(user_id: str = "test-user-123", role: str = "buyer"):
        payload = {
            "id": user_id,
            "role": role,
            "iss": "auth-service",
        }
        return jwt.encode(payload, private_key, algorithm="RS256")

    return _generator


@pytest.fixture(scope="session")
def client():
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client
