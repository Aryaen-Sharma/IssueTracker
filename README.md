# Issue Tracker

A full-stack issue tracking application designed for personal task management. This project features a **React** frontend communicating with a **FastAPI** backend, utilizing **MongoDB** for persistent storage and **JWT** for secure authentication.

---

## 🛠 Tech Stack

* **Frontend:** React (Vite), Bootstrap 5, Axios
* **Backend:** FastAPI, Pydantic, Jose (JWT), Passlib (Bcrypt)
* **Database:** MongoDB



---

## 🚀 Getting Started

### 1. Prerequisites
* Python 3.10+
* Node.js (v18+)
* MongoDB instance (Local or Atlas)

### 2. Backend Setup
1.  Navigate to the backend folder:
    ```bash
    cd backend
    ```
2.  Create and activate a virtual environment:
    ```bash
    python -m venv env
    # Windows
    .\env\Scripts\activate
    ```
3.  Install dependencies:
    ```bash
    pip install fastapi uvicorn pymongo passlib[bcrypt] python-multipart python-jose[cryptography]
    ```
4.  Start the server:
    ```bash
    uvicorn main:app --reload
    ```
    *Backend runs at `http://localhost:8000`.*

### 3. Frontend Setup
1.  Navigate to the Frontend folder:
    ```bash
    cd FrontEnd
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the Vite dev server:
    ```bash
    npm run dev
    ```
    *Frontend runs at `http://localhost:5173`.*

---

## 🔑 Key Features

* **JWT Authentication:** Secure login flow using OAuth2 Bearer tokens.
* **Data Integrity:** Pydantic models ensure all issues have a title, description, and status before saving.
* **State Management:** Controlled React components manage form inputs and clear automatically on success.
* **CORS Enabled:** Configured middleware allows secure cross-origin requests between the Vite dev server and FastAPI.



---

## 📂 Project Structure

```text
IssueTracker/
├── backend/
│   ├── models/          # Pydantic and Database models
│   ├── routes/          # FastAPI route definitions
│   ├── config/          # Database connection settings
│   └── main.py          # App entry point and CORS config
└── FrontEnd/
    ├── src/
    │   ├── api.js       # Axios instance with base URL
    │   ├── App.jsx      # Main logic and Issue table
    │   └── main.jsx     # Global Bootstrap imports
    └── package.json     # Frontend dependencies
