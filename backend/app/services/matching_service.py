import re
from typing import Any, Dict, List, Tuple
from app.models.candidate import Candidate
from app.models.job_position import JobPosition


def _normalize_skill(skill: str) -> str:
    """Normalize a skill string for case-insensitive exact and fuzzy matching."""
    return re.sub(r"[^\w\s\+\#]", "", skill.strip().lower())


def extract_candidate_skills_set(candidate: Candidate) -> set[str]:
    """Get all normalized candidate skills from structured JSON and resume text."""
    skills_set: set[str] = set()

    if candidate.skills and isinstance(candidate.skills, list):
        for s in candidate.skills:
            if isinstance(s, str) and s.strip():
                skills_set.add(_normalize_skill(s))

    # Also search resume text for additional skills
    resume_text_lower = (candidate.resume_text or "").lower()
    return skills_set, resume_text_lower


def extract_total_experience_years(candidate: Candidate) -> float:
    """Estimate candidate's total years of experience from experience JSON or resume text."""
    if not candidate.experience or not isinstance(candidate.experience, list):
        # Check text fallback for patterns like "X years of experience"
        text = candidate.resume_text or ""
        match = re.search(r"(\d+)\+?\s*years?\s+(?:of\s+)?experience", text, re.IGNORECASE)
        if match:
            return float(match.group(1))
        return 0.0

    total_months = 0
    # Try parsing duration strings like "2020 - 2023", "3 years", "Jan 2019 - Present"
    for item in candidate.experience:
        if isinstance(item, dict):
            duration = str(item.get("duration", ""))
        else:
            duration = str(item)

        if not duration:
            total_months += 12  # default 1 year per entry if unspecified
            continue

        # Pattern: "X years" or "X yrs"
        yrs_match = re.search(r"(\d+)\s*(?:years?|yrs?)", duration, re.IGNORECASE)
        if yrs_match:
            total_months += int(yrs_match.group(1)) * 12
            continue

        # Pattern: "YYYY - YYYY" or "YYYY - Present"
        years_range = re.findall(r"\b(20\d{2}|19\d{2})\b", duration)
        if len(years_range) == 2:
            y1, y2 = int(years_range[0]), int(years_range[1])
            diff = max(1, y2 - y1)
            total_months += diff * 12
            continue
        elif len(years_range) == 1 and ("present" in duration.lower() or "now" in duration.lower()):
            from datetime import datetime
            current_year = datetime.now().year
            y1 = int(years_range[0])
            diff = max(1, current_year - y1)
            total_months += diff * 12
            continue

        # Default fallback per experience entry
        total_months += 12

    return round(total_months / 12.0, 1)


