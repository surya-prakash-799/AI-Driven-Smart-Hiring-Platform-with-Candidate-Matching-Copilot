"""FastAPI router for Voice Screening module."""
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.routes.deps import get_current_user
from app.schemas.voice_screening import VoiceScreeningCreate, VoiceScreeningResponse
from app.services import voice_screening_service

router = APIRouter(
    prefix="/voice-screening",
    tags=["Voice Screening"],
    dependencies=[Depends(get_current_user)],
)


@router.post("/submit", response_model=VoiceScreeningResponse)
def submit_voice_screening(
    payload: VoiceScreeningCreate,
    db: Session = Depends(get_db),
):
    """Submit a completed voice screening session record."""
    try:
        result = voice_screening_service.create_voice_screening(db, payload)
        return VoiceScreeningResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save voice screening: {str(e)}")


@router.get("", response_model=List[VoiceScreeningResponse])
def list_voice_screenings(
    limit: int = 10,
    db: Session = Depends(get_db),
):
    """Get recent voice screening sessions."""
    records = voice_screening_service.get_recent_voice_screenings(db, limit=limit)
    return [VoiceScreeningResponse(**r) for r in records]


@router.get("/{candidate_id}", response_model=List[VoiceScreeningResponse])
def get_candidate_voice_screenings(
    candidate_id: int,
    db: Session = Depends(get_db),
):
    """Get voice screening sessions for a specific candidate."""
    records = voice_screening_service.get_voice_screenings_by_candidate(db, candidate_id)
    return [VoiceScreeningResponse(**r) for r in records]
