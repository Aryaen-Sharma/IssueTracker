from fastapi import APIRouter, HTTPException, status, Depends
from models.issues import Issue, IssueUpdate, CommentCreate
import auth
from config.database import collection_issues, collection_users
from schema.schemas import individual_serial, list_serial
from bson import ObjectId
from datetime import date, datetime

router = APIRouter()



### AUTH HELPERS ###
def authenticate_user(username: str, password: str):
    user=collection_users.find_one({"username": username})
    if not user:
        return False
    if not auth.bcrypt_context.verify(password, user["hashed_pass"]):
        return False
    return user

def create_access_token(username: str, id: int, is_admin: bool, expire: auth.timedelta):
    encode = {'sub': username, 'id': id, 'is_admin': is_admin}
    expires = auth.datetime.utcnow() + expire
    encode.update({'exp': expires})
    return auth.jwt.encode(encode, auth.SECRET_KEY, algorithm=auth.ALGORITHM)


async def get_current_user(token: auth.Annotated[str, auth.Depends(auth.oauth2_bearer)]):
    try:
        payload = auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        user_id: str = payload.get("id")

        if username is None or user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate user."
            )

        return {"username": username, "id": user_id, "is_admin": payload.get("is_admin", False)}

    except auth.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate user."
        )



###ISSUE HANDLING###

def _parse_object_id(id: str) -> ObjectId:
    try:
        return ObjectId(id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid issue id")


#Get Issues
@router.get("/")
async def get_issues(
    current_user: auth.Annotated[dict, Depends(get_current_user)],
    skip: int = 0,
    limit: int = 20,
):
    query = {"owner_id": current_user["id"]}
    total = collection_issues.count_documents(query)
    cursor = collection_issues.find(query).sort("created_at", -1).skip(skip).limit(limit)
    return {
        "items": list_serial(cursor),
        "total": total,
        "skip": skip,
        "limit": limit,
    }

# Get issue stats (counts by status/priority) for the dashboard chart
@router.get("/stats")
async def get_stats(current_user: auth.Annotated[dict, Depends(get_current_user)]):
    pipeline = [
        {"$match": {"owner_id": current_user["id"]}},
        {
            "$group": {
                "_id": None,
                "total": {"$sum": 1},
                "open": {"$sum": {"$cond": [{"$eq": ["$status", "Open"]}, 1, 0]}},
                "in_progress": {"$sum": {"$cond": [{"$eq": ["$status", "In Progress"]}, 1, 0]}},
                "closed": {"$sum": {"$cond": [{"$eq": ["$status", "Closed"]}, 1, 0]}},
                "high": {"$sum": {"$cond": [{"$eq": ["$priority", "High"]}, 1, 0]}},
                "medium": {"$sum": {"$cond": [{"$eq": ["$priority", "Medium"]}, 1, 0]}},
                "low": {"$sum": {"$cond": [{"$eq": ["$priority", "Low"]}, 1, 0]}},
            }
        },
    ]
    result = list(collection_issues.aggregate(pipeline))
    if not result:
        return {"total": 0, "open": 0, "in_progress": 0, "closed": 0, "high": 0, "medium": 0, "low": 0}
    stats = result[0]
    stats.pop("_id", None)
    return stats

# Get single issue
@router.get("/{id}")
async def get_issue(id: str, current_user: auth.Annotated[dict, Depends(get_current_user)]):
    object_id = _parse_object_id(id)
    issue = collection_issues.find_one({"_id": object_id, "owner_id": current_user["id"]})
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")
    return individual_serial(issue)

# Post Issue
@router.post("/createIssue", status_code=status.HTTP_201_CREATED)
async def post_issue(issue_Name: Issue, current_user: auth.Annotated[dict, Depends(get_current_user)]):
    payload = dict(issue_Name)
    now = date.today().isoformat()
    payload["owner_id"] = current_user["id"]
    payload["created_at"] = now
    payload["updated_at"] = now
    payload["comments"] = []
    result = collection_issues.insert_one(payload)
    if not result.acknowledged:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create issue")
    return {"message": "Issue created", "id": str(result.inserted_id)}

# Patch Issue (update)
@router.patch("/{id}")
async def patch_issue(id: str, issue: IssueUpdate, current_user: auth.Annotated[dict, Depends(get_current_user)]):
    object_id = _parse_object_id(id)
    update_data = issue.model_dump(exclude_unset=True)
    update_data["updated_at"] = date.today().isoformat()
    updated_issue = collection_issues.find_one_and_update(
        {"_id": object_id, "owner_id": current_user["id"]},
        {"$set": update_data},
        return_document=True
    )
    if not updated_issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")
    return {"message": "Issue updated"}

# Delete Issue
@router.delete("/{id}")
async def delete_issue(id: str, current_user: auth.Annotated[dict, Depends(get_current_user)]):
    object_id = _parse_object_id(id)
    issue = collection_issues.find_one({"_id": object_id, "owner_id": current_user["id"]})
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found or already deleted")

    if issue.get("is_protected") and not current_user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This issue is protected and can only be deleted by an admin.",
        )

    delete_result = collection_issues.delete_one({"_id": object_id})
    if delete_result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found or already deleted")
    return {"message": "Issue deleted"}


### COMMENTS ###

# Add a comment to an issue
@router.post("/{id}/comments", status_code=status.HTTP_201_CREATED)
async def add_comment(id: str, comment: CommentCreate, current_user: auth.Annotated[dict, Depends(get_current_user)]):
    object_id = _parse_object_id(id)
    new_comment = {
        "body": comment.body,
        "author": current_user["username"],
        "created_at": datetime.utcnow().isoformat(),
    }
    updated_issue = collection_issues.find_one_and_update(
        {"_id": object_id, "owner_id": current_user["id"]},
        {"$push": {"comments": new_comment}},
        return_document=True
    )
    if not updated_issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")
    return individual_serial(updated_issue)



