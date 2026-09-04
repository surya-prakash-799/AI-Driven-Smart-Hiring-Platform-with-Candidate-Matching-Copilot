"""Business logic & database service for Voice Screening."""
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.candidate import Candidate
from app.models.job_position import JobPosition
from app.models.voice_screening import VoiceScreening
from app.schemas.voice_screening import VoiceScreeningCreate
from app.services.groq_speech_to_text import transcribe_audio


def _to_dict(record: VoiceScreening) -> dict:
    cand_name = record.candidate.full_name if record.candidate else "Unknown Candidate"
    job_title = record.job_position.title if record.job_position else "Unknown Job"
    return {
        "id": record.id,
        "candidate_id": record.candidate_id,
        "candidate_name": cand_name,
        "job_position_id": record.job_position_id,
        "job_title": job_title,
        "status": record.status,
        "duration_seconds": record.duration_seconds,
        "transcript": record.transcript,
        "result_summary": record.result_summary,
        "created_at": record.created_at,
    }


def create_voice_screening(
    db: Session,
    payload: VoiceScreeningCreate,
    audio_filename: Optional[str] = None
) -> dict:
    """Create a new VoiceScreening record."""
    candidate = db.query(Candidate).filter(Candidate.id == payload.candidate_id).first()
    if not candidate:
        raise ValueError(f"Candidate ID {payload.candidate_id} not found")

    job = db.query(JobPosition).filter(JobPosition.id == payload.job_position_id).first()
    if not job:
        raise ValueError(f"Job Position ID {payload.job_position_id} not found")

    record = VoiceScreening(
        candidate_id=candidate.id,
        job_position_id=job.id,
        status=payload.status,
        duration_seconds=payload.duration_seconds,
        transcript=payload.transcript,
        result_summary=payload.result_summary or "Voice screening recorded and processed successfully.",
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return _to_dict(record)


def transcribe_and_store(
    db: Session,
    audio_bytes: bytes,
    candidate_id: int,
    job_position_id: int,
    duration_seconds: int,
    filename: str,
    mime_type: Optional[str] = None,
) -> dict:
    """Transcribe a voice recording via Groq and store the transcript in PostgreSQL.

    The temporary audio file (if any) is removed immediately after transcription.
    Only the transcript text is stored - the raw audio is never persisted.
    """
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise ValueError(f"Candidate ID {candidate_id} not found")

    job = db.query(JobPosition).filter(JobPosition.id == job_position_id).first()
    if not job:
        raise ValueError(f"Job Position ID {job_position_id} not found")

    transcript = transcribe_audio(audio_bytes, filename=filename, mime_type=mime_type)

    record = VoiceScreening(
        candidate_id=candidate.id,
        job_position_id=job.id,
        status="Completed",
        duration_seconds=duration_seconds,
        transcript=transcript,
        result_summary="Voice screening transcribed and completed successfully.",
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return _to_dict(record)


def get_recent_voice_screenings(db: Session, limit: int = 10) -> List[dict]:
    """Retrieve recent VoiceScreening records with candidate and job titles."""
    records = (
        db.query(VoiceScreening)
        .order_by(VoiceScreening.created_at.desc())
        .limit(limit)
        .all()
    )
    return [_to_dict(r) for r in records]


def get_voice_screenings_by_candidate(db: Session, candidate_id: int) -> List[dict]:
    """Retrieve VoiceScreening records for a specific candidate."""
    records = (
        db.query(VoiceScreening)
        .filter(VoiceScreening.candidate_id == candidate_id)
        .order_by(VoiceScreening.created_at.desc())
        .all()
    )
    return [_to_dict(r) for r in records]
