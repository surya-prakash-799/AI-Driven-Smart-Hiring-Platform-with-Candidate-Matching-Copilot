from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.routes.deps import get_current_user
from app.schemas.candidate import (
    CandidateListResponse,
    CandidateResponse,
    CandidateUpdate,
)
from app.services import candidate_service

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get(
    "/candidates",
    response_model=CandidateListResponse,
    response_model_exclude={"resume_text"},
    summary="Get all candidates",
    description="Retrieve a paginated list of all candidates with optional sorting and search.",
    responses={
        200: {"description": "List of candidates returned successfully"},
    },
)
def list_candidates(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(10, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("created_at", description="Sort field (id, full_name, email, status, created_at, updated_at)"),
    sort_order: str = Query("desc", description="Sort order (asc or desc)"),
    search: str | None = Query(None, description="Search term for name, email, phone, or status"),
    db: Session = Depends(get_db),
):
    result = candidate_service.get_all_candidates(
        db,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order,
        search=search,
    )
    return CandidateListResponse.from_result(result)


@router.get(
    "/candidates/search",
    summary="Search candidates by skill",
    description="Search candidate records stored in PostgreSQL by skill, calculate match scores, and return ranked candidates.",
)
def search_candidates_by_skill(
    skill: str = Query(..., description="Skill to search for (e.g. Python)"),
    job_id: int | None = Query(None, description="Optional Job Position ID to calculate specific match scores"),
    db: Session = Depends(get_db),
):
    from app.services.job_position_service import search_candidates_by_skill_service
    return search_candidates_by_skill_service(db, skill=skill, job_id=job_id)



@router.get(
    "/candidates/{candidate_id}",
    response_model=CandidateResponse,
    summary="Get candidate by ID",
    description="Retrieve detailed information for a specific candidate.",
    responses={
        200: {"description": "Candidate found and returned"},
        404: {"description": "Candidate not found"},
    },
)
def get_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
):
    candidate = candidate_service.get_candidate_by_id(db, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return CandidateResponse.model_validate(candidate)


@router.put(
    "/candidates/{candidate_id}",
    response_model=CandidateResponse,
    summary="Update a candidate",
    description="Update candidate information. Only provided fields will be updated.",
    responses={
        200: {"description": "Candidate updated successfully"},
        404: {"description": "Candidate not found"},
        422: {"description": "Validation error"},
    },
)
def update_candidate(
    candidate_id: int,
    data: CandidateUpdate,
    db: Session = Depends(get_db),
):
    candidate = candidate_service.update_candidate(db, candidate_id, data)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return CandidateResponse.model_validate(candidate)


@router.delete(
    "/candidates/{candidate_id}",
    summary="Delete a candidate",
    description="Permanently delete a candidate from the database.",
    responses={
        200: {"description": "Candidate deleted successfully"},
        404: {"description": "Candidate not found"},
    },
)
def delete_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
):
    success = candidate_service.delete_candidate(db, candidate_id)
    if not success:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"status": "success", "message": "Candidate deleted successfully"}
