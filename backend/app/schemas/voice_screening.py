"""Pydantic schemas for Voice Screening module."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class VoiceScreeningCreate(BaseModel):
    candidate_id: int
    job_position_id: int
    duration_seconds: int = 0
    status: str = "Completed"
    result_summary: Optional[str] = "Voice screening recorded and processed successfully."


class VoiceScreeningResponse(BaseModel):
    id: int
    candidate_id: int
    candidate_name: str
    job_position_id: int
    job_title: str
    status: str
    duration_seconds: int
    result_summary: str
    created_at: datetime

    model_config = {"from_attributes": True}
