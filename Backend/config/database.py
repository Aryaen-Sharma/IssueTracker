import os
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import PyMongoError

load_dotenv()

ATLAS_URI = (
    "mongodb+srv://"
    + os.getenv("MONGO_USER", "")
    + ":"
    + os.getenv("MONGO_PASS", "")
    + "@issuetrackerdb.oykuy3e.mongodb.net/?appName=IssueTrackerDB"
)
LOCAL_URI = os.getenv("MONGO_LOCAL_URI", "mongodb://localhost:27017")

# Tests set MONGO_DB_NAME to a separate database (e.g. issue_tracker_test_db)
# so automated runs never touch real data.
DB_NAME = os.getenv("MONGO_DB_NAME", "issue_tracker_db")


def _connect() -> MongoClient:
    """Connect to MongoDB Atlas. Locally, fall back to a local MongoDB
    instance if Atlas is unreachable (e.g. DNS failure, no internet, bad
    credentials), so the app still runs for local development without a
    cloud connection. In production (Vercel) there is no local Mongo to
    fall back to, so a bad Atlas connection will raise clearly instead of
    failing later with a confusing error.
    """
    try:
        client = MongoClient(ATLAS_URI, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
        print("[database] Connected to MongoDB Atlas.")
        return client
    except PyMongoError as exc:
        print(f"[database] Atlas connection failed ({exc.__class__.__name__}: {exc}); "
              f"trying local fallback at {LOCAL_URI}.")

    if os.getenv("VERCEL"):
        raise RuntimeError(
            "Could not connect to MongoDB Atlas. Check MONGO_USER/MONGO_PASS "
            "in the Vercel project's environment variables (the password may "
            "be stale or the Atlas IP access list may be blocking Vercel)."
        )

    try:
        client = MongoClient(LOCAL_URI, serverSelectionTimeoutMS=3000)
        client.admin.command("ping")
        print("[database] Connected to local MongoDB.")
        return client
    except PyMongoError as exc:
        raise RuntimeError(
            "Could not connect to MongoDB Atlas or a local MongoDB instance. "
            "Start a local MongoDB server (e.g. `mongod` on port 27017) or fix "
            "the Atlas connection string in .env."
        ) from exc


client = _connect()
db = client[DB_NAME]

collection_issues = db["Issues_List"]
collection_users = db["Users"]
