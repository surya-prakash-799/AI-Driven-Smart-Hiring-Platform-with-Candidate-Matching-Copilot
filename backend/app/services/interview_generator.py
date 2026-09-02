import random
from typing import Optional

from loguru import logger
from sqlalchemy.orm import Session

from app.models.candidate import Candidate
from app.models.interview import InterviewQuestion
from app.models.job_position import JobPosition
from app.services.interview_service import add_question, add_answer, create_interview


def _get_candidate_skills(candidate: Candidate) -> list[str]:
    """Extract candidate skills as a list."""
    if candidate.skills and isinstance(candidate.skills, list):
        return [str(s) for s in candidate.skills]
    return []


def _get_candidate_experience_info(candidate: Candidate) -> dict:
    """Extract experience info from candidate."""
    info = {"roles": [], "companies": [], "duration": ""}
    if candidate.experience and isinstance(candidate.experience, list):
        for exp in candidate.experience:
            if isinstance(exp, dict):
                if exp.get("role"):
                    info["roles"].append(str(exp["role"]))
                if exp.get("company"):
                    info["companies"].append(str(exp["company"]))
                if exp.get("duration"):
                    info["duration"] = str(exp["duration"])
    return info


def _get_job_skills(job: JobPosition) -> dict:
    """Extract job required and preferred skills."""
    required = job.required_skills if job.required_skills and isinstance(job.required_skills, list) else []
    preferred = job.preferred_skills if job.preferred_skills and isinstance(job.preferred_skills, list) else []
    return {"required": [str(s) for s in required], "preferred": [str(s) for s in preferred]}


def _generate_technical_questions(
    skills: list[str], job_skills: dict, difficulty: str, count: int
) -> list[dict]:
    """Generate technical interview questions based on skills."""
    questions = []

    # Skills-based technical questions
    skill_templates = [
        "How have you used {skill} in your previous projects? Can you walk me through a specific example?",
        "Can you explain the core concepts of {skill} that you consider essential for this role?",
        "Describe a challenging problem you solved using {skill}. What was your approach?",
        "How would you rate your proficiency in {skill} on a scale of 1-10? What would you do to improve?",
        "Can you compare {skill} with alternative technologies? When would you choose {skill} over others?",
        "How do you ensure code quality and best practices when working with {skill}?",
        "Explain how {skill} integrates with other technologies in a typical production environment.",
        "What are the common pitfalls or anti-patterns you've seen when using {skill}?",
    ]

    # Use candidate's actual skills
    candidate_skills = [s for s in skills if s.lower() in [js.lower() for js in job_skills.get("required", [])]]
    if not candidate_skills:
        candidate_skills = skills[:5]  # Fallback to first 5 skills

    for i, skill in enumerate(candidate_skills[:count]):
        template = skill_templates[i % len(skill_templates)]
        questions.append({
            "question": template.format(skill=skill),
            "category": "Technical",
            "skill": skill,
            "difficulty": difficulty,
        })

    # Fill remaining with general technical questions
    general_technical = [
        "Can you walk me through your software development lifecycle and methodology?",
        "How do you approach debugging complex issues in production environments?",
        "Describe your experience with version control systems and collaboration workflows.",
        "How do you stay updated with the latest technologies and industry trends?",
        "Can you explain a time when you had to optimize code for better performance?",
        "How do you approach writing unit tests and integration tests?",
        "Describe your experience with CI/CD pipelines and deployment practices.",
        "How do you handle technical debt in a project?",
        "Explain your approach to API design and documentation.",
        "How do you ensure security best practices in your development work?",
    ]

    remaining = count - len(questions)
    for i in range(remaining):
        questions.append({
            "question": general_technical[i % len(general_technical)],
            "category": "Technical",
            "skill": "General",
            "difficulty": difficulty,
        })

    return questions[:count]


def _generate_behavioral_questions(difficulty: str, count: int) -> list[dict]:
    """Generate behavioral interview questions."""
    behavioral = [
        "Tell me about a time when you had to work under a tight deadline. How did you manage it?",
        "Describe a situation where you had a disagreement with a team member. How did you resolve it?",
        "Can you give an example of when you had to learn a new skill quickly? How did you approach it?",
        "Tell me about a project you are most proud of. What made it successful?",
        "How do you handle prioritization when you have multiple tasks with competing deadlines?",
        "Describe a time when you received critical feedback. How did you respond?",
        "Can you share an example of when you went above and beyond your job responsibilities?",
        "How do you handle stress and pressure in the workplace?",
        "Tell me about a time when you had to adapt to a significant change at work.",
        "Describe your ideal work environment and management style.",
        "How do you ensure effective communication within your team?",
        "Can you give an example of a leadership experience you have had?",
    ]

    return [
        {
            "question": q,
            "category": "Behavioral",
            "skill": "Soft Skills",
            "difficulty": difficulty,
        }
        for q in random.sample(behavioral, min(count, len(behavioral)))
    ]


