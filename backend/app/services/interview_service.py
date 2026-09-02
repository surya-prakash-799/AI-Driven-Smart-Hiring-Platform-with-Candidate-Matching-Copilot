from typing import Optional

from loguru import logger
from sqlalchemy.orm import Session

from app.models.candidate import Candidate
from app.models.interview import Interview, InterviewAnswer, InterviewQuestion
from app.models.job_position import JobPosition


def create_interview(
    db: Session,
    candidate_id: int,
    job_position_id: int,
    interview_type: str,
    difficulty: str,
) -> Interview:
    """Create a new interview record."""
    interview = Interview(
        candidate_id=candidate_id,
        job_position_id=job_position_id,
        interview_type=interview_type,
        difficulty=difficulty,
        status="created",
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)
    logger.info(f"Created interview {interview.id} for candidate {candidate_id}")
    return interview


def get_interview_by_id(db: Session, interview_id: int) -> Optional[Interview]:
    """Get interview by ID with questions and answers."""
    return (
        db.query(Interview)
        .filter(Interview.id == interview_id)
        .first()
    )


def get_interview_with_details(db: Session, interview_id: int) -> Optional[dict]:
    """Get interview with candidate name and job title."""
    interview = get_interview_by_id(db, interview_id)
    if not interview:
        return None

    candidate = db.query(Candidate).filter(Candidate.id == interview.candidate_id).first()
    job = db.query(JobPosition).filter(JobPosition.id == interview.job_position_id).first()

    return {
        "interview": interview,
        "candidate_name": candidate.full_name if candidate else "Unknown",
        "job_title": job.title if job else "Unknown",
    }


def add_question(
    db: Session,
    interview_id: int,
    question_text: str,
    category: str,
    skill: Optional[str],
    difficulty: str,
    question_order: int,
) -> InterviewQuestion:
    """Add a question to an interview."""
    question = InterviewQuestion(
        interview_id=interview_id,
        question=question_text,
        category=category,
        skill=skill,
        difficulty=difficulty,
        question_order=question_order,
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


def add_answer(
    db: Session,
    question_id: int,
    answer_text: str,
    score: Optional[float] = None,
    feedback: Optional[str] = None,
) -> InterviewAnswer:
    """Add an answer to a question."""
    answer = InterviewAnswer(
        question_id=question_id,
        answer=answer_text,
        score=score,
        feedback=feedback,
    )
    db.add(answer)
    db.commit()
    db.refresh(answer)
    return answer


def update_interview_status(db: Session, interview_id: int, status: str) -> Optional[Interview]:
    """Update interview status."""
    interview = get_interview_by_id(db, interview_id)
    if interview:
        interview.status = status
        db.commit()
        db.refresh(interview)
    return interview


def update_answer_evaluation(
    db: Session, answer_id: int, score: float, feedback: str
) -> Optional[InterviewAnswer]:
    """Update answer with AI evaluation."""
    answer = db.query(InterviewAnswer).filter(InterviewAnswer.id == answer_id).first()
    if answer:
        answer.score = score
        answer.feedback = feedback
        db.commit()
        db.refresh(answer)
    return answer


def get_all_interviews(db: Session, skip: int = 0, limit: int = 50) -> list[Interview]:
    """Get all interviews."""
    return db.query(Interview).order_by(Interview.created_at.desc()).offset(skip).limit(limit).all()
