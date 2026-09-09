from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.route import router

#FastAPI Setup for uvicorn
app=FastAPI()
app.include_router(router, prefix="/auth")

origins = [
    "http://localhost:5173",  # Vite dev server
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # This allows OPTIONS, POST, GET, etc.
    allow_headers=["*"],  # This allows your Authorization header   
)
