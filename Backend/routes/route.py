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

def create_access_token(username: str, id:int, expire: auth.timedelta):
    encode = {'sub': username, 'id': id}
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
            
        return {"username": username, "id": user_id}

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
async def get_issues(current_user: auth.Annotated[dict, Depends(get_current_user)]):
    issues = list_serial(collection_issues.find({"owner_id": current_user["id"]}))
    return issues

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
    delete_result = collection_issues.delete_one({"_id": object_id, "owner_id": current_user["id"]})
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



### AUTH ###
@router.post("/user", status_code=status.HTTP_201_CREATED)
async def create_user(create_user_request: auth.CreateUserRequest):
    if collection_users.find_one({"username": create_user_request.username}):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
    
    new_user = {
        "username": create_user_request.username,
        "hashed_pass": auth.bcrypt_context.hash(create_user_request.password)
    }
    collection_users.insert_one(new_user)
    return {"message": "User created successfully"            }



@router.post("/token")
async def login_for_token(form_data: auth.Annotated[auth.OAuth2PasswordRequestForm, auth.Depends()]):
    user = authenticate_user(form_data.username, form_data.password)
    print(user)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    token= create_access_token(user["username"], str(user.get("_id")), auth.timedelta(minutes=20))
    return {'access_token': token, 'token_type': 'bearer', 'user_id': str(user.get("_id"))}
