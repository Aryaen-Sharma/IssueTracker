import os
from dotenv import load_dotenv
from datetime import timedelta, datetime
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from jose import jwt, JWTError

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")

bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
oauth2_bearer = OAuth2PasswordBearer(tokenUrl='auth/token')

class CreateUserRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    acess_token: str
    token_type: str