def _generate_project_based_questions(candidate: Candidate, difficulty: str, count: int) -> list[dict]:
    """Generate project-based questions from candidate's project experience."""
    projects = candidate.projects if candidate.projects and isinstance(candidate.projects, list) else []

    questions = []
    project_templates = [
        "Can you walk me through the architecture of the {project} project? What decisions did you make and why?",
        "What were the biggest technical challenges you faced while building {project}? How did you overcome them?",
        "If you could restart the {project} project today, what would you do differently?",
        "How did you ensure the quality and reliability of {project}?",
        "What technologies and tools did you use in {project}? Why did you choose them?",
    ]

    for i, project in enumerate(projects[:count]):
        project_name = str(project) if isinstance(project, str) else f"project #{i+1}"
        template = project_templates[i % len(project_templates)]
        questions.append({
            "question": template.format(project=project_name),
            "category": "Project Based",
            "skill": "Projects",
            "difficulty": difficulty,
        })

    # Fill with general project questions
    general_project = [
        "Describe your approach to breaking down a large project into manageable tasks.",
        "How do you handle scope creep in projects you are working on?",
        "What project management methodologies have you used? Which do you prefer and why?",
        "How do you approach code reviews and collaborative development?",
        "Describe a time when a project did not go as planned. What did you learn?",
    ]

    remaining = count - len(questions)
    for i in range(remaining):
        questions.append({
            "question": general_project[i % len(general_project)],
            "category": "Project Based",
            "skill": "Projects",
            "difficulty": difficulty,
        })

    return questions[:count]


def _generate_experience_based_questions(candidate: Candidate, difficulty: str, count: int) -> list[dict]:
    """Generate experience-based questions from candidate's work history."""
    exp_info = _get_candidate_experience_info(candidate)
    roles = exp_info.get("roles", [])
    companies = exp_info.get("companies", [])

    questions = []
    if roles and companies:
        templates = [
            "Tell me about your experience as a {role}. What were your key responsibilities?",
            "What was the most impactful project you worked on at {company}? Describe your role and contribution.",
            "How did your experience at {company} prepare you for this role?",
            "What skills did you develop during your time as a {role} that are relevant to this position?",
        ]
        for i in range(min(count, len(roles))):
            template = templates[i % len(templates)]
            questions.append({
                "question": template.format(
                    role=roles[i] if i < len(roles) else "developer",
                    company=companies[i] if i < len(companies) else "your previous company"
                ),
                "category": "Experience Based",
                "skill": "Experience",
                "difficulty": difficulty,
            })

    # Fill with general experience questions
    general_exp = [
        "What motivated you to apply for this position?",
        "Where do you see yourself in 5 years?",
        "What are your greatest strengths and how do they apply to this role?",
        "What is your greatest weakness and how are you working to improve it?",
        "How do your skills and experience align with the requirements of this position?",
        "What type of work environment do you thrive in?",
    ]

    remaining = count - len(questions)
    for i in range(remaining):
        questions.append({
            "question": general_exp[i % len(general_exp)],
            "category": "Experience Based",
            "skill": "Experience",
            "difficulty": difficulty,
        })

    return questions[:count]


def _generate_skill_based_questions(skills: list[str], job_skills: dict, difficulty: str, count: int) -> list[dict]:
    """Generate skill-focused interview questions."""
    all_skills = list(set(skills + job_skills.get("required", []) + job_skills.get("preferred", [])))
    skill_focused = [
        "Can you demonstrate your knowledge of {skill} with a practical example or code walkthrough?",
        "How would you explain {skill} to a junior developer who is just getting started?",
        "What are the most important best practices for working with {skill}?",
        "Can you describe a production system you built or maintained using {skill}?",
        "What tools and libraries do you typically use alongside {skill}?",
        "How do you troubleshoot issues when working with {skill}?",
        "What are the limitations of {skill} and how would you work around them?",
        "How would you design a system that heavily relies on {skill}?",
    ]

    questions = []
    for i, skill in enumerate(all_skills[:count]):
        template = skill_focused[i % len(skill_focused)]
        questions.append({
            "question": template.format(skill=skill),
            "category": "Skill Based",
            "skill": skill,
            "difficulty": difficulty,
        })

    return questions[:count]


