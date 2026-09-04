from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
from sqlalchemy.exc import OperationalError

from app.core.config import get_settings
from app.core.database import SessionLocal, check_db_connection, dispose_engine, init_db
from app.core.logging import setup_logging
from app.models import Candidate, Interview, InterviewAnswer, InterviewQuestion, JobPosition, ShortlistedCandidate, VoiceScreening  # noqa: F401  (registers models on Base.metadata)
from app.routes import candidates, dashboard, interview_assistant, interviews, job_positions, upload, voice_screening

from app.schemas.candidate import HealthResponse
from app.utils.file_helper import ensure_directories

settings = get_settings()
setup_logging(settings)


def seed_default_job_positions() -> None:
    """Create initial job positions if none exist so recruiter can immediately test matching."""
    try:
        db = SessionLocal()
        try:
            count = db.query(JobPosition).count()
            if count == 0:
                defaults = [
                    JobPosition(
                        title="Machine Learning Engineer",
                        description="Design and deploy scalable machine learning models and NLP pipelines.",
                        required_skills=["Python", "Machine Learning", "TensorFlow", "NLP"],
                        preferred_skills=["PyTorch", "MLOps", "Docker", "AWS"],
                        minimum_experience=3,
                        education="Bachelor's Degree in Computer Science or AI",
                    ),
                    JobPosition(
                        title="Software Engineer",
                        description="Build robust backend APIs and distributed microservices.",
                        required_skills=["Python", "SQL", "FastAPI", "REST API"],
                        preferred_skills=["Docker", "PostgreSQL", "React", "CI/CD"],
                        minimum_experience=2,
                        education="Bachelor's Degree",
                    ),
                    JobPosition(
                        title="Python Developer",
                        description="Develop Python-based web platforms and database integrations.",
                        required_skills=["Python", "FastAPI", "SQL", "Django"],
                        preferred_skills=["PostgreSQL", "Redis", "Celery", "Git"],
                        minimum_experience=2,
                        education="Bachelor's Degree",
                    ),
                    JobPosition(
                        title="Frontend Developer",
                        description="Craft responsive and interactive web interfaces using React and modern CSS.",
                        required_skills=["JavaScript", "TypeScript", "React", "HTML/CSS"],
                        preferred_skills=["Tailwind CSS", "Vite", "Next.js", "Redux"],
                        minimum_experience=2,
                        education="Bachelor's Degree",
                    ),
                    JobPosition(
                        title="Data Analyst",
                        description="Perform quantitative data analysis, data visualization, and SQL reporting.",
                        required_skills=["Python", "SQL", "Data Analysis", "Pandas"],
                        preferred_skills=["Tableau", "Power BI", "Excel", "Statistics"],
                        minimum_experience=1,
                        education="Bachelor's Degree",
                    ),
                ]
                db.add_all(defaults)
                db.commit()
                logger.info(f"Seeded {len(defaults)} default job positions.")
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"Could not seed default job positions: {e}")


def validate_gemini_config() -> None:
    """Log whether the Gemini API key is available without ever printing its value."""
    msg = (
        f"Gemini configuration: model={settings.GEMINI_MODEL}, "
        f"timeout={settings.AI_TIMEOUT_SECONDS}s, "
        f"api_key={'available' if settings.GEMINI_API_KEY else 'MISSING'}"
    )
    if settings.GEMINI_API_KEY:
        logger.info(f"✓ {msg}")
    else:
        logger.warning(
            f"{msg}. Interview question generation requires a valid "
            "GEMINI_API_KEY. Set it in backend/.env and restart the server. "
            "Until then, /api/interview/* returns a clear 503."
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_directories()

    db_ok, db_message = init_db()
    if db_ok:
        logger.info("✓ Database Connected")
        seed_default_job_positions()
    else:
        logger.error(

            f"✗ Database connection failed: {db_message}. "
            "The server will continue running in degraded mode; /health reports DB status."
        )

    validate_gemini_config()

    logger.info("✓ Models Loaded")
    logger.info("✓ Routes Registered")
    logger.info("✓ FastAPI Started")
    logger.info("✓ Server Ready")

    yield

    logger.info("Shutting down AI Recruitment Copilot Backend...")
    dispose_engine()


app = FastAPI(
    title="FastAPI",
    description=(
        "Production-ready REST API for the AI Recruitment Copilot application. "
        "Supports resume upload (PDF/DOCX), automatic parsing and information extraction, "
        "candidate management with CRUD operations, search, and dashboard analytics."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {"name": "Upload", "description": "Resume upload and parsing operations"},
        {"name": "Candidates", "description": "Candidate CRUD operations"},
        {"name": "Dashboard", "description": "Dashboard statistics and analytics"},
        {"name": "Search", "description": "Candidate search operations"},
        {"name": "Health", "description": "Health and connectivity checks"},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(candidates.router, prefix="/api", tags=["Candidates"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard", "Search"])
app.include_router(job_positions.router, prefix="/api", tags=["Job Positions"])
app.include_router(interviews.router, prefix="/api/interviews", tags=["Interviews"])
app.include_router(interview_assistant.router, prefix="/api", tags=["Interview Assistant"])
app.include_router(voice_screening.router, prefix="/api", tags=["Voice Screening"])




@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "status": "error",
            "detail": "Request validation failed",
            "errors": exc.errors(),
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"status": "error", "detail": exc.detail},
    )


@app.exception_handler(OperationalError)
async def db_operational_error_handler(request: Request, exc: OperationalError):
    logger.error(f"Database unavailable on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=503,
        content={
            "status": "error",
            "detail": "Database is currently unavailable. Please try again later.",
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception on {request.method} {request.url.path}")
    return JSONResponse(
        status_code=500,
        content={"status": "error", "detail": "Internal server error"},
    )


@app.get("/", tags=["Health"])
def root():
    return {
        "message": "AI Recruitment Copilot API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health_check():
    db_ok, db_message = check_db_connection()
    return HealthResponse(
        status="healthy" if db_ok else "degraded",
        database="connected" if db_ok else "unavailable",
        message=db_message if not db_ok else "All systems operational",
        timestamp=datetime.now(timezone.utc),
    )
