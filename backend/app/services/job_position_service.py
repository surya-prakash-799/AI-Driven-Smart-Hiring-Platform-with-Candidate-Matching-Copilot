from typing import Any, Dict, List, Optional
from loguru import logger
from sqlalchemy.orm import Session
from sqlalchemy import cast, func, String, Text

from app.models.candidate import Candidate
from app.models.job_position import JobPosition, ShortlistedCandidate
from app.schemas.job_position import (
    JobPositionCreate,
    JobPositionUpdate,
    JobPositionResponse,
    CandidateMatchItem,
    JobPositionCandidatesResponse,
    SkillSearchResponse,
    ShortlistResponse,
)
from app.services.matching_service import (
    calculate_candidate_match,
    extract_total_experience_years,
    generate_skill_gap_analysis,
)


def create_job_position(db: Session, job_in: JobPositionCreate) -> JobPosition:
    """Create a new job position in the database."""
    job = JobPosition(
        title=job_in.title,
        description=job_in.description,
        required_skills=job_in.required_skills,
        preferred_skills=job_in.preferred_skills,
        minimum_experience=job_in.minimum_experience,
        education=job_in.education,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    logger.info(f"Created job position ID {job.id}: {job.title}")
    return job


def get_job_positions(db: Session, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
    """Retrieve all job positions with shortlisted candidate counts."""
    positions = db.query(JobPosition).order_by(JobPosition.created_at.desc()).offset(skip).limit(limit).all()
    results = []
    for pos in positions:
        shortlisted_cnt = db.query(ShortlistedCandidate).filter(ShortlistedCandidate.job_position_id == pos.id).count()
        pos_dict = JobPositionResponse.model_validate(pos).model_dump()
        pos_dict["shortlisted_count"] = shortlisted_cnt
        results.append(pos_dict)
    return results


def get_job_position_by_id(db: Session, job_id: int) -> Optional[Dict[str, Any]]:
    """Retrieve a single job position by ID."""
    pos = db.query(JobPosition).filter(JobPosition.id == job_id).first()
    if not pos:
        return None
    shortlisted_cnt = db.query(ShortlistedCandidate).filter(ShortlistedCandidate.job_position_id == pos.id).count()
    pos_dict = JobPositionResponse.model_validate(pos).model_dump()
    pos_dict["shortlisted_count"] = shortlisted_cnt
    return pos_dict


def update_job_position(db: Session, job_id: int, job_in: JobPositionUpdate) -> Optional[JobPosition]:
    """Update job position attributes."""
    job = db.query(JobPosition).filter(JobPosition.id == job_id).first()
    if not job:
        return None

    update_data = job_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(job, field, value)

    db.commit()
    db.refresh(job)
    logger.info(f"Updated job position ID {job_id}")
    return job


def delete_job_position(db: Session, job_id: int) -> bool:
    """Delete a job position."""
    job = db.query(JobPosition).filter(JobPosition.id == job_id).first()
    if not job:
        return False
    db.delete(job)
    db.commit()
    logger.info(f"Deleted job position ID {job_id}")
    return True


def get_shortlisted_candidate_ids(db: Session, job_id: int) -> set[int]:
    """Return set of candidate IDs shortlisted for a specific job position."""
    shortlisted = (
        db.query(ShortlistedCandidate.candidate_id)
        .filter(ShortlistedCandidate.job_position_id == job_id)
        .all()
    )
    return {c[0] for c in shortlisted}


def rank_candidates_for_job(
    db: Session, job_id: int, skill_filter: Optional[str] = None
) -> JobPositionCandidatesResponse:
    """
    Retrieve all candidates from PostgreSQL, compute dynamic match scores against the JobPosition,
    and rank candidates descending by match score.
    """
    job = db.query(JobPosition).filter(JobPosition.id == job_id).first()
    if not job:
        raise ValueError(f"Job position ID {job_id} not found")

    query = db.query(Candidate)

    # If skill_filter is supplied, apply DB query filtering
    if skill_filter and skill_filter.strip():
        search_term = f"%{skill_filter.strip().lower()}%"
        # Match inside skills JSON string or resume_text or full_name
        query = query.filter(
            func.lower(cast(Candidate.skills, Text)).like(search_term)
            | func.lower(Candidate.resume_text).like(search_term)
            | func.lower(Candidate.full_name).like(search_term)
        )

    candidates = query.all()
    shortlisted_ids = get_shortlisted_candidate_ids(db, job.id)

    scored_candidates = []
    for cand in candidates:
        match_res = calculate_candidate_match(cand, job)
        cand_skills = cand.skills if isinstance(cand.skills, list) else []
        cand_edu = cand.education if isinstance(cand.education, list) else []

        item = CandidateMatchItem(
            id=cand.id,
            full_name=cand.full_name or "Unnamed Candidate",
            email=cand.email,
            phone=cand.phone,
            skills=cand.skills if isinstance(cand.skills, list) else [],
            experience_years=int(match_res["candidate_experience_years"]),
            education=cand_edu,
            match_score=match_res["overall_match_score"],
            required_match_pct=match_res["required_match_pct"],
            preferred_match_pct=match_res["preferred_match_pct"],
            is_shortlisted=(cand.id in shortlisted_ids),
            rank=1,
        )
        scored_candidates.append(item)

    # Sort descending by match_score
    scored_candidates.sort(key=lambda x: x.match_score, reverse=True)

    # Assign dynamic rank #1, #2, #3...
    for index, item in enumerate(scored_candidates, start=1):
        item.rank = index

    pos_resp = JobPositionResponse.model_validate(job)
    pos_resp.shortlisted_count = len(shortlisted_ids)

    return JobPositionCandidatesResponse(
        job_position=pos_resp,
        total_candidates=len(scored_candidates),
        candidates=scored_candidates,
    )


def search_candidates_by_skill_service(
    db: Session, skill: str, job_id: Optional[int] = None
) -> SkillSearchResponse:
    """
    Search candidate records in PostgreSQL by skill, compute match scores (against selected job_id if provided),
    and rank candidates from highest to lowest score.
    """
    skill_clean = skill.strip().lower()
    search_term = f"%{skill_clean}%"

    query = db.query(Candidate).filter(
        func.lower(cast(Candidate.skills, Text)).like(search_term)
        | func.lower(Candidate.resume_text).like(search_term)
    )

    candidates = query.all()


    target_job = None
    shortlisted_ids: set[int] = set()
    if job_id:
        target_job = db.query(JobPosition).filter(JobPosition.id == job_id).first()
        if target_job:
            shortlisted_ids = get_shortlisted_candidate_ids(db, target_job.id)

    scored_candidates = []
    for cand in candidates:
        cand_skills = cand.skills if isinstance(cand.skills, list) else []
        cand_edu = cand.education if isinstance(cand.education, list) else []
        exp_years = int(extract_total_experience_years(cand))

        if target_job:
            match_res = calculate_candidate_match(cand, target_job)
            score = match_res["overall_match_score"]
            req_pct = match_res["required_match_pct"]
            pref_pct = match_res["preferred_match_pct"]
        else:
            # Default score if no specific job selected: 100 if skill matches
            score = 100.0 if any(skill_clean in s.lower() for s in cand_skills) else 75.0
            req_pct = score
            pref_pct = score

        scored_candidates.append(
            CandidateMatchItem(
                id=cand.id,
                full_name=cand.full_name or "Unnamed Candidate",
                email=cand.email,
                phone=cand.phone,
                skills=cand_skills,
                experience_years=exp_years,
                education=cand_edu,
                match_score=score,
                required_match_pct=req_pct,
                preferred_match_pct=pref_pct,
                is_shortlisted=(cand.id in shortlisted_ids),
                rank=1,
            )
        )

    # Sort descending by match_score
    scored_candidates.sort(key=lambda x: x.match_score, reverse=True)
    for idx, item in enumerate(scored_candidates, start=1):
        item.rank = idx

    return SkillSearchResponse(
        skill=skill,
        total_candidates=len(scored_candidates),
        candidates=scored_candidates,
    )


def shortlist_candidate_for_job(
    db: Session, job_id: int, candidate_id: int
) -> ShortlistResponse:
    """Shortlist a candidate for a job position. Store status in PostgreSQL safely avoiding duplicates."""
    job = db.query(JobPosition).filter(JobPosition.id == job_id).first()
    if not job:
        raise ValueError(f"Job position ID {job_id} not found")

    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise ValueError(f"Candidate ID {candidate_id} not found")

    existing = (
        db.query(ShortlistedCandidate)
        .filter(
            ShortlistedCandidate.job_position_id == job_id,
            ShortlistedCandidate.candidate_id == candidate_id,
        )
        .first()
    )

    match_res = calculate_candidate_match(candidate, job)
    score = match_res["overall_match_score"]

    if existing:
        existing.match_score = score
        existing.status = "shortlisted"
        db.commit()
        db.refresh(existing)
        return ShortlistResponse(
            status="success",
            message=f"{candidate.full_name or 'Candidate'} is already shortlisted for {job.title}.",
            shortlist_id=existing.id,
            candidate_id=candidate.id,
            job_position_id=job.id,
            match_score=score,
        )

    # Also update candidate status in main candidates table to 'shortlisted'
    candidate.status = "shortlisted"

    shortlist_record = ShortlistedCandidate(
        job_position_id=job.id,
        candidate_id=candidate.id,
        match_score=score,
        status="shortlisted",
    )
    db.add(shortlist_record)
    db.commit()
    db.refresh(shortlist_record)

    logger.info(f"Shortlisted candidate {candidate.id} for job position {job.id}")

    return ShortlistResponse(
        status="success",
        message=f"{candidate.full_name or 'Candidate'} successfully shortlisted for {job.title}.",
        shortlist_id=shortlist_record.id,
        candidate_id=candidate.id,
        job_position_id=job.id,
        match_score=score,
    )


def get_shortlisted_candidates_for_job(db: Session, job_id: int) -> List[Dict[str, Any]]:
    """List all shortlisted candidates for a given job position."""
    shortlist_records = (
        db.query(ShortlistedCandidate)
        .filter(ShortlistedCandidate.job_position_id == job_id)
        .order_by(ShortlistedCandidate.match_score.desc())
        .all()
    )
    results = []
    for sc in shortlist_records:
        cand = sc.candidate
        if cand:
            results.append({
                "shortlist_id": sc.id,
                "candidate_id": cand.id,
                "full_name": cand.full_name or "Unnamed Candidate",
                "email": cand.email,
                "phone": cand.phone,
                "skills": cand.skills if isinstance(cand.skills, list) else [],
                "match_score": sc.match_score,
                "status": sc.status,
                "created_at": sc.created_at,
            })
    return results
