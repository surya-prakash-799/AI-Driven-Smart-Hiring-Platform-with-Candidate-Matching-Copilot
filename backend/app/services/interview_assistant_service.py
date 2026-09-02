"""Business logic for the AI Interview Assistant feature.

Reuses the existing `interviews`, `interview_questions` and `interview_answers`
tables (they already satisfy the required session/question/answer structure), so
no new tables or duplicated models are created.
"""
from typing import Optional

from loguru import logger
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.candidate import Candidate
from app.models.interview import Interview, InterviewAnswer, InterviewQuestion
from app.models.job_position import JobPosition
from app.services import ai_client
from app.services.interview_service import add_answer, get_interview_by_id, update_interview_status


def _stringify(items) -> list[str]:
    """Flatten JSON-ish profile fields into readable strings."""
    if not items:
        return []
    if isinstance(items, str):
        return [items]
    out = []
    for item in items:
        if isinstance(item, str):
            out.append(item)
        elif isinstance(item, dict):
            parts = []
            # Preserve natural reading order of common experience/education keys
            for key in ("role", "company", "degree", "institution", "duration", "year", "title"):
                if item.get(key):
                    parts.append(str(item[key]))
            if not parts:
                parts = [str(item)]
            out.append(" - ".join(parts))
        else:
            out.append(str(item))
    return out


def _job_not_found(job_id: int) -> bool:
    return job_id is None


def get_job(db: Session, job_id: int) -> Optional[JobPosition]:
    return db.query(JobPosition).filter(JobPosition.id == job_id).first()


def get_candidate(db: Session, candidate_id: int) -> Optional[Candidate]:
    return db.query(Candidate).filter(Candidate.id == candidate_id).first()


def generate_for_job(
    db: Session,
    job_position_id: int,
    interview_type: str,
    count: int = 5,
) -> dict:

    """Generate AI questions for a job position only (Question Generator)."""
    job = get_job(db, job_position_id)
    if not job:
        logger.error(f"Job position {job_position_id} not found")
        raise ValueError(f"Job position ID {job_position_id} not found")

    questions = ai_client.generate_questions_for_job(
        job_title=job.title,
        job_description=job.description or "",
        required_skills=job.required_skills if isinstance(job.required_skills, list) else [],
        preferred_skills=job.preferred_skills if isinstance(job.preferred_skills, list) else [],
        interview_type=interview_type,
        count=count,
    )
    if not questions:
        raise ValueError("The AI service returned no questions. Please try again.")

    return {
        "job_position_id": job.id,
        "job_title": job.title,
        "interview_type": interview_type,
        "questions": questions,
        "total": len(questions),
    }


def start_simulation(
    db: Session,
    job_position_id: int,
    interview_type: str,
    candidate_id: int,
    count: int = 5,
) -> dict:
    """Start a personalized interview simulation for a candidate and return the first question."""
    job = get_job(db, job_position_id)
    if not job:
        logger.error(f"Job position {job_position_id} not found")
        raise ValueError(f"Job position ID {job_position_id} not found")

    candidate = get_candidate(db, candidate_id)
    if not candidate:
        logger.error(f"Candidate {candidate_id} not found")
        raise ValueError(f"Candidate ID {candidate_id} not found")

    questions = ai_client.generate_simulation_questions(
        job_title=job.title,
        job_description=job.description or "",
        required_skills=job.required_skills if isinstance(job.required_skills, list) else [],
        preferred_skills=job.preferred_skills if isinstance(job.preferred_skills, list) else [],
        interview_type=interview_type,
        candidate_name=candidate.full_name or "",
        candidate_skills=_stringify(candidate.skills),
        candidate_education=_stringify(candidate.education),
        candidate_experience=_stringify(candidate.experience),
        candidate_projects=_stringify(candidate.projects),
        candidate_certifications=_stringify(candidate.certifications),
        count=count,
    )
    if not questions:
        raise ValueError("The AI service returned no questions. Please try again.")

    # Create an interview session record (reuses the existing interviews table).
    interview = Interview(
        candidate_id=candidate.id,
        job_position_id=job.id,
        interview_type=interview_type,
        difficulty="Medium",
        status="created",
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)

    saved_questions = []
    for i, q_text in enumerate(questions, 1):
        q = InterviewQuestion(
            interview_id=interview.id,
            question=q_text,
            category=_category_for_type(interview_type),
            skill=None,
            difficulty="Medium",
            question_order=i,
        )
        db.add(q)
        saved_questions.append(q)

    interview.status = "questions_generated"
    db.commit()
    for q in saved_questions:
        db.refresh(q)

    first = saved_questions[0]
    return _simulation_payload(
        interview=interview,
        job=job,
        candidate=candidate,
        question=first,
        total=len(saved_questions),
        answered=0,
        remaining=len(saved_questions),
        is_last=False,
    )


def _category_for_type(interview_type: str) -> str:
    lowered = interview_type.lower()
    if "technical" in lowered:
        return "Technical"
    if "behavioral" in lowered or "hr" in lowered:
        return "Behavioral"
    return "Mixed"


