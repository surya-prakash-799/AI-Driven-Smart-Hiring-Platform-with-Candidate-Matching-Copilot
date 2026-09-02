"""AI Interview Assistant routes.

Provides the Question Generator and personalized Interview Simulation used by the
Interview Assistant page. These reuse the existing interview models/tables.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.routes.deps import get_current_user
from app.schemas.interview import (
    QuestionGeneratorRequest,
    QuestionGeneratorResponse,
    SimulationAnswerRequest,
    SimulationAnswerResponse,
    SimulationStartRequest,
    SimulationStartResponse,
)
from app.services import interview_assistant_service
from app.services.ai_client import AIError

router = APIRouter(
    prefix="/interview",
    tags=["Interview Assistant"],
    dependencies=[Depends(get_current_user)],
)


def _error(status_code: int, message: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail=message)


@router.post("/generate", response_model=QuestionGeneratorResponse)
def generate_questions(
    payload: QuestionGeneratorRequest,
    db: Session = Depends(get_db),
):
    """Generate interview questions for a job position + interview type (no candidate)."""
    if not payload.job_position_id:
        raise _error(400, "Please select a job position.")
    if not payload.interview_type.strip():
        raise _error(400, "Please select an interview type.")

    try:
        result = interview_assistant_service.generate_for_job(
            db,
            job_position_id=payload.job_position_id,
            interview_type=payload.interview_type.strip(),
        )
    except ValueError as e:
        raise _error(404, str(e))
    except AIError as e:
        raise _error(e.status_code, str(e))

    return QuestionGeneratorResponse(
        status="success",
        job_position_id=result["job_position_id"],
        job_title=result["job_title"],
        interview_type=result["interview_type"],
        total=result["total"],
        questions=[{"question": q} for q in result["questions"]],
    )


@router.post("/simulation/start", response_model=SimulationStartResponse)
def start_simulation(
    payload: SimulationStartRequest,
    db: Session = Depends(get_db),
):
    """Start a personalized interview simulation for a candidate."""
    if not payload.job_position_id:
        raise _error(400, "Please select a job position.")
    if not payload.interview_type.strip():
        raise _error(400, "Please select an interview type.")
    if not payload.candidate_id:
        raise _error(400, "Please select a candidate.")

    try:
        result = interview_assistant_service.start_simulation(
            db,
            job_position_id=payload.job_position_id,
            interview_type=payload.interview_type.strip(),
            candidate_id=payload.candidate_id,
        )
    except ValueError as e:
        raise _error(404, str(e))
    except AIError as e:
        raise _error(e.status_code, str(e))

    return SimulationStartResponse(
        session_id=result["session_id"],
        status=result["status"],
        job_position_id=result["job_position_id"],
        job_title=result["job_title"],
        candidate_id=result["candidate_id"],
        candidate_name=result["candidate_name"],
        interview_type=result["interview_type"],
        question_number=result["question_number"],
        total_questions=result["total_questions"],
        answered_questions=result["answered_questions"],
        remaining_questions=result["remaining_questions"],
        is_last=result["is_last"],
        question=result["question"],
    )


@router.post("/simulation/answer", response_model=SimulationAnswerResponse)
def submit_simulation_answer(
    payload: SimulationAnswerRequest,
    db: Session = Depends(get_db),
):
    """Submit a simulation answer, evaluate it, and return the next question."""
    if not payload.session_id:
        raise _error(400, "No active interview session.")
    if not payload.answer.strip():
        raise _error(400, "Answer cannot be empty.")

    try:
        result = interview_assistant_service.submit_simulation_answer(
            db,
            session_id=payload.session_id,
            answer=payload.answer.strip(),
        )
    except ValueError as e:
        raise _error(404, str(e))
    except AIError as e:
        raise _error(e.status_code, str(e))

    return SimulationAnswerResponse(**result)