def generate_interview_questions(
    db: Session,
    candidate_id: int,
    job_position_id: int,
    interview_type: str,
    difficulty: str,
    number_of_questions: int,
) -> Optional[dict]:
    """
    Generate personalized interview questions based on candidate profile and job position.
    Returns interview data with questions.
    """
    # Fetch candidate and job position
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    job = db.query(JobPosition).filter(JobPosition.id == job_position_id).first()

    if not candidate or not job:
        logger.error(f"Candidate {candidate_id} or Job Position {job_position_id} not found")
        return None

    # Create interview record
    interview = create_interview(db, candidate_id, job_position_id, interview_type, difficulty)

    # Extract data for question generation
    candidate_skills = _get_candidate_skills(candidate)
    job_skills = _get_job_skills(job)
    interview_types = [t.strip().lower() for t in interview_type.split("+")]

    # Determine question distribution based on interview type
    all_questions = []
    type_lower = interview_type.lower()

    if "technical" in type_lower:
        tech_count = max(number_of_questions // 3, 2)
        all_questions.extend(_generate_technical_questions(candidate_skills, job_skills, difficulty, tech_count))

    if "behavioral" in type_lower or "hr" in type_lower:
        behav_count = max(number_of_questions // 4, 2)
        all_questions.extend(_generate_behavioral_questions(difficulty, behav_count))

    if "project" in type_lower:
        proj_count = max(number_of_questions // 4, 1)
        all_questions.extend(_generate_project_based_questions(candidate, difficulty, proj_count))

    if "experience" in type_lower:
        exp_count = max(number_of_questions // 4, 1)
        all_questions.extend(_generate_experience_based_questions(candidate, difficulty, exp_count))

    if "skill" in type_lower:
        skill_count = max(number_of_questions // 3, 2)
        all_questions.extend(_generate_skill_based_questions(candidate_skills, job_skills, difficulty, skill_count))

    # If no specific type matched or need more questions, add mix
    if len(all_questions) < number_of_questions:
        remaining = number_of_questions - len(all_questions)
        all_questions.extend(_generate_technical_questions(candidate_skills, job_skills, difficulty, remaining))

    # Trim to exact count and shuffle
    all_questions = all_questions[:number_of_questions]
    random.shuffle(all_questions)

    # Save questions to database
    saved_questions = []
    for i, q in enumerate(all_questions, 1):
        question = add_question(
            db,
            interview_id=interview.id,
            question_text=q["question"],
            category=q["category"],
            skill=q.get("skill"),
            difficulty=q["difficulty"],
            question_order=i,
        )
        saved_questions.append(question)

    # Update interview status
    interview.status = "questions_generated"
    db.commit()

    logger.info(f"Generated {len(saved_questions)} questions for interview {interview.id}")

    return {
        "interview_id": interview.id,
        "candidate_name": candidate.full_name or "Unknown",
        "job_title": job.title,
        "interview_type": interview_type,
        "difficulty": difficulty,
        "total_questions": len(saved_questions),
        "questions": saved_questions,
    }


def evaluate_answer(
    db: Session,
    question_id: int,
    answer_text: str,
) -> Optional[dict]:
    """
    Evaluate an interview answer and provide feedback.
    Uses rule-based scoring since we don't have an actual AI service.
    """
    # Get the question
    question = db.query(InterviewQuestion).filter(InterviewQuestion.id == question_id).first()
    if not question:
        return None

    # Simple rule-based evaluation
    answer_length = len(answer_text.strip())
    word_count = len(answer_text.split())

    # Base score based on answer completeness
    score = 50.0  # Base score
    feedback_parts = []

    # Length scoring
    if answer_length > 200:
        score += 15
        feedback_parts.append("Good detailed response")
    elif answer_length > 100:
        score += 10
        feedback_parts.append("Adequate response length")
    elif answer_length < 50:
        score -= 10
        feedback_parts.append("Response could be more detailed")

    # Word count scoring
    if word_count > 50:
        score += 10
        feedback_parts.append("Comprehensive answer")
    elif word_count > 20:
        score += 5
        feedback_parts.append("Moderate detail level")

    # Check for relevant keywords based on category
    answer_lower = answer_text.lower()
    question_lower = question.question.lower()
    skill_lower = (question.skill or "").lower()

    # Check if answer mentions the skill/topic
    if skill_lower and skill_lower in answer_lower:
        score += 10
        feedback_parts.append(f"Directly addressed the {question.skill} topic")

    # Check for technical keywords
    tech_keywords = ["implemented", "developed", "designed", "optimized", "tested", "deployed",
                     "architecture", "solution", "approach", "methodology", "best practice"]
    tech_count = sum(1 for kw in tech_keywords if kw in answer_lower)
    if tech_count >= 3:
        score += 10
        feedback_parts.append("Good use of technical terminology")
    elif tech_count >= 1:
        score += 5

    # Check for structure indicators
    structure_keywords = ["first", "second", "additionally", "finally", "for example",
                         "in conclusion", "specifically", "however"]
    struct_count = sum(1 for kw in structure_keywords if kw in answer_lower)
    if struct_count >= 2:
        score += 5
        feedback_parts.append("Well-structured response")

    # Cap score between 0-100
    score = max(0, min(100, score))

    # Generate feedback
    if not feedback_parts:
        feedback_parts.append("Consider providing more specific examples and details")

    feedback = ". ".join(feedback_parts) + f". Overall score: {score}/100"

    # Save answer
    answer = add_answer(db, question_id, answer_text, score, feedback)

    return {
        "answer_id": answer.id,
        "question_id": question_id,
        "score": score,
        "feedback": feedback,
    }
