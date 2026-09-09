"""Tests for issue CRUD, pagination, comments, and stats."""


def test_create_and_fetch_issue(client, auth_headers):
    create = client.post(
        "/auth/createIssue",
        json={
            "title": "Fix flaky test",
            "description": "test_login sometimes fails locally",
            "status": "Open",
            "priority": "High",
            "labels": ["backend", "testing"],
            "due_date": "2026-12-01",
            "assignee": "Jordan",
        },
        headers=auth_headers,
    )
    assert create.status_code == 201
    issue_id = create.json()["id"]

    fetched = client.get(f"/auth/{issue_id}", headers=auth_headers)
    assert fetched.status_code == 200
    body = fetched.json()
    assert body["title"] == "Fix flaky test"
    assert body["labels"] == ["backend", "testing"]
    assert body["due_date"] == "2026-12-01"
    assert body["assignee"] == "Jordan"
    assert body["is_protected"] is False


def test_update_issue_fields(client, auth_headers):
    create = client.post(
        "/auth/createIssue",
        json={"title": "Original title", "description": "d", "status": "Open", "priority": "Low"},
        headers=auth_headers,
    )
    issue_id = create.json()["id"]

    update = client.patch(
        f"/auth/{issue_id}",
        json={"status": "Closed", "priority": "High", "assignee": "Alex"},
        headers=auth_headers,
    )
    assert update.status_code == 200

    fetched = client.get(f"/auth/{issue_id}", headers=auth_headers).json()
    assert fetched["status"] == "Closed"
    assert fetched["priority"] == "High"
    assert fetched["assignee"] == "Alex"
    # untouched fields are unchanged
    assert fetched["title"] == "Original title"


def test_delete_issue_removes_it(client, auth_headers):
    create = client.post(
        "/auth/createIssue",
        json={"title": "Temp issue", "description": "d", "status": "Open", "priority": "Low"},
        headers=auth_headers,
    )
    issue_id = create.json()["id"]

    delete = client.delete(f"/auth/{issue_id}", headers=auth_headers)
    assert delete.status_code == 200

    fetched = client.get(f"/auth/{issue_id}", headers=auth_headers)
    assert fetched.status_code == 404


def test_get_issue_not_found_returns_404(client, auth_headers):
    response = client.get("/auth/64b7f9f9f9f9f9f9f9f9f9f9", headers=auth_headers)
    assert response.status_code == 404


def test_get_issue_invalid_id_returns_400(client, auth_headers):
    response = client.get("/auth/not-a-valid-object-id", headers=auth_headers)
    assert response.status_code == 400


def test_pagination_respects_skip_and_limit(client, auth_headers):
    # the account already has 10 seeded issues; fetch in two pages of 4
    page1 = client.get("/auth/", params={"skip": 0, "limit": 4}, headers=auth_headers).json()
    page2 = client.get("/auth/", params={"skip": 4, "limit": 4}, headers=auth_headers).json()

    assert page1["total"] == 10
    assert len(page1["items"]) == 4
    assert len(page2["items"]) == 4
    # pages shouldn't overlap
    page1_ids = {item["id"] for item in page1["items"]}
    page2_ids = {item["id"] for item in page2["items"]}
    assert page1_ids.isdisjoint(page2_ids)


def test_add_comment_to_issue(client, auth_headers):
    create = client.post(
        "/auth/createIssue",
        json={"title": "Needs discussion", "description": "d", "status": "Open", "priority": "Medium"},
        headers=auth_headers,
    )
    issue_id = create.json()["id"]

    comment = client.post(
        f"/auth/{issue_id}/comments", json={"body": "Looks good to me"}, headers=auth_headers
    )
    assert comment.status_code == 201
    assert len(comment.json()["comments"]) == 1
    assert comment.json()["comments"][0]["body"] == "Looks good to me"


def test_stats_reflects_seeded_issues(client, auth_headers):
    stats = client.get("/auth/stats", headers=auth_headers)
    assert stats.status_code == 200
    body = stats.json()
    assert body["total"] == 10
    assert body["open"] + body["in_progress"] + body["closed"] == 10
    assert body["high"] + body["medium"] + body["low"] == 10


def test_users_cannot_see_each_others_issues(client, auth_headers):
    """Each account's issues are scoped by owner_id — a second account
    should never see the first account's data."""
    import uuid
    from config.database import collection_issues, collection_users

    other_username = "pytest_" + uuid.uuid4().hex[:10]
    client.post("/auth/user", json={"username": other_username, "password": "testpass123"})
    other_login = client.post(
        "/auth/token", data={"username": other_username, "password": "testpass123"}
    )
    other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}

    mine = client.get("/auth/", params={"limit": 20}, headers=auth_headers).json()
    theirs = client.get("/auth/", params={"limit": 20}, headers=other_headers).json()

    mine_ids = {item["id"] for item in mine["items"]}
    their_ids = {item["id"] for item in theirs["items"]}
    assert mine_ids.isdisjoint(their_ids)

    # cleanup the second account
    user = collection_users.find_one({"username": other_username})
    collection_issues.delete_many({"owner_id": str(user["_id"])})
    collection_users.delete_one({"_id": user["_id"]})
