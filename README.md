# AI-Driven-Smart-Hiring-Platform-with-Candidate-Matching-Copilot
# AI-Driven Smart Hiring Platform - Frontend

A React-based single-page application for AI-powered recruitment, candidate matching, and interview assistance.

## Tech Stack

| Layer            | Technology       |
| ---------------- | ---------------- |
| UI Framework     | React 18         |
| Language         | TypeScript 5     |
| Bundler          | Vite 5           |
| CSS              | Tailwind CSS 3   |
| Routing          | React Router 6   |
| HTTP Client      | Axios            |
| Animations       | Framer Motion    |
| Icons            | Lucide React     |
| Charts           | Recharts         |

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Backend server running at `http://127.0.0.1:8000`

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Starts the dev server at `http://localhost:5173`. All `/api` requests are proxied to the backend at `http://127.0.0.1:8000`.

### Build

```bash
npm run build
```

Type-checks and produces a production build in `dist/`.

### Preview

```bash
npm run preview
```

Serves the production build at `http://localhost:4173`.

### Lint

```bash
npm run lint
```

## Project Structure

```
src/
├── main.tsx                    # App entry point
├── App.tsx                     # Route definitions (lazy-loaded)
├── index.css                   # Global styles (Tailwind)
│
├── pages/                      # Route-level components
│   ├── Dashboard.tsx           # Main dashboard with stats & analytics
│   ├── Candidates.tsx          # Candidate list & management
│   ├── ResumeUpload.tsx        # Resume upload & AI extraction
│   ├── JobPositions.tsx        # Job position CRUD & AI matching
│   ├── InterviewAssistance.tsx # AI interview questions & simulation
│   └── Login.tsx               # Login/Signup page
│
├── components/
│   ├── layout/                 # App shell (Sidebar, Header, AppLayout)
│   ├── ui/                     # Reusable primitives (Button, Card, Modal, etc.)
│   └── ...                     # Domain-specific components
│
├── context/                    # React Context providers
│   ├── AuthContext.tsx          # Authentication state
│   ├── CandidatesContext.tsx   # Candidate data & CRUD
│   ├── ThemeContext.tsx         # Light/dark mode
│   └── ToastContext.tsx        # Toast notifications
│
├── services/
│   └── api.ts                  # Axios client & all API functions
│
├── types/
│   ├── api.ts                  # Backend API types
│   └── candidate.ts            # Frontend candidate types
│
├── hooks/
│   └── useDebounce.ts          # Debounce hook
│
└── utils/
    ├── cn.ts                   # Tailwind class merger
    ├── format.ts               # Formatters (date, file size, etc.)
    ├── validation.ts           # File upload validation
    └── candidateMapping.ts     # Backend ↔ Frontend data mapping
```

## Features

- **Resume Upload & Parsing** — Upload PDF/DOCX files with AI-powered extraction of skills, education, and experience.
- **Candidate Management** — Paginated list with search, filter, view, edit, and delete.
- **Job Position Management** — Full CRUD with required/preferred skills and experience requirements.
- **AI Candidate Matching** — Skill gap analysis and ranked matching between candidates and positions.
- **Interview Assistance** — AI-generated interview questions by type (Technical, HR, Behavioral) with simulation mode.
- **Voice Screening** — Voice-based candidate evaluation from the dashboard.
- **Dashboard Analytics** — Recruitment pipeline, top matches, interview status, and activity feed.
- **Dark Mode** — Class-based theme toggle with localStorage persistence.
- **Toast Notifications** — Success, error, info, and warning toasts with auto-dismiss.

## Routes

| Path                    | Page                    | Description                              |
| ----------------------- | ----------------------- | ---------------------------------------- |
| `/` or `/dashboard`     | Dashboard               | Main overview with stats and analytics   |
| `/job-positions`        | Job Positions           | Job CRUD and AI matching                 |
| `/candidates`           | Candidates              | Candidate list and management            |
| `/upload`               | Resume Upload           | Upload resumes for AI extraction         |
| `/interview-assistance` | Interview Assistance    | AI questions and interview simulation    |

## Environment Variables

| Variable              | Default  | Description                  |
| --------------------- | -------- | ---------------------------- |
| `VITE_API_BASE_URL`   | `/api`   | Backend API base URL         |

## Backend

This frontend expects a backend API server running at `http://127.0.0.1:8000`. The Vite dev server proxies all `/api` requests to the backend. See the backend project for API documentation.



# AI Recruitment Copilot — Backend

