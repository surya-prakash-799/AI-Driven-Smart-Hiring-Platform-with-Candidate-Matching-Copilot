import math
import os
from datetime import datetime, timezone
from typing import Any, Optional

from loguru import logger
from sqlalchemy import Text, cast, func, or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.candidate import Candidate
from app.models.interview import Interview
from app.models.job_position import JobPosition, ShortlistedCandidate
from app.schemas.candidate import CandidateCreate, CandidateUpdate
from app.services.matching_service import calculate_candidate_match


settings = get_settings()

ALLOWED_SORT_COLUMNS = {
    "id", "full_name", "email", "status", "created_at", "updated_at", "phone"
}

_SORT_COLUMNS = {
    "id": Candidate.id,
    "full_name": Candidate.full_name,
    "email": Candidate.email,
    "phone": Candidate.phone,
    "status": Candidate.status,
    "created_at": Candidate.created_at,
    "updated_at": Candidate.updated_at,
}


def _normalize_email(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    return value.strip().lower()


def _remove_candidate_artifacts(resume_file: Optional[str]) -> None:
    """Delete the uploaded resume and its extracted JSON when present."""
    if not resume_file:
        return
    try:
        upload_path = os.path.join(settings.UPLOAD_DIR, resume_file)
        if os.path.exists(upload_path):
            os.remove(upload_path)
        stem = os.path.splitext(resume_file)[0]
        extracted_path = os.path.join(settings.EXTRACTED_DIR, f"{stem}.json")
        if os.path.exists(extracted_path):
            os.remove(extracted_path)
    except OSError as e:
        logger.warning(f"Failed to remove candidate artifacts for {resume_file}: {e}")


def create_candidate(db: Session, data: CandidateCreate) -> Candidate:
    candidate = Candidate(
        full_name=data.full_name,
        email=_normalize_email(data.email),
        phone=data.phone,
        education=data.education or [],
        experience=data.experience or [],
        skills=data.skills or [],
        projects=data.projects or [],
        certifications=data.certifications or [],
        linkedin=data.linkedin,
        github=data.github,
        resume_file=data.resume_file,
        resume_text=data.resume_text,
        status=data.status or "pending",
    )
    try:
        db.add(candidate)
        db.commit()
        db.refresh(candidate)
    except Exception:
        db.rollback()
        logger.exception("Failed to create candidate")
        raise
    return candidate


def get_candidate_by_id(db: Session, candidate_id: int) -> Optional[Candidate]:
    return db.scalar(select(Candidate).where(Candidate.id == candidate_id))


def get_candidate_by_email(db: Session, email: str) -> Optional[Candidate]:
    email = _normalize_email(email)
    if not email:
        return None
    return db.scalar(select(Candidate).where(Candidate.email == email))


def get_all_candidates(
    db: Session,
    page: int = 1,
    per_page: int = 10,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    search: str | None = None,
) -> dict[str, Any]:
    stmt = select(Candidate)

    if search:
        search_term = f"%{search}%"
        stmt = stmt.where(
            or_(
                Candidate.full_name.ilike(search_term),
                Candidate.email.ilike(search_term),
                Candidate.phone.ilike(search_term),
                Candidate.status.ilike(search_term),
            )
        )

    sort_column = _SORT_COLUMNS.get(sort_by, Candidate.created_at)
    if sort_order.lower() == "asc":
        stmt = stmt.order_by(sort_column.asc())
    else:
        stmt = stmt.order_by(sort_column.desc())

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    total_pages = math.ceil(total / per_page) if total > 0 else 1

    candidates = db.scalars(
        stmt.offset((page - 1) * per_page).limit(per_page)
    ).all()

    return {
        "candidates": candidates,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
    }


def update_candidate(
    db: Session, candidate_id: int, data: CandidateUpdate
) -> Optional[Candidate]:
    candidate = db.scalar(select(Candidate).where(Candidate.id == candidate_id))
    if not candidate:
        return None

    update_data = data.model_dump(exclude_unset=True)
    if "email" in update_data:
        update_data["email"] = _normalize_email(update_data["email"])
    for field, value in update_data.items():
        setattr(candidate, field, value)

    candidate.updated_at = datetime.now(timezone.utc)
    try:
        db.commit()
        db.refresh(candidate)
    except Exception:
        db.rollback()
        logger.exception(f"Failed to update candidate {candidate_id}")
        raise
    return candidate


def delete_candidate(db: Session, candidate_id: int) -> bool:
    candidate = db.scalar(select(Candidate).where(Candidate.id == candidate_id))
    if not candidate:
        return False
    resume_file = candidate.resume_file
    try:
        db.delete(candidate)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception(f"Failed to delete candidate {candidate_id}")
        raise
    _remove_candidate_artifacts(resume_file)
    return True


def search_candidates(
    db: Session,
    name: str | None = None,
    email: str | None = None,
    skill: str | None = None,
    education: str | None = None,
    experience: str | None = None,
    status: str | None = None,
    page: int = 1,
    per_page: int = 10,
) -> dict[str, Any]:
    stmt = select(Candidate)

    if name:
        stmt = stmt.where(Candidate.full_name.ilike(f"%{name}%"))
    if email:
        stmt = stmt.where(Candidate.email.ilike(f"%{email}%"))
    if status:
        stmt = stmt.where(Candidate.status.ilike(f"%{status}%"))
    if skill:
        stmt = stmt.where(cast(Candidate.skills, Text).ilike(f"%{skill}%"))
    if education:
        stmt = stmt.where(cast(Candidate.education, Text).ilike(f"%{education}%"))
    if experience:
        stmt = stmt.where(cast(Candidate.experience, Text).ilike(f"%{experience}%"))

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    total_pages = math.ceil(total / per_page) if total > 0 else 1

    candidates = db.scalars(
        stmt.order_by(Candidate.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    ).all()

    return {
        "candidates": candidates,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
    }


def _format_relative_time(dt: Optional[datetime]) -> str:
    if not dt:
        return "Recently"
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    diff = (now - dt).total_seconds()
    if diff < 60:
        return "Just now"
    if diff < 3600:
        mins = max(1, int(diff // 60))
        return f"{mins} min{'s' if mins > 1 else ''} ago"
    if diff < 86400:
        hours = max(1, int(diff // 3600))
        return f"{hours} hour{'s' if hours > 1 else ''} ago"
    days = max(1, int(diff // 86400))
    return f"{days} day{'s' if days > 1 else ''} ago"


def get_dashboard_stats(db: Session) -> dict[str, Any]:
    # 1. Basic Candidate Status counts
    status_rows = db.execute(
        select(Candidate.status, func.count(Candidate.id))
        .group_by(Candidate.status)
    ).all()
    counts = {status or "none": count for status, count in status_rows}

    total = sum(counts.values())
    pending = counts.get("pending", 0)
    shortlisted = counts.get("shortlisted", 0)
    rejected = counts.get("rejected", 0)
    review = counts.get("review", 0)
    parsed = total - pending

    # 2. Active Job Positions count
    active_job_positions = db.scalar(select(func.count(JobPosition.id))) or 0

    # 3. Shortlisted candidates count
    shortlisted_cnt = db.scalar(select(func.count(ShortlistedCandidate.id))) or 0

    # 4. Interview status counts
    interview_rows = db.execute(
        select(Interview.status, func.count(Interview.id))
        .group_by(Interview.status)
    ).all()
    int_counts = {st or "created": count for st, count in interview_rows}

    total_interviews = sum(int_counts.values())
    int_scheduled = int_counts.get("scheduled", 0)
    int_in_progress = int_counts.get("in_progress", 0) + int_counts.get("started", 0)
    int_completed = int_counts.get("completed", 0)
    # Interviews that have been generated/created but not yet started, answered, or completed.
    int_pending = (
        int_counts.get("created", 0)
        + int_counts.get("pending", 0)
        + int_counts.get("questions_generated", 0)
    )
    # A pending interview is one that has been created but not yet started, in progress, or completed.
    pending_interviews = int_pending

    # 5. Uploads Today
    try:
        today_start_aware = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        today_start_naive = datetime.now().replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        uploads_today = (
            db.scalar(
                select(func.count(Candidate.id)).where(
                    or_(
                        Candidate.created_at >= today_start_aware,
                        Candidate.created_at >= today_start_naive,
                    )
                )
            )
            or 0
        )
    except Exception as e:
        logger.warning(f"Failed to query uploadsToday: {e}")
        uploads_today = 0

    success_rate = round((parsed / total * 100), 1) if total > 0 else 0.0

    # 6. Pipeline breakdown
    # Pipeline stages: applied, shortlisted, interview, selected, rejected
    # Each stage reflects a real, queryable data source:
    #   applied    -> total candidates
    #   shortlisted-> rows in the shortlisted_candidates table
    #   interview  -> distinct candidates that have an interview record
    #   selected   -> distinct candidates that have at least one COMPLETED interview
    #   rejected   -> candidates whose status is "rejected"
    interviewed_cand_ids = db.scalars(select(Interview.candidate_id).distinct()).all()
    interview_stage_count = len(interviewed_cand_ids)

    selected_cand_ids = db.scalars(
        select(Interview.candidate_id).distinct().where(Interview.status == "completed")
    ).all()

    pipeline = {
        "applied": total,
        "shortlisted": shortlisted_cnt,
        "interview": interview_stage_count,
        "selected": len(selected_cand_ids),
        "rejected": rejected,
    }

    # 7. AI Insights & Top Candidate Matches
    candidates_list = db.scalars(select(Candidate)).all()
    job_positions_list = db.scalars(select(JobPosition)).all()

    top_matches = []
    all_match_scores = []
    most_req_skills_map: dict[str, int] = {}
    position_demand_map: dict[str, int] = {}

    for job in job_positions_list:
        job_req = job.required_skills if isinstance(job.required_skills, list) else []
        for s in job_req:
            most_req_skills_map[s] = most_req_skills_map.get(s, 0) + 1

        cand_count_for_job = 0
        for cand in candidates_list:
            match_res = calculate_candidate_match(cand, job)
            score = match_res["overall_match_score"]
            all_match_scores.append(score)
            cand_count_for_job += 1

            # Keep matches with decent score or shortlisted
            if score >= 50 or cand.status == "shortlisted":
                cand_skills = cand.skills if isinstance(cand.skills, list) else []
                # Intersection of candidate skills and job skills
                matched_sk = [sk for sk in cand_skills if any(sk.lower() in r.lower() or r.lower() in sk.lower() for r in job_req)]
                top_matches.append({
                    "candidate_id": cand.id,
                    "candidate_name": cand.full_name or f"Candidate #{cand.id}",
                    "job_title": job.title,
                    "match_score": score,
                    "matched_skills": matched_sk[:4] if matched_sk else cand_skills[:4],
                    "status": cand.status or "shortlisted",
                })
        
        position_demand_map[job.title] = cand_count_for_job

    top_matches.sort(key=lambda x: x["match_score"], reverse=True)
    dedup_top_matches = top_matches[:6]

    # Most requested skills top 5
    sorted_skills = sorted(most_req_skills_map.items(), key=lambda x: x[1], reverse=True)
    top_skills_list = [s[0] for s in sorted_skills[:5]] if sorted_skills else ["Python", "FastAPI", "SQL", "React"]

    # Position with highest demand
    sorted_positions = sorted(position_demand_map.items(), key=lambda x: x[1], reverse=True)
    highest_demand_pos = sorted_positions[0][0] if sorted_positions else (job_positions_list[0].title if job_positions_list else "Software Engineer")

    avg_score = round(sum(all_match_scores) / len(all_match_scores), 1) if all_match_scores else 0.0

    top_candidate_name = dedup_top_matches[0]["candidate_name"] if dedup_top_matches else None
    best_score = dedup_top_matches[0]["match_score"] if dedup_top_matches else 0.0

    recommendations = []
    if top_candidate_name:
        recommendations.append(f"{top_candidate_name} is currently the top matching candidate ({best_score}% match).")
        if dedup_top_matches:
            top_role = dedup_top_matches[0]["job_title"]
            recommendations.append(f"Highly recommended for immediate interview scheduling for the {top_role} role.")
    if highest_demand_pos:
        recommendations.append(f"Highest talent pipeline activity recorded for {highest_demand_pos}.")

    ai_insights = {
        "topCandidate": top_candidate_name,
        "bestMatchScore": best_score,
        "mostRequestedSkills": top_skills_list,
        "highestDemandPosition": highest_demand_pos,
        "averageMatchScore": avg_score,
        "recommendations": recommendations,
    }

    # 8. Recent Activity Feed
    activity_items = []
    act_id = 1

    # Candidate uploads
    recent_candidates = db.scalars(select(Candidate).order_by(Candidate.created_at.desc()).limit(3)).all()
    for c in recent_candidates:
        activity_items.append({
            "id": act_id,
            "type": "upload",
            "message": f"New candidate resume uploaded: {c.full_name or 'Unnamed Candidate'}",
            "time": _format_relative_time(c.created_at),
            "timestamp": c.created_at.isoformat() if c.created_at else datetime.now(timezone.utc).isoformat(),
        })
        act_id += 1

    # Shortlisting events
    recent_shortlists = db.scalars(select(ShortlistedCandidate).order_by(ShortlistedCandidate.created_at.desc()).limit(3)).all()
    for sc in recent_shortlists:
        cand_name = sc.candidate.full_name if sc.candidate and sc.candidate.full_name else f"Candidate #{sc.candidate_id}"
        job_title = sc.job_position.title if sc.job_position and sc.job_position.title else f"Job #{sc.job_position_id}"
        activity_items.append({
            "id": act_id,
            "type": "shortlist",
            "message": f"{cand_name} shortlisted for {job_title}",
            "time": _format_relative_time(sc.created_at),
            "timestamp": sc.created_at.isoformat() if sc.created_at else datetime.now(timezone.utc).isoformat(),
        })
        act_id += 1

    # Job position creations
    recent_jobs = db.scalars(select(JobPosition).order_by(JobPosition.created_at.desc()).limit(2)).all()
    for j in recent_jobs:
        activity_items.append({
            "id": act_id,
            "type": "job",
            "message": f"New job position created: {j.title}",
            "time": _format_relative_time(j.created_at),
            "timestamp": j.created_at.isoformat() if j.created_at else datetime.now(timezone.utc).isoformat(),
        })
        act_id += 1

    # Interview events
    recent_interviews = db.scalars(select(Interview).order_by(Interview.created_at.desc()).limit(2)).all()
    for inv in recent_interviews:
        cand_name = inv.candidate.full_name if inv.candidate and inv.candidate.full_name else f"Candidate #{inv.candidate_id}"
        activity_items.append({
            "id": act_id,
            "type": "interview",
            "message": f"Interview session ({inv.interview_type}) generated for {cand_name}",
            "time": _format_relative_time(inv.created_at),
            "timestamp": inv.created_at.isoformat() if inv.created_at else datetime.now(timezone.utc).isoformat(),
        })
        act_id += 1

    # Sort recent activity descending by timestamp
    activity_items.sort(key=lambda x: x["timestamp"], reverse=True)

    return {
        "totalCandidates": total,
        "activeJobPositions": active_job_positions,
        "shortlistedCandidates": shortlisted_cnt,
        "pendingInterviews": pending_interviews,
        "uploadsToday": uploads_today,
        "parsed": parsed,
        "pending": pending,
        "shortlisted": shortlisted,
        "rejected": rejected,
        "successRate": success_rate,
        "pipeline": pipeline,
        "aiInsights": ai_insights,
        "topCandidateMatches": dedup_top_matches,
        "interviewStatus": {
            "scheduled": int_scheduled,
            "in_progress": int_in_progress,
            "completed": int_completed,
            "pending": int_pending,
        },
        "recentActivity": activity_items[:8],
    }



def upsert_candidate_from_extraction(
    db: Session,
    extracted_data: dict[str, Any],
    resume_text: str,
    resume_file: str,
) -> Candidate:
    """Create a new candidate or update the existing one (matched by email)."""
    email = _normalize_email(extracted_data.get("email"))
    existing = get_candidate_by_email(db, email) if email else None

    create_data = {
        "full_name": extracted_data.get("full_name"),
        "email": email,
        "phone": extracted_data.get("phone"),
        "education": extracted_data.get("education", []),
        "experience": extracted_data.get("experience", []),
        "skills": extracted_data.get("skills", []),
        "projects": extracted_data.get("projects", []),
        "certifications": extracted_data.get("certifications", []),
        "linkedin": extracted_data.get("linkedin"),
        "github": extracted_data.get("github"),
        "resume_file": resume_file,
        "resume_text": resume_text,
        "status": "pending",
    }

    if existing:
        for key, value in create_data.items():
            if key == "status":
                continue
            if value not in (None, "", []):
                setattr(existing, key, value)
        existing.updated_at = datetime.now(timezone.utc)
        try:
            db.commit()
            db.refresh(existing)
        except Exception:
            db.rollback()
            logger.exception("Failed to update candidate from extraction")
            raise
        logger.info(f"Updated existing candidate: {existing.id}")
        return existing

    schema_data = CandidateCreate(**create_data)
    candidate = create_candidate(db, schema_data)
    logger.info(f"Created new candidate: {candidate.id}")
    return candidate
