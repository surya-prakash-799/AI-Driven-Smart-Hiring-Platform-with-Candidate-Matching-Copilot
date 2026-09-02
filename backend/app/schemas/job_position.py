from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class JobPositionBase(BaseModel):
    title: str = Field(..., example="Software Engineer")
    description: Optional[str] = Field(None, example="We are looking for a Software Engineer to join our team.")
    required_skills: list[str] = Field(default_factory=list, example=["Python", "FastAPI", "SQL"])
    preferred_skills: list[str] = Field(default_factory=list, example=["Docker", "AWS", "CI/CD"])
    minimum_experience: int = Field(0, ge=0, example=2)
    education: Optional[str] = Field("Bachelor's Degree", example="Bachelor's Degree")


class JobPositionCreate(JobPositionBase):
    pass


class JobPositionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    required_skills: Optional[list[str]] = None
    preferred_skills: Optional[list[str]] = None
    minimum_experience: Optional[int] = None
    education: Optional[str] = None


class JobPositionResponse(JobPositionBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    shortlisted_count: int = 0

    class Config:
        from_attributes = True


class CandidateMatchItem(BaseModel):
    id: int
    full_name: Optional[str] = "Unknown"
    email: Optional[str] = None
    phone: Optional[str] = None
    skills: list[str] = Field(default_factory=list)
    experience_years: int = 0
    education: list[str] = Field(default_factory=list)
    match_score: float = 0.0
    required_match_pct: float = 0.0
    preferred_match_pct: float = 0.0
    is_shortlisted: bool = False
    rank: int = 1


class JobPositionCandidatesResponse(BaseModel):
    job_position: JobPositionResponse
    total_candidates: int
    candidates: list[CandidateMatchItem]


class SkillSearchResponse(BaseModel):
    skill: str
    total_candidates: int
    candidates: list[CandidateMatchItem]


class SkillGapItem(BaseModel):
    skill_name: str
    status: str  # "matching" | "partial" | "missing"
    category: str  # "required" | "preferred"
    level: str  # "Advanced" | "Intermediate" | "Basic" | "Required" | "Missing"


class SkillGapAnalysisResponse(BaseModel):
    candidate_id: int
    candidate_name: str
    job_position_id: int
    job_title: str
    overall_match_score: float
    matching_skills_count: int
    missing_skills_count: int
    items: list[SkillGapItem]
    recommendations: list[str]


class ShortlistResponse(BaseModel):
    status: str = "success"
    message: str
    shortlist_id: int
    candidate_id: int
    job_position_id: int
    match_score: float
