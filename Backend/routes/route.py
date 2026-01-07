from fastapi import APIRouter, HTTPException, status, Depends
from models.issues import Issue, IssueUpdate
import auth
from config.database import collection_issues, collection_users
from schema.schemas import list_serial
from bson import ObjectId

router = APIRouter()



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

#Get Issue
@router.get("/")
async def get_issues(current_user: auth.Annotated[dict, Depends(get_current_user)]):
    issues = list_serial(collection_issues.find())
    return issues

#Post Issue
@router.post("/createIssue")
async def post_issue(issue_Name: Issue):
    collection_issues.insert_one(dict(issue_Name))
    

#patch Issue (update)
@router.patch("/{id}")
async def patch_issue(id: str, issue: IssueUpdate):
    update_data = issue.dict(exclude_unset=True)
    collection_issues.find_one_and_update({"_id": ObjectId(id)}, {"$set": update_data})

#Delete Issue
@router.delete("/{id}")
async def delete_issue(id: str):
    collection_issues.delete_one({"_id": ObjectId(id)})


###AUTH###
@router.post("/user")
async def create_user(create_user_request: auth.CreateUserRequest):
    new_user= {
        "username": create_user_request.username,
        "hashed_pass": auth.bcrypt_context.hash(create_user_request.password)
    }
    collection_users.insert_one(new_user)

@router.post("/token")
async def login_for_token(form_data: auth.Annotated[auth.OAuth2PasswordRequestForm, auth.Depends()]):
    user = authenticate_user(form_data.username, form_data.password)
    print(user)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    token= create_access_token(user["username"], str(user.get("_id")), auth.timedelta(minutes=20))
    return {'access_token': token, 'token_type': 'bearer'}
