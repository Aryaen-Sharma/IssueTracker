import os
import sys
import uuid

import pytest

# Point the app at a separate test database *before* importing it, since
# config/database.py connects at import time. This keeps automated test
# runs from ever touching the real issue_tracker_db data.
os.environ["MONGO_DB_NAME"] = "issue_tracker_test_db"

# Backend/ isn't a package (routes/config/etc. use plain top-level imports
# like `import auth`), so it needs to be on sys.path the same way it would
# be if you ran `uvicorn main:app` from inside Backend/.
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402
from config.database import collection_issues, collection_users  # noqa: E402


@pytest.fixture(scope="session")
def client():
    return TestClient(main.app)


@pytest.fixture
def test_user(client):
    """Registers a fresh user for each test and cleans it up afterward,
    so tests never depend on or interfere with each other's data.
    """
    username = "pytest_" + uuid.uuid4().hex[:10]
    password = "testpass123"

    client.post("/auth/user", json={"username": username, "password": password})

    yield {"username": username, "password": password}

    user = collection_users.find_one({"username": username})
    if user:
        collection_issues.delete_many({"owner_id": str(user["_id"])})
        collection_users.delete_one({"_id": user["_id"]})


@pytest.fixture
def auth_headers(client, test_user):
    """Logs the test user in and returns ready-to-use auth headers."""
    response = client.post(
        "/auth/token",
        data={"username": test_user["username"], "password": test_user["password"]},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
