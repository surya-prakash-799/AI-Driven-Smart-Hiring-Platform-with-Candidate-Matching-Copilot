from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, field_validator

VALID_STATUSES = {"pending", "shortlisted", "rejected", "review"}


class ExperienceItem(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    duration: Optional[str] = None


def _validate_status(v: Optional[str]) -> Optional[str]:
    if v is not None:
        lowered = v.lower()
        if lowered not in VALID_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(sorted(VALID_STATUSES))}")
        return lowered
    return v


def _normalize_email_value(v):
    if isinstance(v, str):
        return v.strip().lower()
    return v


class CandidateCreate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    education: Optional[list[str]] = None
    experience: Optional[list[dict[str, Any]]] = None
    skills: Optional[list[str]] = None
    projects: Optional[list[str]] = None
    certifications: Optional[list[str]] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    resume_file: Optional[str] = None
    resume_text: Optional[str] = None
    status: Optional[str] = "pending"

    _validate_status = field_validator("status")(_validate_status)
    _normalize_email = field_validator("email", mode="before")(_normalize_email_value)


class CandidateUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    education: Optional[list[str]] = None
    experience: Optional[list[dict[str, Any]]] = None
    skills: Optional[list[str]] = None
    projects: Optional[list[str]] = None
    certifications: Optional[list[str]] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    resume_file: Optional[str] = None
    resume_text: Optional[str] = None
    status: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        return _validate_status(v)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v):
        return _normalize_email_value(v)


class CandidateResponse(BaseModel):
    id: int
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    education: Optional[list[str]] = None
    experience: Optional[list[dict[str, Any]]] = None
    skills: Optional[list[str]] = None
    projects: Optional[list[str]] = None
    certifications: Optional[list[str]] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    resume_file: Optional[str] = None
    resume_text: Optional[str] = None
    status: Optional[str] = "pending"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class CandidateListResponse(BaseModel):
    candidates: list[CandidateResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

    @classmethod
    def from_result(cls, result: dict[str, Any]) -> "CandidateListResponse":
        return cls(
            candidates=[CandidateResponse.model_validate(c) for c in result["candidates"]],
            total=result["total"],
            page=result["page"],
            per_page=result["per_page"],
            total_pages=result["total_pages"],
        )


class PipelineStats(BaseModel):
    applied: int = 0
    shortlisted: int = 0
    interview: int = 0
    selected: int = 0
    rejected: int = 0


class AIInsightsStats(BaseModel):
    topCandidate: Optional[str] = None
    bestMatchScore: float = 0.0
    mostRequestedSkills: list[str] = []
    highestDemandPosition: Optional[str] = None
    averageMatchScore: float = 0.0
    recommendations: list[str] = []


class TopCandidateMatchItem(BaseModel):
    candidate_id: int
    candidate_name: str
    job_title: str
    match_score: float
    matched_skills: list[str] = []
    status: str = "shortlisted"


class InterviewStatusStats(BaseModel):
    scheduled: int = 0
    in_progress: int = 0
    completed: int = 0
    pending: int = 0


class RecentActivityItem(BaseModel):
    id: int
    type: str
    message: str
    time: str
    timestamp: str


class DashboardResponse(BaseModel):
    totalCandidates: int = 0
    activeJobPositions: int = 0
    shortlistedCandidates: int = 0
    pendingInterviews: int = 0
    uploadsToday: int = 0
    parsed: int = 0
    pending: int = 0
    shortlisted: int = 0
    rejected: int = 0
    successRate: float = 0.0
    pipeline: PipelineStats = PipelineStats()
    aiInsights: AIInsightsStats = AIInsightsStats()
    topCandidateMatches: list[TopCandidateMatchItem] = []
    interviewStatus: InterviewStatusStats = InterviewStatusStats()
    recentActivity: list[RecentActivityItem] = []



class UploadResponse(BaseModel):
    status: str
    message: str
    candidate: Optional[CandidateResponse] = None
    extracted_data: Optional[dict[str, Any]] = None


class HealthResponse(BaseModel):
    status: str
    database: str
    message: str
    timestamp: datetime
