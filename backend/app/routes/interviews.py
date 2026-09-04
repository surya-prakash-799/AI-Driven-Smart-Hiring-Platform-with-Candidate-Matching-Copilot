from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.interview import InterviewAnswer, InterviewQuestion
from app.schemas.interview import (
    InterviewAnswerCreate,
    InterviewAnswerResponse,
    InterviewGenerateRequest,
    InterviewResponse,
)
from app.services import interview_generator, interview_service

router = APIRouter()


@router.post("/generate", response_model=InterviewResponse)
def generate_interview(payload: InterviewGenerateRequest, db: Session = Depends(get_db)):
    """Generate interview questions based on candidate and job position."""
    result = interview_generator.generate_interview_questions(
        db=db,
        candidate_id=payload.candidate_id,
        job_position_id=payload.job_position_id,
        interview_type=payload.interview_type,
        difficulty=payload.difficulty,
        number_of_questions=payload.number_of_questions,
    )

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Candidate or Job Position not found",
        )

    return InterviewResponse(
        id=result["interview_id"],
        job_position_id=payload.job_position_id,
        candidate_id=payload.candidate_id,
        interview_type=result["interview_type"],
        difficulty=result["difficulty"],
        status="questions_generated",
        candidate_name=result["candidate_name"],
        job_title=result["job_title"],
        questions=[
            {
                "id": q.id,
                "question": q.question,
                "category": q.category,
                "skill": q.skill,
                "difficulty": q.difficulty,
                "question_order": q.question_order,
            }
            for q in result["questions"]
        ],
    )


@router.get("/{interview_id}", response_model=InterviewResponse)
def get_interview(interview_id: int, db: Session = Depends(get_db)):
    """Get interview details with questions."""
    data = interview_service.get_interview_with_details(db, interview_id)
    if not data:
        raise HTTPException(status_code=404, detail="Interview not found")

    interview = data["interview"]
    return InterviewResponse(
        id=interview.id,
        job_position_id=interview.job_position_id,
        candidate_id=interview.candidate_id,
        interview_type=interview.interview_type,
        difficulty=interview.difficulty,
        status=interview.status,
        candidate_name=data["candidate_name"],
        job_title=data["job_title"],
        questions=[
            {
                "id": q.id,
                "question": q.question,
                "category": q.category,
                "skill": q.skill,
                "difficulty": q.difficulty,
                "question_order": q.question_order,
            }
            for q in interview.questions
        ],
        created_at=interview.created_at,
        updated_at=interview.updated_at,
    )


@router.post("/{interview_id}/answers", response_model=InterviewAnswerResponse)
def submit_answer(
    interview_id: int,
    payload: InterviewAnswerCreate,
    db: Session = Depends(get_db),
):
    """Submit an answer for an interview question and get evaluation."""
    # Verify interview exists
    interview = interview_service.get_interview_by_id(db, interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    # Determine which question to answer
    question = None
    if payload.question_id:
        # Answer specific question
        question = (
            db.query(InterviewQuestion)
            .filter(
                InterviewQuestion.id == payload.question_id,
                InterviewQuestion.interview_id == interview_id,
            )
            .first()
        )
    else:
        # Find the next unanswered question
        answered_question_ids = (
            db.query(InterviewQuestion.id)
            .join(InterviewAnswer, InterviewAnswer.question_id == InterviewQuestion.id)
            .filter(InterviewQuestion.interview_id == interview_id)
            .subquery()
        )

        question = (
            db.query(InterviewQuestion)
            .filter(
                InterviewQuestion.interview_id == interview_id,
                ~InterviewQuestion.id.in_(answered_question_ids)
            )
            .order_by(InterviewQuestion.question_order)
            .first()
        )

    if not question:
        # All questions answered, mark interview as completed
        interview_service.update_interview_status(db, interview_id, "completed")
        raise HTTPException(
            status_code=400,
            detail="All questions have been answered. Interview is complete."
        )

    # Evaluate the answer
    evaluation = interview_generator.evaluate_answer(db, question.id, payload.answer)

    if not evaluation:
        raise HTTPException(status_code=500, detail="Failed to evaluate answer")

    # Update interview status
    interview_service.update_interview_status(db, interview_id, "in_progress")

    return InterviewAnswerResponse(
        id=evaluation["answer_id"],
        question_id=evaluation["question_id"],
        answer=payload.answer,
        score=evaluation["score"],
        feedback=evaluation["feedback"],
    )


@router.get("/{interview_id}/questions")
def get_interview_questions(interview_id: int, db: Session = Depends(get_db)):
    """Get all questions for an interview."""
    interview = interview_service.get_interview_by_id(db, interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    return {
        "interview_id": interview_id,
        "questions": [
            {
                "id": q.id,
                "question": q.question,
                "category": q.category,
                "skill": q.skill,
                "difficulty": q.difficulty,
                "question_order": q.question_order,
                "has_answer": q.answer is not None,
            }
            for q in interview.questions
        ],
    }


@router.post("/{interview_id}/complete")
def complete_interview(interview_id: int, db: Session = Depends(get_db)):
    """Mark an interview as completed and return summary."""
    interview = interview_service.get_interview_by_id(db, interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    # Calculate total score
    total_score = 0.0
    answered_count = 0
    for question in interview.questions:
        if question.answer:
            total_score += question.answer.score or 0
            answered_count += 1

    avg_score = total_score / answered_count if answered_count > 0 else 0

    # Update status
    interview_service.update_interview_status(db, interview_id, "completed")

    return {
        "interview_id": interview_id,
        "status": "completed",
        "total_questions": len(interview.questions),
        "answered_questions": answered_count,
        "average_score": round(avg_score, 2),
        "total_score": round(total_score, 2),
    }
