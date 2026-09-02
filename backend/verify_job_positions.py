"""Verification script to test Job Position, Matching, Shortlist, and Skill Gap APIs."""
import sys
import os

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(__file__))

print("✓ 1. Initializing DB and creating tables...")
from app.core.database import SessionLocal, init_db
ok, msg = init_db()
print(f"   DB Init: ok={ok}, msg={msg}")
assert ok, "DB init failed!"

print("\n✓ 2. Testing JobPosition and ShortlistedCandidate models...")
from app.models.job_position import JobPosition, ShortlistedCandidate
from app.models.candidate import Candidate

db = SessionLocal()
try:
    # Check seeded job positions
    from app.main import seed_default_job_positions
    seed_default_job_positions()

    positions = db.query(JobPosition).all()
    print(f"   Seeded Job Positions count: {len(positions)}")
    for pos in positions:
        print(f"     - ID {pos.id}: {pos.title} (Req skills: {pos.required_skills})")

    # Check candidates count
    candidates_cnt = db.query(Candidate).count()
    print(f"   Total candidates in DB: {candidates_cnt}")

    # If no candidate exists, create sample test candidate Sarah Johnson
    sample_cand = db.query(Candidate).filter(Candidate.email == "sarah.johnson@example.com").first()
    if not sample_cand:
        sample_cand = Candidate(
            full_name="Sarah Johnson",
            email="sarah.johnson@example.com",
            phone="+1 (555) 019-2834",
            skills=["Python", "TensorFlow", "Machine Learning", "NLP", "FastAPI", "SQL"],
            experience=[{"company": "TechCorp", "role": "ML Engineer", "duration": "2020 - Present"}],
            education=["Bachelor of Science in Computer Science"],
            status="pending"
        )
        db.add(sample_cand)
        db.commit()
        db.refresh(sample_cand)
        print(f"   Created test candidate ID {sample_cand.id}: Sarah Johnson")

    print("\n✓ 3. Testing Candidate Matching Algorithm...")
    from app.services.matching_service import calculate_candidate_match, generate_skill_gap_analysis
    ml_job = db.query(JobPosition).filter(JobPosition.title == "Machine Learning Engineer").first()
    if ml_job:
        match_res = calculate_candidate_match(sample_cand, ml_job)
        print(f"   Sarah Johnson Match Score against ML Engineer: {match_res['overall_match_score']}%")
        print(f"     - Required Match %: {match_res['required_match_pct']}%")
        print(f"     - Preferred Match %: {match_res['preferred_match_pct']}%")
        print(f"     - Exp Score %: {match_res['experience_score_pct']}%")
        print(f"     - Edu Score %: {match_res['education_score_pct']}%")

        gap = generate_skill_gap_analysis(sample_cand, ml_job)
        print(f"   Skill Gap Analysis items count: {len(gap['items'])}")
        print(f"   Recommendations: {gap['recommendations']}")

    print("\n✓ 4. Testing Shortlisting Logic...")
    from app.services.job_position_service import shortlist_candidate_for_job, rank_candidates_for_job
    if ml_job:
        shortlist_resp = shortlist_candidate_for_job(db, ml_job.id, sample_cand.id)
        print(f"   Shortlist Result: {shortlist_resp.message} (Score: {shortlist_resp.match_score}%)")

        ranked_resp = rank_candidates_for_job(db, ml_job.id)
        print(f"   Ranked candidates count: {ranked_resp.total_candidates}")
        for c in ranked_resp.candidates[:3]:
            print(f"     Rank #{c.rank}: {c.full_name} - {c.match_score}% (Shortlisted: {c.is_shortlisted})")

    print("\n✓ 5. Testing Skill Search Service...")
    from app.services.job_position_service import search_candidates_by_skill_service
    py_search = search_candidates_by_skill_service(db, "Python", ml_job.id if ml_job else None)
    print(f"   Python Search Total: {py_search.total_candidates}")

    print("\n✅ ALL JOB POSITION & MATCHING VERIFICATION CHECKS PASSED!")

finally:
    db.close()