FastAPI backend for the AI Recruitment Copilot application. Handles resume upload
(PDF/DOCX), automatic parsing and information extraction, candidate management,
search, and dashboard analytics.

## Tech Stack

- Python 3.12+
- FastAPI
- SQLAlchemy 2.0 + PostgreSQL (SQLite fallback for local dev)
- Alembic (migrations, optional)
- Pydantic v2
- spaCy / Regex (information extraction)
- pdfplumber / PyMuPDF (PDF parsing)
- python-docx (DOCX parsing)
- Loguru (logging)

## Quick Start

### 1. Navigate to the backend

```bash
cd backend
```

### 2. Create and activate a virtual environment

```bash
python -m venv venv
source venv/bin/activate   # Linux/macOS
venv\Scripts\activate      # Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Download the spaCy model

```bash
python -m spacy download en_core_web_sm
```

### 5. Configure environment

```bash
copy .env.example .env    # Windows
cp .env.example .env      # Linux/macOS
```

Edit `.env` with your PostgreSQL credentials.

### 6. Set up PostgreSQL

Install and start PostgreSQL, then create the database:

```sql
CREATE DATABASE recruitment_db;
```

Tables are created automatically on startup (`Base.metadata.create_all`),
so no manual migration step is required. If PostgreSQL is unreachable at
startup, the server still starts in degraded mode and `/health` reports the
database status instead of crashing.

### 7. Run the server

```bash
python run.py
```

or directly:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

On startup you should see:

```
✓ Database Connected
✓ Models Loaded
✓ Routes Registered
✓ FastAPI Started
✓ Server Ready
```

### 8. Open Swagger UI

Navigate to `http://localhost:8000/docs` in your browser.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload and parse a resume (PDF/DOCX) |
| GET | `/api/candidates` | List all candidates (paginated, searchable) |
| GET | `/api/candidates/{id}` | Get candidate details |
| PUT | `/api/candidates/{id}` | Update candidate |
| DELETE | `/api/candidates/{id}` | Delete candidate (also removes stored files) |
| GET | `/api/search` | Search candidates by name, email, skill, etc. |
| GET | `/api/dashboard` | Get dashboard statistics |
| GET | `/health` | Health check (reports database status) |
| GET | `/docs` | Swagger UI |

## Uploading a Resume

```bash
curl -F "file=@path/to/resume.pdf" http://localhost:8000/api/upload
```

Validations applied on upload:
- File extension must be `.pdf` or `.docx`
- Content type must be PDF or DOCX
- Magic-byte signature must match the declared extension
- File size must not exceed `MAX_FILE_SIZE` (default 10 MB)
- At least some text must be extractable (scanned images are rejected)

Uploaded files are stored in `app/uploads/` and extracted JSON in
`app/extracted_data/`.

## Database Setup (Migrations — Optional)

Alembic is configured (`alembic.ini` + `alembic/env.py`) but migrations are
optional because tables are auto-created at startup.

```bash
# Generate a migration after model changes
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## Project Structure

```
backend/
├── app/
│   ├── main.py                # FastAPI application entry
│   ├── core/
│   │   ├── config.py          # Pydantic settings (.env)
│   │   ├── database.py        # SQLAlchemy engine, session, init/health checks
│   │   └── logging.py         # Loguru configuration
│   ├── models/
│   │   └── candidate.py       # SQLAlchemy ORM model
│   ├── schemas/
│   │   └── candidate.py       # Pydantic request/response schemas
│   ├── routes/
│   │   ├── upload.py          # Resume upload endpoint
│   │   ├── candidates.py      # Candidate CRUD endpoints
│   │   └── dashboard.py       # Dashboard & search endpoints
│   ├── services/
│   │   ├── parser.py          # Resume file parsing (PDF, DOCX)
│   │   ├── extractor.py       # Information extraction (NER, regex)
│   │   └── candidate_service.py  # Business logic & repository
│   ├── utils/
│   │   ├── file_helper.py     # File operations & validation
│   │   └── regex_helper.py    # Regex patterns & skill matching
│   ├── uploads/               # Uploaded resume files
│   └── extracted_data/        # Extracted JSON data
├── alembic/                   # Database migrations (optional)
├── alembic.ini                # Alembic configuration
├── requirements.txt           # Python dependencies
├── .env.example               # Environment template
├── run.py                     # Application entry point
└── README.md                  # This file
```

## Postman Collection

Import `postman_collection.json` into Postman to test all endpoints.

## License

MIT
