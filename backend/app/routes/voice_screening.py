"""FastAPI router for Voice Screening module."""
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.voice_screening import (
    VoiceScreeningCreate,
    VoiceScreeningResponse,
    VoiceScreeningTranscriptResponse,
)
from app.services import voice_screening_service
from app.services.groq_speech_to_text import GroqSTTError

router = APIRouter(
    prefix="/voice-screening",
    tags=["Voice Screening"],
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


@router.post("/transcribe", response_model=VoiceScreeningTranscriptResponse)
async def transcribe_voice_screening(
    candidate_id: int = Form(...),
    job_position_id: int = Form(...),
    duration_seconds: int = Form(0),
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Receive a temporary voice recording, transcribe it via Groq Whisper,
    store the transcript in PostgreSQL, and return the transcript.

    The audio is processed in memory and never written to or stored on disk.
    Only the transcript is persisted in the database.
    """
    audio_bytes = await audio.read()
    filename = audio.filename or "recording.webm"
    mime_type = audio.content_type

    try:
        result = voice_screening_service.transcribe_and_store(
            db,
            audio_bytes=audio_bytes,
            candidate_id=candidate_id,
            job_position_id=job_position_id,
            duration_seconds=duration_seconds,
            filename=filename,
            mime_type=mime_type,
        )
        return VoiceScreeningTranscriptResponse(
            success=True,
            candidate_id=result["candidate_id"],
            job_position_id=result["job_position_id"],
            transcript=result["transcript"] or "",
            status="completed",
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except GroqSTTError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to transcribe the voice screening. Please try again.")


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
