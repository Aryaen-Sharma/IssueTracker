import os
from dotenv import load_dotenv
from pymongo import MongoClient
load_dotenv()


client = MongoClient("mongodb+srv://" + os.getenv("MONGO_USER") + ":" + os.getenv("MONGO_PASS") + "@issuetrackerdb.oykuy3e.mongodb.net/?appName=IssueTrackerDB")

db = client.issue_tracker_db

collection_issues = db["Issues_List"]
collection_users = db["Users"]
