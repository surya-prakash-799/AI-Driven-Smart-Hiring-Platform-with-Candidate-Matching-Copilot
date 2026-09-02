"""SQLAlchemy model for Voice Screening sessions."""
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class VoiceScreening(Base):
    __tablename__ = "voice_screenings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    candidate_id: Mapped[int] = mapped_column(Integer, ForeignKey("candidates.id"), nullable=False)
    job_position_id: Mapped[int] = mapped_column(Integer, ForeignKey("job_positions.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Completed")
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    audio_file: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    result_summary: Mapped[str] = mapped_column(Text, default="Voice screening recorded and processed successfully.")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    candidate: Mapped["Candidate"] = relationship("Candidate")
    job_position: Mapped["JobPosition"] = relationship("JobPosition")
