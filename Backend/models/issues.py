from pydantic import BaseModel

class Issue(BaseModel):
    title: str
    owner_id:str
    description: str
    status: str
    created_at: str
    updated_at: str

class IssueUpdate(BaseModel):
    title: str | None = None
    owner_id:str | None = None
    description: str | None = None
    status: str | None = None
    created_at: str | None = None
    updated_at: str | None = None