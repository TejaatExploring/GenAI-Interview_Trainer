# GenAI Interview Trainer

Production-oriented starter implementation with React frontend, FastAPI backend, OpenRouter LLM integration, MongoDB persistence, topic-controlled prompting, and output validation.

## Architecture

- Frontend: React + Vite + Chart.js
- Backend: FastAPI + service/controller pattern
- AI: OpenRouter primary/fallback model orchestration
- Storage: MongoDB
- Speech: Whisper transcription endpoint

## Features Implemented

- Dynamic question generation with strong prompting
- Semi-RAG topic control using role + experience catalogs
- Strict JSON output validation and bounded score checks
- Practice and mock interview flows
- AI-based evaluation, feedback, and improved answers
- Session/evaluation persistence in MongoDB
- Dashboard APIs and frontend analytics page

## Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB Community Server (localhost:27017)
- FFmpeg (required for speech transcription)

## Setup and Run (Linux)

1. Backend setup:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Configure backend environment:

```bash
cp .env.example .env
# update OPENROUTER_API_KEY and other values
```

3. Start backend:

```bash
uvicorn app.main:app --reload --port 8000
```

4. Frontend setup (new terminal):

```bash
cd frontend
npm install
```

5. Configure frontend environment:

```bash
cp .env.example .env
```

6. Start frontend:

```bash
npm run dev
```

7. Start MongoDB (if not already running):

```bash
mongod --dbpath ./mongodb-data --port 27017
```

## Setup and Run (Windows PowerShell)

1. Backend setup:

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Configure backend environment:

```powershell
Copy-Item .env.example .env
# update OPENROUTER_API_KEY and other values
```

3. Start backend:

```powershell
uvicorn app.main:app --reload --port 8000
```

4. Frontend setup (new terminal):

```powershell
cd frontend
npm install
```

5. Configure frontend environment:

```powershell
Copy-Item .env.example .env
```

6. Start frontend:

```powershell
npm run dev
```

7. Start MongoDB (if not already running):

```powershell
mongod --dbpath .\mongodb-data --port 27017
```

## Quick Access

- Frontend: http://localhost:5173
- Backend API Docs: http://localhost:8000/docs

## GitHub and .env Safety

- Never commit real secrets (API keys, tokens, credentials) to GitHub.
- Keep secrets only in local `.env` files (already ignored via `.gitignore`).
- Commit only template files such as `backend/.env.example` and `frontend/.env.example`.
- After cloning the repo, create local env files:

Linux/macOS:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Windows PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

- If a secret is accidentally pushed, rotate/revoke it immediately and remove it from git history.
- For production deployment, use secure secret managers or CI/CD encrypted secrets instead of committed files.

## Detailed Working Guide

- Project internals and architecture diagram: [PROJECT_WORKING.md](PROJECT_WORKING.md)

## Key Endpoints

- POST /api/v1/interviews/sessions
- POST /api/v1/interviews/sessions/{session_id}/next-question
- POST /api/v1/interviews/sessions/{session_id}/answers
- POST /api/v1/interviews/sessions/{session_id}/complete
- POST /api/v1/speech/transcribe
- GET /api/v1/analytics/users/{user_id}/overview
- GET /api/v1/analytics/users/{user_id}/trends
- GET /api/v1/analytics/users/{user_id}/breakdown

## Notes

- Speech endpoint requires local Whisper runtime and FFmpeg availability.
- Topic catalogs are in backend/app/topics/catalog.
- Extend role catalogs to improve interview relevance.
- If OpenRouter returns `429 Too Many Requests`, the selected model is rate-limited. Retry later or set a different `PRIMARY_MODEL` / `FALLBACK_MODEL` in `backend/.env`.
