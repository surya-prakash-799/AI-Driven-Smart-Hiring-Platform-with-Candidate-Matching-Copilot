from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    job_position_id = Column(
        Integer, ForeignKey("job_positions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    candidate_id = Column(
        Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True
    )
    interview_type = Column(String(100), nullable=False, default="Technical")
    difficulty = Column(String(50), nullable=False, default="Medium")
    status = Column(String(50), nullable=False, default="created")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    job_position = relationship("JobPosition")
    candidate = relationship("Candidate")
    questions = relationship(
        "InterviewQuestion", back_populates="interview", cascade="all, delete-orphan",
        order_by="InterviewQuestion.question_order"
    )

    def __repr__(self) -> str:
        return f"<Interview(id={self.id}, status='{self.status}')>"


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    interview_id = Column(
        Integer, ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question = Column(Text, nullable=False)
    category = Column(String(100), nullable=False, default="Technical")
    skill = Column(String(255), nullable=True)
    difficulty = Column(String(50), nullable=False, default="Medium")
    question_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    interview = relationship("Interview", back_populates="questions")
    answer = relationship(
        "InterviewAnswer", back_populates="question", uselist=False, cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<InterviewQuestion(id={self.id}, category='{self.category}')>"


class InterviewAnswer(Base):
    __tablename__ = "interview_answers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    question_id = Column(
        Integer, ForeignKey("interview_questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    answer = Column(Text, nullable=False)
    score = Column(Float, nullable=True, default=0.0)
    feedback = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    question = relationship("InterviewQuestion", back_populates="answer")

    def __repr__(self) -> str:
        return f"<InterviewAnswer(id={self.id}, score={self.score})>"
