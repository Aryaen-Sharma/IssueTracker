from pydantic import BaseModel

class Comment(BaseModel):
    body: str
    author: str | None = None
    created_at: str | None = None

class Issue(BaseModel):
    title: str
    description: str
    status: str
    priority: str = "Medium"
    # These are set by the server, not the client.
    owner_id: str | None = None
    created_at: str | None = None
    updated_at: str | None = None

class IssueUpdate(BaseModel):
    title: str | None = None
    owner_id: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    created_at: str | None = None
    updated_at: str | None = None

class CommentCreate(BaseModel):
    body: str

