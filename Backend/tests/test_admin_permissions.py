"""Tests for the admin-only delete permission on protected issues.

Every new account is seeded with 3 "protected" issues (high-sensitivity
items like credential rotation). These can only be deleted by an admin —
this is enforced server-side in the delete route, not just hidden in the
UI, so these tests hit the API directly rather than going through React.
"""


def _get_protected_issue_id(client, headers):
    issues = client.get("/auth/", params={"limit": 20}, headers=headers).json()
    protected = [i for i in issues["items"] if i["is_protected"]]
    assert protected, "expected seeded protected issues"
    return protected[0]["id"]


def test_non_admin_cannot_delete_protected_issue(client, auth_headers):
    issue_id = _get_protected_issue_id(client, auth_headers)

    response = client.delete(f"/auth/{issue_id}", headers=auth_headers)

    assert response.status_code == 403
    assert "admin" in response.json()["detail"].lower()

    # confirm it's still there
    still_there = client.get(f"/auth/{issue_id}", headers=auth_headers)
    assert still_there.status_code == 200


def test_admin_can_delete_protected_issue_after_toggling_demo_flag(client, auth_headers):
    issue_id = _get_protected_issue_id(client, auth_headers)

    toggle = client.post("/auth/toggle-admin-demo", headers=auth_headers)
    assert toggle.status_code == 200
    assert toggle.json()["is_admin"] is True

    admin_headers = {"Authorization": f"Bearer {toggle.json()['access_token']}"}
    response = client.delete(f"/auth/{issue_id}", headers=admin_headers)
    assert response.status_code == 200

    gone = client.get(f"/auth/{issue_id}", headers=admin_headers)
    assert gone.status_code == 404


def test_non_protected_issue_can_always_be_deleted(client, auth_headers):
    create = client.post(
        "/auth/createIssue",
        json={"title": "Normal issue", "description": "d", "status": "Open", "priority": "Low"},
        headers=auth_headers,
    )
    issue_id = create.json()["id"]

    response = client.delete(f"/auth/{issue_id}", headers=auth_headers)
    assert response.status_code == 200


def test_client_cannot_set_is_protected_via_patch(client, auth_headers):
    """is_protected is intentionally excluded from the update model, so a
    user can't unprotect their own issue to route around the admin check.
    """
    issue_id = _get_protected_issue_id(client, auth_headers)

    # try to sneak is_protected: false into the patch payload
    client.patch(f"/auth/{issue_id}", json={"is_protected": False}, headers=auth_headers)

    fetched = client.get(f"/auth/{issue_id}", headers=auth_headers).json()
    assert fetched["is_protected"] is True

    # the protection should still be enforced
    delete = client.delete(f"/auth/{issue_id}", headers=auth_headers)
    assert delete.status_code == 403


def test_toggle_admin_demo_is_idempotent_flip(client, auth_headers):
    first = client.post("/auth/toggle-admin-demo", headers=auth_headers)
    assert first.json()["is_admin"] is True

    second = client.post(
        "/auth/toggle-admin-demo",
        headers={"Authorization": f"Bearer {first.json()['access_token']}"},
    )
    assert second.json()["is_admin"] is False
