def individual_serial(issue) -> dict:
    return {
        "id": str(issue["_id"]),
        "owner_id": str(issue["owner_id"]),
        "title": issue["title"],
        "description": issue["description"],
        "status": issue["status"],
        "priority": issue.get("priority", "Medium"),
        "labels": issue.get("labels", []),
        "due_date": issue.get("due_date"),
        "created_at": issue["created_at"],
        "updated_at": issue["updated_at"],
        "comments": issue.get("comments", []),
    }

def list_serial(issues) -> list:
    return [individual_serial(issue) for issue in issues]
