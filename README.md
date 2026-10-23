# DealRadar Intelligence OS

A sales conversation intelligence platform that transforms raw call transcripts into explainable, evidence-backed deal intelligence. It automatically extracts objections, buying signals, commitments, and risk factors — then routes each deal to the right action.

> **All sample data is synthetic and clearly labelled. No real customer data is included.**

---

## What It Does

- **Imports** CSV or JSON conversation transcripts
- **Extracts** evidence: objections, buying signals, commitments, deadlines, pricing concerns, technical blockers, next steps
- **Scores** each deal with an explainable 0–100 risk score
- **Routes** deals to: Rep Follow-up, Manager Escalation, Pricing/Deal Desk, Technical Help, or No Action
- **Tracks** commitments with status (pending / overdue / completed)
- **Preserves** manual route overrides across reimports
- **Logs** every meaningful change in a persistent audit trail
- **Exports** a full ZIP bundle with CSV files and a manifest

---

## Architecture

```
DealRadar/
├── frontend/          React + Vite + TypeScript + Tailwind CSS + Recharts
├── backend/           Python 3.9 + FastAPI + SQLAlchemy + SQLite/PostgreSQL
├── sample_data/       Synthetic conversations (JSON + CSV)
└── docs/              Architecture and deployment notes
```

**Frontend → Backend** communication via REST API (proxied through Vite dev server in development).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, TypeScript 6, Tailwind CSS 4, Framer Motion, Recharts |
| Backend | Python 3.9, FastAPI, SQLAlchemy 2, Pydantic v2 |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Evidence | Rule-based extraction (no external API required) |

---

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.9+
- Git (optional, for cloning)

---

## Local Setup

### 1 — Clone / open the project

```
cd DealRadar
```

### 2 — Backend setup

Run these commands from the **`backend/`** directory:

```bash
# Create and activate a virtual environment (recommended)
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment config
cp ../.env.example .env
```

The default `.env` uses SQLite — no database setup needed for local development.

### 3 — Frontend setup

Run these commands from the **`frontend/`** directory:

```bash
npm install
```

---

## Running Locally

### Start the backend

From the **`backend/`** directory:

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`  
Interactive API docs: `http://localhost:8000/api/docs`

### Start the frontend

From the **`frontend/`** directory:

```bash
npm run dev
```

The app will open at `http://localhost:5173`

The Vite dev server proxies all `/api` requests to `http://localhost:8000`, so no CORS issues during development.

---

## Import Synthetic Sample Data

The sample dataset contains 7 synthetic conversations covering all deal scenarios.

**Option A — via the UI:**
1. Open `http://localhost:5173`
2. Click **Import** in the top bar or navigate to **Import Center**
3. Upload `sample_data/synthetic_conversations.json`

**Option B — via curl:**

```bash
curl -X POST http://localhost:8000/api/imports \
  -F "file=@sample_data/synthetic_conversations.json"
```

**Option C — via Python (Windows):**

```python
import requests
with open("sample_data/synthetic_conversations.json", "rb") as f:
    r = requests.post("http://localhost:8000/api/imports", files={"file": f})
print(r.json())
```

Reimporting the same file is safe — duplicate records are detected by content hash and skipped.

---

## Environment Variables

All variables are documented in `.env.example`. Key ones:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./dealradar.db` | Database connection string |
| `ALLOWED_ORIGINS` | `http://localhost:5173,...` | Allowed CORS origins |
| `DEBUG` | `false` | Enable debug logging |
| `MAX_UPLOAD_SIZE_MB` | `50` | Max import file size |
| `RISK_LOW_MAX` | `30` | Score threshold for Low risk |
| `RISK_MEDIUM_MAX` | `60` | Score threshold for Medium risk |
| `RISK_HIGH_MAX` | `85` | Score threshold for High risk |

For the **frontend**, create `frontend/.env.local`:

```
VITE_API_URL=https://your-backend.onrender.com/api
```

Only needed in production — in development the Vite proxy handles routing.

---

## Database

