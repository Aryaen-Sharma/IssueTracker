"""Tests for signup, login, and password change."""
import uuid


def test_signup_creates_user_and_seeds_starter_issues(client):
    username = "pytest_" + uuid.uuid4().hex[:10]
    response = client.post("/auth/user", json={"username": username, "password": "testpass123"})

    assert response.status_code == 201
    assert response.json() == {"message": "User created successfully"}

    # Log in and confirm the starter issue set was seeded (10 issues, 3 of
    # which are protected) so a new account never looks empty.
    login = client.post("/auth/token", data={"username": username, "password": "testpass123"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    issues = client.get("/auth/", params={"limit": 20}, headers=headers).json()
    assert issues["total"] == 10
    assert sum(1 for i in issues["items"] if i["is_protected"]) == 3

    # cleanup
    from config.database import collection_issues, collection_users
    user = collection_users.find_one({"username": username})
    collection_issues.delete_many({"owner_id": str(user["_id"])})
    collection_users.delete_one({"_id": user["_id"]})


def test_signup_rejects_duplicate_username(client, test_user):
    response = client.post(
        "/auth/user", json={"username": test_user["username"], "password": "anotherpass"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Username already exists"


def test_login_with_correct_credentials_returns_token(client, test_user):
    response = client.post(
        "/auth/token",
        data={"username": test_user["username"], "password": test_user["password"]},
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_login_with_wrong_password_is_rejected(client, test_user):
    response = client.post(
        "/auth/token",
        data={"username": test_user["username"], "password": "not-the-right-password"},
    )
    assert response.status_code == 401


def test_protected_route_requires_token(client):
    response = client.get("/auth/")
    assert response.status_code == 401


def test_change_password_requires_correct_current_password(client, test_user, auth_headers):
    response = client.patch(
        "/auth/me/password",
        json={"current_password": "wrong-password", "new_password": "newpass123"},
        headers=auth_headers,
    )
    assert response.status_code == 401


def test_change_password_updates_credentials(client, test_user, auth_headers):
    response = client.patch(
        "/auth/me/password",
        json={"current_password": test_user["password"], "new_password": "newpass456"},
        headers=auth_headers,
    )
    assert response.status_code == 200

    # old password no longer works, new one does
    old = client.post(
        "/auth/token", data={"username": test_user["username"], "password": test_user["password"]}
    )
    assert old.status_code == 401

    new = client.post(
        "/auth/token", data={"username": test_user["username"], "password": "newpass456"}
    )
    assert new.status_code == 200
