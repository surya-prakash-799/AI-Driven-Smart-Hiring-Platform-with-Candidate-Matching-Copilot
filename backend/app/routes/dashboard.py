from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.candidate import CandidateListResponse, DashboardResponse
from app.services import candidate_service

router = APIRouter()


@router.get(
    "/dashboard",
    response_model=DashboardResponse,
    summary="Get dashboard statistics",
    description="Retrieve recruitment dashboard metrics including total candidates, uploads today, and status breakdown.",
    responses={
        200: {"description": "Dashboard stats returned successfully"},
    },
)
@router.get(
    "/dashboard/stats",
    response_model=DashboardResponse,
    summary="Get dashboard statistics (alias)",
    description="Retrieve full recruitment metrics for the dashboard.",
)
def get_dashboard(db: Session = Depends(get_db)):
    stats = candidate_service.get_dashboard_stats(db)
    return DashboardResponse(**stats)



@router.get(
    "/search",
    response_model=CandidateListResponse,
    response_model_exclude={"resume_text"},
    summary="Search candidates",
    description="Search candidates by name, email, skill, education, experience, or status.",
    responses={
        200: {"description": "Search results returned successfully"},
    },
)
def search_candidates(
    name: str | None = Query(None, description="Filter by candidate name"),
    email: str | None = Query(None, description="Filter by email address"),
    skill: str | None = Query(None, description="Filter by skill"),
    education: str | None = Query(None, description="Filter by education"),
    experience: str | None = Query(None, description="Filter by experience"),
    status: str | None = Query(None, description="Filter by status (pending, shortlisted, rejected, review)"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(10, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
):
    result = candidate_service.search_candidates(
        db,
        name=name,
        email=email,
        skill=skill,
        education=education,
        experience=experience,
        status=status,
        page=page,
        per_page=per_page,
    )
    return CandidateListResponse.from_result(result)
