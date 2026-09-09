import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.route import router

#FastAPI Setup for uvicorn
app=FastAPI()
app.include_router(router, prefix="/auth")

# In production the frontend and backend are served from the same domain
# (see vercel.json), so CORS isn't needed there. Locally the Vite dev server
# runs on its own port, and the e2e suite uses a different one again, so the
# allowed origins are configurable via CORS_ORIGINS.
default_origins = "http://localhost:5173"
origins = [o.strip() for o in os.getenv("CORS_ORIGINS", default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # This allows OPTIONS, POST, GET, etc.
    allow_headers=["*"],  # This allows your Authorization header   
)
