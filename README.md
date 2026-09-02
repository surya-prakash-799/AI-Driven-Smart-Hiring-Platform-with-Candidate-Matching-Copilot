# AI-Driven-Smart-Hiring-Platform-with-Candidate-Matching-Copilot
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