def calculate_candidate_match(candidate: Candidate, job: JobPosition) -> Dict[str, Any]:
    """
    Calculate candidate matching score against a JobPosition using configured weights:
    - Required Skills: 60%
    - Preferred Skills: 15%
    - Minimum Experience: 15%
    - Education: 10%
    """
    skills_set, resume_text_lower = extract_candidate_skills_set(candidate)

    # 1. Required Skills Score (60%)
    req_skills = job.required_skills or []
    matching_req_skills = []
    missing_req_skills = []

    if not req_skills:
        req_score = 100.0
    else:
        matched_count = 0
        for r_skill in req_skills:
            norm_r = _normalize_skill(r_skill)
            if norm_r in skills_set or re.search(rf"\b{re.escape(norm_r)}\b", resume_text_lower):
                matched_count += 1
                matching_req_skills.append(r_skill)
            else:
                missing_req_skills.append(r_skill)
        req_score = (matched_count / len(req_skills)) * 100.0

    # 2. Preferred Skills Score (15%)
    pref_skills = job.preferred_skills or []
    matching_pref_skills = []
    missing_pref_skills = []

    if not pref_skills:
        pref_score = 100.0
    else:
        matched_pref_count = 0
        for p_skill in pref_skills:
            norm_p = _normalize_skill(p_skill)
            if norm_p in skills_set or re.search(rf"\b{re.escape(norm_p)}\b", resume_text_lower):
                matched_pref_count += 1
                matching_pref_skills.append(p_skill)
            else:
                missing_pref_skills.append(p_skill)
        pref_score = (matched_pref_count / len(pref_skills)) * 100.0

    # 3. Minimum Experience Score (15%)
    candidate_exp_years = extract_total_experience_years(candidate)
    min_exp = job.minimum_experience or 0
    if min_exp == 0 or candidate_exp_years >= min_exp:
        exp_score = 100.0
    else:
        exp_score = (candidate_exp_years / min_exp) * 100.0 if min_exp > 0 else 100.0

    # 4. Education Score (10%)
    job_edu = (job.education or "").lower()
    candidate_edu_list = candidate.education if isinstance(candidate.education, list) else []
    candidate_edu_str = " ".join(candidate_edu_list).lower() if candidate_edu_list else (candidate.resume_text or "").lower()

    if not job_edu or job_edu in ["none", "any", "not required"]:
        edu_score = 100.0
    elif "master" in job_edu or "ms" in job_edu or "m.tech" in job_edu:
        if "master" in candidate_edu_str or "ms" in candidate_edu_str or "m.tech" in candidate_edu_str or "phd" in candidate_edu_str:
            edu_score = 100.0
        elif "bachelor" in candidate_edu_str or "bs" in candidate_edu_str or "b.tech" in candidate_edu_str:
            edu_score = 75.0
        else:
            edu_score = 50.0
    elif "bachelor" in job_edu or "bs" in job_edu or "b.tech" in job_edu or "degree" in job_edu:
        if any(term in candidate_edu_str for term in ["bachelor", "bs", "b.tech", "master", "ms", "degree"]):
            edu_score = 100.0
        elif candidate_edu_list:
            edu_score = 70.0
        else:
            edu_score = 50.0
    else:
        edu_score = 80.0 if candidate_edu_list else 50.0

    # Total Weighted Score
    total_match_score = round(
        (req_score * 0.60) + (pref_score * 0.15) + (exp_score * 0.15) + (edu_score * 0.10),
        1
    )
    total_match_score = max(0.0, min(100.0, total_match_score))

    return {
        "overall_match_score": total_match_score,
        "required_match_pct": round(req_score, 1),
        "preferred_match_pct": round(pref_score, 1),
        "experience_score_pct": round(exp_score, 1),
        "education_score_pct": round(edu_score, 1),
        "candidate_experience_years": candidate_exp_years,
        "matching_req_skills": matching_req_skills,
        "missing_req_skills": missing_req_skills,
        "matching_pref_skills": matching_pref_skills,
        "missing_pref_skills": missing_pref_skills,
    }


def generate_skill_gap_analysis(candidate: Candidate, job: JobPosition) -> Dict[str, Any]:
    """Generate detailed breakdown of matching, partial, and missing skills with recommendations."""
    match_result = calculate_candidate_match(candidate, job)

    gap_items: List[Dict[str, Any]] = []

    # Required skills
    for skill in job.required_skills or []:
        if skill in match_result["matching_req_skills"]:
            gap_items.append({
                "skill_name": skill,
                "status": "matching",
                "category": "required",
                "level": "Advanced"
            })
        else:
            gap_items.append({
                "skill_name": skill,
                "status": "missing",
                "category": "required",
                "level": "Required"
            })

    # Preferred skills
    for skill in job.preferred_skills or []:
        if skill in match_result["matching_pref_skills"]:
            gap_items.append({
                "skill_name": skill,
                "status": "matching",
                "category": "preferred",
                "level": "Intermediate"
            })
        else:
            gap_items.append({
                "skill_name": skill,
                "status": "partial",
                "category": "preferred",
                "level": "Basic"
            })

    # Build recommendations
    recommendations: List[str] = []
    missing_req = match_result["missing_req_skills"]
    missing_pref = match_result["missing_pref_skills"]

    if not missing_req and not missing_pref:
        recommendations.append("Candidate fully matches all required and preferred skills for this position.")
    else:
        if missing_req:
            recommendations.append(
                f"Candidate matches core requirements but needs upskilling in essential skills: {', '.join(missing_req[:3])}."
            )
        if missing_pref:
            recommendations.append(
                f"Consider training or certifications in preferred technologies: {', '.join(missing_pref[:3])}."
            )
        if match_result["candidate_experience_years"] < (job.minimum_experience or 0):
            recommendations.append(
                f"Candidate has {match_result['candidate_experience_years']} years of experience, slightly below the {job.minimum_experience} years requirement."
            )

    return {
        "candidate_id": candidate.id,
        "candidate_name": candidate.full_name or "Unnamed Candidate",
        "job_position_id": job.id,
        "job_title": job.title,
        "overall_match_score": match_result["overall_match_score"],
        "matching_skills_count": len(match_result["matching_req_skills"]) + len(match_result["matching_pref_skills"]),
        "missing_skills_count": len(match_result["missing_req_skills"]) + len(match_result["missing_pref_skills"]),
        "items": gap_items,
        "recommendations": recommendations,
    }