### SAMPLE DATA ###
# Every new account gets a starter set of issues so the app isn't an empty
# screen on first login. A few are marked "protected" (critical/high-
# sensitivity items like security or production issues) and can only be
# deleted by an admin — everything else behaves like a normal issue.
def _sample_issues(owner_id: str) -> list[dict]:
    today = date.today().isoformat()
    starters = [
        {
            "title": "Fix login page overflow on mobile",
            "description": "The login form clips off-screen on narrow viewports (< 375px).",
            "status": "Open",
            "priority": "Medium",
            "labels": ["frontend", "css"],
            "due_date": None,
            "is_protected": False,
        },
        {
            "title": "Add dark mode toggle",
            "description": "Users want a persistent light/dark theme switch.",
            "status": "Closed",
            "priority": "Low",
            "labels": ["frontend", "enhancement"],
            "due_date": None,
            "is_protected": False,
        },
        {
            "title": "Rotate production database credentials",
            "description": "Production DB password hasn't been rotated in over 90 days. Security policy requires quarterly rotation.",
            "status": "Open",
            "priority": "High",
            "labels": ["security", "backend", "critical"],
            "due_date": None,
            "is_protected": True,
        },
        {
            "title": "Investigate slow query on issues list",
            "description": "The issues endpoint slows down noticeably past a few thousand documents; likely missing an index on owner_id.",
            "status": "In Progress",
            "priority": "High",
            "labels": ["backend", "performance"],
            "due_date": None,
            "is_protected": False,
        },
        {
            "title": "Audit admin-only delete permissions",
            "description": "Confirm that protected issues can only be removed by admin accounts, and that the check happens server-side, not just in the UI.",
            "status": "Open",
            "priority": "High",
            "labels": ["security", "critical"],
            "due_date": None,
            "is_protected": True,
        },
        {
            "title": "Write unit tests for comment endpoint",
            "description": "The /comments route has no test coverage yet. Add basic create/list cases.",
            "status": "Open",
            "priority": "Medium",
            "labels": ["backend", "testing"],
            "due_date": None,
            "is_protected": False,
        },
        {
            "title": "Improve empty state on dashboard",
            "description": "First-time users see a plain message with no visual cue. Consider a small illustration or CTA.",
            "status": "Closed",
            "priority": "Low",
            "labels": ["frontend", "design"],
            "due_date": None,
            "is_protected": False,
        },
        {
            "title": "Set up automated database backups",
            "description": "There's currently no scheduled backup for the production Atlas cluster. A restore-from-backup drill should follow once this is set up.",
            "status": "Open",
            "priority": "High",
            "labels": ["infra", "critical"],
            "due_date": None,
            "is_protected": True,
        },
        {
            "title": "Add loading skeleton to issue list",
            "description": "Right now the list just shows a plain 'Loading…' message while fetching.",
            "status": "Open",
            "priority": "Low",
            "labels": ["frontend"],
            "due_date": None,
            "is_protected": False,
        },
        {
            "title": "Support filtering issues by due date range",
            "description": "Add a 'this week' / 'overdue' quick filter on the dashboard.",
            "status": "Open",
            "priority": "Medium",
            "labels": ["frontend", "enhancement"],
            "due_date": None,
            "is_protected": False,
        },
    ]

    issues = []
    for starter in starters:
        issue = dict(starter)
        issue["owner_id"] = owner_id
        issue["created_at"] = today
        issue["updated_at"] = today
        issue["comments"] = []
        issues.append(issue)
    return issues


### AUTH ###
@router.post("/user", status_code=status.HTTP_201_CREATED)
async def create_user(create_user_request: auth.CreateUserRequest):
    if collection_users.find_one({"username": create_user_request.username}):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")

    new_user = {
        "username": create_user_request.username,
        "hashed_pass": auth.bcrypt_context.hash(create_user_request.password),
        "is_admin": False,
    }
    result = collection_users.insert_one(new_user)
    collection_issues.insert_many(_sample_issues(str(result.inserted_id)))
    return {"message": "User created successfully"}



@router.post("/token")
async def login_for_token(form_data: auth.Annotated[auth.OAuth2PasswordRequestForm, auth.Depends()]):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    # Backfill: accounts created before sample data existed would otherwise
    # never get a starter set. If this user has no issues at all, seed them
    # now so the dashboard isn't empty.
    owner_id = str(user["_id"])
    if collection_issues.count_documents({"owner_id": owner_id}) == 0:
        collection_issues.insert_many(_sample_issues(owner_id))

    token = create_access_token(
        user["username"], owner_id, user.get("is_admin", False), auth.timedelta(minutes=20)
    )
    return {'access_token': token, 'token_type': 'bearer', 'user_id': owner_id}


# Demo-only: lets the logged-in user flip their own admin flag so visitors
# can try out the admin-only delete permission without a separate admin
# account. A real app would never let a user grant themselves privileges —
# this exists purely to demo the server-side authorization check below.
@router.post("/toggle-admin-demo")
async def toggle_admin_demo(current_user: auth.Annotated[dict, Depends(get_current_user)]):
    user = collection_users.find_one({"_id": ObjectId(current_user["id"])})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    new_is_admin = not user.get("is_admin", False)
    collection_users.update_one({"_id": user["_id"]}, {"$set": {"is_admin": new_is_admin}})

    token = create_access_token(user["username"], str(user["_id"]), new_is_admin, auth.timedelta(minutes=20))
    return {"access_token": token, "token_type": "bearer", "is_admin": new_is_admin}
