from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class JobPosition(Base):
    __tablename__ = "job_positions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    required_skills = Column(JSON, nullable=False, default=list)
    preferred_skills = Column(JSON, nullable=True, default=list)
    minimum_experience = Column(Integer, nullable=False, default=0)
    education = Column(String(255), nullable=True, default="Bachelor's Degree")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    shortlisted_candidates = relationship(
        "ShortlistedCandidate", back_populates="job_position", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<JobPosition(id={self.id}, title='{self.title}')>"


class ShortlistedCandidate(Base):
    __tablename__ = "shortlisted_candidates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    job_position_id = Column(
        Integer, ForeignKey("job_positions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    candidate_id = Column(
        Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True
    )
    match_score = Column(Float, nullable=False, default=0.0)
    status = Column(String(50), nullable=False, default="shortlisted")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    job_position = relationship("JobPosition", back_populates="shortlisted_candidates")
    candidate = relationship("Candidate")

    __table_args__ = (
        UniqueConstraint("job_position_id", "candidate_id", name="uq_job_candidate_shortlist"),
    )

    def __repr__(self) -> str:
        return (
            f"<ShortlistedCandidate(job_position_id={self.job_position_id}, "
            f"candidate_id={self.candidate_id}, score={self.match_score})>"
        )
