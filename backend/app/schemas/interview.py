from typing import Optional

from pydantic import BaseModel, Field
from datetime import datetime


class InterviewGenerateRequest(BaseModel):
    candidate_id: int
    job_position_id: int
    interview_type: str = Field(default="Technical + Behavioral", max_length=100)
    difficulty: str = Field(default="Medium", max_length=50)
    number_of_questions: int = Field(default=10, ge=1, le=50)


class InterviewQuestionResponse(BaseModel):
    id: int
    question: str
    category: str
    skill: Optional[str] = None
    difficulty: str
    question_order: int

    model_config = {"from_attributes": True}


class InterviewAnswerCreate(BaseModel):
    answer: str = Field(..., min_length=1)
    question_id: Optional[int] = None


class InterviewAnswerResponse(BaseModel):
    id: int
    question_id: int
    answer: str
    score: Optional[float] = None
    feedback: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class InterviewResponse(BaseModel):
    id: int
    job_position_id: int
    candidate_id: int
    interview_type: str
    difficulty: str
    status: str
    candidate_name: Optional[str] = None
    job_title: Optional[str] = None
    questions: list[InterviewQuestionResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class InterviewAnswerEvaluation(BaseModel):
    answer_id: int
    question_id: int
    score: float
    feedback: str


# --- AI Interview Assistant schemas (Question Generator + Simulation) ---

class QuestionGeneratorRequest(BaseModel):
    job_position_id: int
    interview_type: str = Field("Technical", max_length=100)


class GeneratedQuestionItem(BaseModel):
    question: str


class QuestionGeneratorResponse(BaseModel):
    status: str = "success"
    job_position_id: int
    job_title: str
    interview_type: str
    total: int
    questions: list[GeneratedQuestionItem]


class SimulationStartRequest(BaseModel):
    job_position_id: int
    interview_type: str = Field("Technical", max_length=100)
    candidate_id: int


class SimulationQuestion(BaseModel):
    id: int
    question: str
    category: Optional[str] = None
    question_number: int


class SimulationAnswerFeedback(BaseModel):
    question_id: Optional[int] = None
    score: Optional[float] = None
    feedback: Optional[str] = None


class SimulationStartResponse(BaseModel):
    session_id: int
    status: str
    job_position_id: int
    job_title: str
    candidate_id: int
    candidate_name: str
    interview_type: str
    question_number: int
    total_questions: int
    answered_questions: int
    remaining_questions: int
    is_last: bool
    question: Optional[SimulationQuestion] = None
    last_answer: Optional[SimulationAnswerFeedback] = None


class SimulationAnswerRequest(BaseModel):
    session_id: int
    answer: str = Field(..., min_length=1)


class SimulationAnswerResponse(BaseModel):
    session_id: int
    status: str = "in_progress"
    message: Optional[str] = None
    answered_questions: Optional[int] = None
    remaining_questions: Optional[int] = None
    average_score: Optional[float] = None
    total_score: Optional[float] = None
    next_question: Optional[SimulationQuestion] = None
    last_feedback: Optional[str] = None
    job_title: Optional[str] = None
    candidate_name: Optional[str] = None
    interview_type: Optional[str] = None
    question_number: Optional[int] = None
    total_questions: Optional[int] = None
    is_last: Optional[bool] = None
