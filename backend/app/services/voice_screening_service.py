"""Business logic & database service for Voice Screening."""
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.candidate import Candidate
from app.models.job_position import JobPosition
from app.models.voice_screening import VoiceScreening
from app.schemas.voice_screening import VoiceScreeningCreate


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
        audio_file=audio_filename,
        result_summary=payload.result_summary or "Voice screening recorded and processed successfully.",
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "id": record.id,
        "candidate_id": candidate.id,
        "candidate_name": candidate.full_name,
        "job_position_id": job.id,
        "job_title": job.title,
        "status": record.status,
        "duration_seconds": record.duration_seconds,
        "result_summary": record.result_summary,
        "created_at": record.created_at,
    }


def get_recent_voice_screenings(db: Session, limit: int = 10) -> List[dict]:
    """Retrieve recent VoiceScreening records with candidate and job titles."""
    records = (
        db.query(VoiceScreening)
        .order_by(VoiceScreening.created_at.desc())
        .limit(limit)
        .all()
    )
    results = []
    for r in records:
        cand_name = r.candidate.full_name if r.candidate else "Unknown Candidate"
        job_title = r.job_position.title if r.job_position else "Unknown Job"
        results.append({
            "id": r.id,
            "candidate_id": r.candidate_id,
            "candidate_name": cand_name,
            "job_position_id": r.job_position_id,
            "job_title": job_title,
            "status": r.status,
            "duration_seconds": r.duration_seconds,
            "result_summary": r.result_summary,
            "created_at": r.created_at,
        })
    return results


def get_voice_screenings_by_candidate(db: Session, candidate_id: int) -> List[dict]:
    """Retrieve VoiceScreening records for a specific candidate."""
    records = (
        db.query(VoiceScreening)
        .filter(VoiceScreening.candidate_id == candidate_id)
        .order_by(VoiceScreening.created_at.desc())
        .all()
    )
    results = []
    for r in records:
        cand_name = r.candidate.full_name if r.candidate else "Unknown Candidate"
        job_title = r.job_position.title if r.job_position else "Unknown Job"
        results.append({
            "id": r.id,
            "candidate_id": r.candidate_id,
            "candidate_name": cand_name,
            "job_position_id": r.job_position_id,
            "job_title": job_title,
            "status": r.status,
            "duration_seconds": r.duration_seconds,
            "result_summary": r.result_summary,
            "created_at": r.created_at,
        })
    return results
