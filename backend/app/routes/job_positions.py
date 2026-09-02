from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.candidate import Candidate
from app.models.job_position import JobPosition
from app.routes.deps import get_current_user
from app.schemas.job_position import (
    CandidateMatchItem,
    JobPositionCandidatesResponse,
    JobPositionCreate,
    JobPositionResponse,
    JobPositionUpdate,
    ShortlistResponse,
    SkillGapAnalysisResponse,
    SkillSearchResponse,
)
from app.services import job_position_service
from app.services.matching_service import generate_skill_gap_analysis

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.post("/job-positions", response_model=JobPositionResponse, status_code=status.HTTP_201_CREATED)
def create_job_position(
    job_in: JobPositionCreate, db: Session = Depends(get_db)
):
    """Create a new job position for candidate matching."""
    job = job_position_service.create_job_position(db, job_in)
    return job_position_service.get_job_position_by_id(db, job.id)



@router.get("/job-positions", response_model=List[JobPositionResponse])
def list_job_positions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Get all job positions with shortlisted candidate counts."""
    return job_position_service.get_job_positions(db, skip=skip, limit=limit)


@router.get("/job-positions/{job_id}", response_model=JobPositionResponse)
def get_job_position(job_id: int, db: Session = Depends(get_db)):
    """Get details of a specific job position by ID."""
    job = job_position_service.get_job_position_by_id(db, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Job position ID {job_id} not found"
        )
    return job


@router.put("/job-positions/{job_id}", response_model=JobPositionResponse)
def update_job_position(
    job_id: int, job_in: JobPositionUpdate, db: Session = Depends(get_db)
):
    """Update a job position."""
    job = job_position_service.update_job_position(db, job_id, job_in)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Job position ID {job_id} not found"
        )
    return job_position_service.get_job_position_by_id(db, job_id)


@router.delete("/job-positions/{job_id}", status_code=status.HTTP_200_OK)
def delete_job_position(job_id: int, db: Session = Depends(get_db)):
    """Delete a job position."""
    success = job_position_service.delete_job_position(db, job_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Job position ID {job_id} not found"
        )
    return {"status": "success", "message": f"Job position ID {job_id} deleted successfully"}


@router.get("/job-positions/{job_id}/candidates", response_model=JobPositionCandidatesResponse)
def get_job_position_candidates(
    job_id: int,
    skill: Optional[str] = Query(None, description="Optional skill search filter"),
    db: Session = Depends(get_db),
):
    """Get ranked candidates for a job position based on match algorithm."""
    try:
        return job_position_service.rank_candidates_for_job(db, job_id, skill_filter=skill)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/job-positions/{job_id}/matching", response_model=JobPositionCandidatesResponse)
def get_job_position_matching(
    job_id: int,
    skill: Optional[str] = Query(None, description="Optional skill search filter"),
    db: Session = Depends(get_db),
):
    """Get matching candidates for a job position ranked by match score."""
    try:
        return job_position_service.rank_candidates_for_job(db, job_id, skill_filter=skill)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/job-positions/{job_id}/shortlist/{candidate_id}", response_model=ShortlistResponse)
def shortlist_candidate(
    job_id: int, candidate_id: int, db: Session = Depends(get_db)
):
    """Shortlist a candidate for a job position and persist status in PostgreSQL."""
    try:
        return job_position_service.shortlist_candidate_for_job(db, job_id, candidate_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/job-positions/{job_id}/shortlisted")
def get_shortlisted_candidates(job_id: int, db: Session = Depends(get_db)):
    """List all candidates shortlisted for a job position."""
    job = db.query(JobPosition).filter(JobPosition.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Job position ID {job_id} not found"
        )
    return job_position_service.get_shortlisted_candidates_for_job(db, job_id)


@router.get("/candidates/{candidate_id}/skill-gap/{job_id}", response_model=SkillGapAnalysisResponse)
def get_skill_gap_analysis(
    candidate_id: int, job_id: int, db: Session = Depends(get_db)
):
    """Compare candidate skills vs job position requirements and return skill gap analysis & recommendations."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Candidate ID {candidate_id} not found"
        )

    job = db.query(JobPosition).filter(JobPosition.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Job position ID {job_id} not found"
        )

    return generate_skill_gap_analysis(candidate, job)
