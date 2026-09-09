import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

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

# Serve the built React app (FrontEnd/dist) for every route that isn't
# handled by the API above. This lets one Vercel deployment serve both
# the API and the frontend from the same origin, so no CORS is needed
# in production, and React Router's client-side routes (e.g. /issues/1)
# still resolve to index.html via the catch-all below.
_frontend_dist = os.path.join(os.path.dirname(__file__), "..", "FrontEnd", "dist")
if os.path.isdir(_frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(_frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        return FileResponse(os.path.join(_frontend_dist, "index.html"))