def submit_simulation_answer(
    db: Session,
    session_id: int,
    answer: str,
) -> dict:
    """Record an answer, evaluate it with AI, and return the next question (or completion)."""
    interview = get_interview_by_id(db, session_id)
    if not interview:
        logger.error(f"Interview session {session_id} not found")
        raise ValueError(f"Interview session {session_id} not found")

    job = get_job(db, interview.job_position_id)
    candidate = get_candidate(db, interview.candidate_id)

    # Find the next unanswered question.
    answered_question_ids = select(InterviewAnswer.question_id).join(
        InterviewQuestion, InterviewQuestion.id == InterviewAnswer.question_id
    ).where(InterviewQuestion.interview_id == interview.id)
    current_question = (
        db.query(InterviewQuestion)
        .filter(
            InterviewQuestion.interview_id == interview.id,
            ~InterviewQuestion.id.in_(answered_question_ids),
        )
        .order_by(InterviewQuestion.question_order)
        .first()
    )

    if not current_question:
        # All questions answered -> complete.
        update_interview_status(db, interview.id, "completed")
        total_score = 0.0
        answered_count = 0
        for q in interview.questions:
            if q.answer:
                total_score += q.answer.score or 0
                answered_count += 1
        avg = total_score / answered_count if answered_count else 0
        return {
            "session_id": interview.id,
            "status": "completed",
            "message": "Interview completed",
            "answered_questions": answered_count,
            "remaining_questions": 0,
            "next_question": None,
            "average_score": round(avg, 2),
            "total_score": round(total_score, 2),
        }

    # Evaluate the answer with AI.
    job_title = job.title if job else "the position"
    candidate_name = candidate.full_name if candidate else "the candidate"
    try:
        evaluation = ai_client.evaluate_answer_ai(
            question=current_question.question,
            candidate_name=candidate_name,
            job_title=job_title,
            answer=answer,
            interview_type=interview.interview_type,
        )
        score = evaluation["score"]
        feedback = evaluation["feedback"]
    except ai_client.AIError:
        # Fall back to the existing rule-based evaluator if the AI call fails,
        # so the conversation can continue gracefully.
        from app.services.interview_generator import evaluate_answer

        fb = evaluate_answer(db, current_question.id, answer)
        score = fb["score"]
        feedback = fb["feedback"]

    answer_record = add_answer(
        db, current_question.id, answer, score=score, feedback=feedback
    )
    update_interview_status(db, interview.id, "in_progress")

    # Determine the next question.
    next_question = (
        db.query(InterviewQuestion)
        .filter(
            InterviewQuestion.interview_id == interview.id,
            ~InterviewQuestion.id.in_(
                select(InterviewAnswer.question_id)
                .join(InterviewQuestion, InterviewQuestion.id == InterviewAnswer.question_id)
                .where(InterviewQuestion.interview_id == interview.id)
            ),
        )
        .order_by(InterviewQuestion.question_order)
        .first()
    )

    answered_count = (
        db.query(InterviewAnswer)
        .join(InterviewQuestion, InterviewQuestion.id == InterviewAnswer.question_id)
        .filter(InterviewQuestion.interview_id == interview.id)
        .count()
    )

    if not next_question:
        update_interview_status(db, interview.id, "completed")
        total_score = 0.0
        for q in interview.questions:
            if q.answer:
                total_score += q.answer.score or 0
        avg = total_score / answered_count if answered_count else 0
        return {
            "session_id": interview.id,
            "status": "completed",
            "message": "Interview completed",
            "answered_questions": answered_count,
            "remaining_questions": 0,
            "next_question": None,
            "average_score": round(avg, 2),
            "total_score": round(total_score, 2),
            "last_feedback": feedback,
        }

    remaining = interview.questions.__len__() - answered_count
    return {
        "session_id": interview.id,
        "status": "in_progress",
        "job_title": job.title if job else "Unknown",
        "candidate_name": candidate.full_name if candidate else "Unknown",
        "interview_type": interview.interview_type,
        "question_number": next_question.question_order,
        "total_questions": len(interview.questions),
        "answered_questions": answered_count,
        "remaining_questions": remaining,
        "is_last": (remaining == 1),
        "next_question": {
            "id": next_question.id,
            "question": next_question.question,
            "category": next_question.category,
            "question_number": next_question.question_order,
        },
        "last_feedback": feedback,
    }


def _simulation_payload(
    interview: Interview,
    job: Optional[JobPosition],
    candidate: Optional[Candidate],
    question: InterviewQuestion,
    total: int,
    answered: int,
    remaining: int,
    is_last: bool,
    last_answer: Optional[dict] = None,
) -> dict:
    return {
        "session_id": interview.id,
        "status": interview.status,
        "job_position_id": interview.job_position_id,
        "job_title": job.title if job else "Unknown",
        "candidate_id": interview.candidate_id,
        "candidate_name": candidate.full_name if candidate else "Unknown",
        "interview_type": interview.interview_type,
        "question_number": question.question_order,
        "total_questions": total,
        "answered_questions": answered,
        "remaining_questions": remaining,
        "is_last": is_last,
        "question": {
            "id": question.id,
            "question": question.question,
            "category": question.category,
            "question_number": question.question_order,
        },
        "last_answer": last_answer,
    }
