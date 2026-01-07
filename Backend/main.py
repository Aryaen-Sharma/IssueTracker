from fastapi import FastAPI, HTTPException
import models

from routes.route import router

#FastAPI Setup for uvicorn
app=FastAPI()
app.include_router(router, prefix="/auth")