### SQLite (development)
No setup needed. The file `backend/dealradar.db` is created automatically on first startup.

### PostgreSQL (production)
1. Create a database: `CREATE DATABASE dealradar;`
2. Set `DATABASE_URL=postgresql://user:pass@host:5432/dealradar` in `.env`
3. Tables are created automatically on startup via `Base.metadata.create_all()`

---

## Testing

### Backend tests

From the **`backend/`** directory:

```bash
pytest tests/ -v
```

### Frontend tests

From the **`frontend/`** directory:

```bash
npm test
```

### Production build verification

From the **`frontend/`** directory:

```bash
npm run build
```

A successful build outputs files to `frontend/dist/`.

---

## Production Build

```bash
# Frontend
cd frontend
npm run build
# Output: frontend/dist/

# Backend — just run with production settings
cd backend
DATABASE_URL=postgresql://... ALLOWED_ORIGINS=https://yourapp.com \
  python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## Deployment

### Recommended stack

| Service | Purpose |
|---------|---------|
| Vercel | Frontend (React/Vite static build) |
| Render | Backend (FastAPI Python service) |
| Render PostgreSQL | Production database |

### Frontend → Vercel

1. Push the repo to GitHub
2. Import to Vercel — set **Root Directory** to `frontend`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variable: `VITE_API_URL=https://your-backend.onrender.com/api`

### Backend → Render

1. Create a new **Web Service** — set **Root Directory** to `backend`
2. Runtime: **Python 3**
3. Build command: `pip install -r requirements.txt`
4. Start command: `python -m uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables:
   - `DATABASE_URL` → your Render PostgreSQL internal URL
   - `ALLOWED_ORIGINS` → your Vercel frontend URL
   - `DEBUG` → `false`

### Database → Render PostgreSQL

1. Create a **PostgreSQL** instance on Render
2. Copy the **Internal Database URL** to the backend service's `DATABASE_URL`
3. Tables are created automatically on first startup

### Health check

Configure Render health check path: `/api/health`

---

## API Documentation

Interactive Swagger UI: `http://localhost:8000/api/docs`  
ReDoc: `http://localhost:8000/api/redoc`

Key endpoints:

```
GET  /api/health
GET  /api/dashboard/summary
GET  /api/conversations
GET  /api/conversations/{id}
GET  /api/evidence
GET  /api/commitments
PATCH /api/commitments/{id}
GET  /api/deals/{id}/risk
GET  /api/deals/{id}/routing
POST /api/deals/{id}/route-override
POST /api/imports
GET  /api/imports
GET  /api/audit
POST /api/exports
GET  /api/search
```

---

## Synthetic Sample Scenarios

| ID | Deal | Scenario |
|----|------|----------|
| CONV-001 | Acme Corp | Strong buying signal, CFO approval needed, Q1 deadline |
| CONV-002 | Globex Solutions | Pricing objection, competitor evaluation, budget deadline |
| CONV-003 | Initech Industries | Technical blocker (SSO/SAML), HIPAA compliance required |
| CONV-004 | Umbrella Corp | Overdue follow-up, weak ROI conviction, low priority |
| CONV-005 | Vandelay Industries | Approved budget, strong buying signals, contract ready |
| CONV-006 | Cyberdyne Systems | Critical security blockers, expired SOC2, board approval needed |
| CONV-007 | Hooli Inc | Clean close, starter package, low risk |

---

## Limitations

- **No authentication** — v1.0 has no user login. Do not expose to the public internet with private customer data.
- **Rule-based extraction** — Evidence is extracted using regex patterns, not an LLM. Some nuanced signals may be missed.
- **SQLite is ephemeral on some hosts** — Use PostgreSQL for any persistent production deployment.
- **Single-tenant** — No multi-workspace or role-based access control.

---

## Future Enhancements

- LLM-powered evidence extraction (optional provider interface is designed into the architecture)
- User authentication and role-based access
- Real-time notifications via WebSockets
- Salesforce / HubSpot CRM integration
- Scheduled commitment reminders
- Custom risk weight configuration via UI
