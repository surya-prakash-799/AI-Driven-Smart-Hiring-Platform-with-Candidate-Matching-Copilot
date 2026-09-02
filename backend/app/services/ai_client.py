"""Google Gemini client used by the AI interview features.

Prefer the official `google-genai` Python SDK when installed; otherwise fall
back to the raw REST API via httpx. The API key is read from backend settings
(GEMINI_API_KEY) and is never exposed to the frontend.
"""
import json
import re
from typing import Optional

from loguru import logger

from app.core.config import get_settings

_settings = get_settings()

try:  # pragma: no cover - import availability check
    from google import genai as _genai
    from google.genai import types as _genai_types

    _GENAI_SDK = True
except ImportError:  # pragma: no cover
    _GENAI_SDK = False
    import httpx


class AIError(Exception):
    """Raised when the AI provider cannot produce a usable result.

    ``status_code`` lets callers map the failure to the correct HTTP response.
    A missing API key is a server configuration problem (503); genuine provider
    failures are gateway/upstream problems (502).
    """

    def __init__(self, message: str, status_code: int = 502) -> None:
        super().__init__(message)
        self.status_code = status_code


def _extract_questions(text: str) -> list[str]:
    """Parse generated question text, tolerating numbered/bulleted lists or plain line splits."""
    if not text or not text.strip():
        return []

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    questions: list[str] = []

    for raw in lines:
        if re.match(r"^[-*_=.]{2,}$", raw):
            continue
        cleaned = re.sub(r"^\s*(?:\d+[\.\)\]\-]|\(\d+\)|[-*•])\s*", "", raw).strip().strip('"').strip("'")
        if not cleaned:
            continue
        
        is_numbered = bool(re.match(r"^\s*(?:\d+[\.\)\]\-]|\(\d+\)|[-*•])\s*", raw))
        is_question_phrase = bool(re.match(r"^(what|how|why|describe|can|tell|explain|give|where|when|which|who|design|implement|have)\b", cleaned, re.I))
        
        if is_numbered or not questions or raw.endswith("?") or is_question_phrase:
            questions.append(cleaned)
        else:
            # Continuation of the previous question
            questions[-1] = f"{questions[-1]} {cleaned}"

    return questions[:30]



def _call_gemini(prompt: str, *, temperature: float = 0.7, max_tokens: int = 1024) -> str:
    """Call Gemini and return the response text. Uses the official SDK when available."""
    api_key = _settings.GEMINI_API_KEY
    if not api_key:
        raise AIError(
            "Gemini API key is not configured. Set GEMINI_API_KEY in backend/.env.",
            status_code=503,
        )

    if _GENAI_SDK:
        return _call_gemini_sdk(api_key, prompt, temperature=temperature, max_tokens=max_tokens)

    return _call_gemini_rest(api_key, prompt, temperature=temperature, max_tokens=max_tokens)


def _call_gemini_sdk(api_key: str, prompt: str, *, temperature: float, max_tokens: int) -> str:
    """Use the official `google-genai` SDK to call the model."""
    logger.info(f"Gemini request started (model={_settings.GEMINI_MODEL}, temperature={temperature}, max_tokens={max_tokens}).")
    try:
        client = _genai.Client(api_key=api_key)
        config = _genai_types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
        )
        logger.info(f"Gemini model used: {_settings.GEMINI_MODEL}")
        response = client.models.generate_content(
            model=_settings.GEMINI_MODEL,
            contents=prompt,
            config=config,
        )
    except Exception as e:  # noqa: BLE001 - surface friendly errors for all SDK failures
        logger.error(f"Gemini request failed: {type(e).__name__}: {e}")
        raise _sdk_error(e)

    text = (response.text or "").strip()
    if not text:
        logger.warning("Gemini SDK returned empty text.")
        raise AIError(
            "The AI service returned an empty response. Please try again."
        )
    return text


def _sdk_error(exc: Exception) -> AIError:
    """Map common google-genai SDK exceptions to friendly AIError messages."""
    name = type(exc).__name__.lower()
    text = str(exc)
    low = text.lower()
    if "deadline" in name or "timeout" in low:
        return AIError(
            "The AI service timed out. Please try again in a moment."
        )
    if "apikey_invalid" in low or "api_key_invalid" in low:
        return AIError(
            "The configured Gemini API key is invalid. Update GEMINI_API_KEY in backend/.env.",
        )
    if "permission" in name or "forbidden" in low or "unauthorized" in low:
        return AIError(
            "The AI service rejected the request. Check that GEMINI_API_KEY is correct "
            "and enabled for this model."
        )
    if "ratelimit" in low or "quota" in low or "429" in text or "resource_exhausted" in low:
        return AIError(
            "The AI service is rate limited. Please wait a moment and try again."
        )
    if "not_found" in low or "404" in text or "is not found" in low or "no longer available" in low:
        return AIError(
            "The configured Gemini model is not available. It may have been retired. "
            "Set a supported model via GEMINI_MODEL in backend/.env "
            f"(currently '{_settings.GEMINI_MODEL}')."
        )
    if "service_unavailable" in low or "503" in text or "high demand" in low:
        return AIError(
            "The AI service is temporarily unavailable. Please try again in a moment."
        )
    if "invalid_argument" in low or "400" in text:
        return AIError(
            "The AI service rejected the request. Check that GEMINI_API_KEY and "
            "GEMINI_MODEL are correct."
        )
    if "permission_denied" in low:
        return AIError(
            "The AI service denied access. Check that GEMINI_API_KEY is enabled and "
            "billing is active."
        )
    if "safety" in low or "blocked" in low or "finish_reason" in low or "blocksafe" in low:
        return AIError(
            "The AI service blocked the request for content-safety reasons. "
            "Try adjusting the prompt or interview type."
        )
    return AIError(
        "The AI service returned an error. Please try again later."
    )


def _call_gemini_rest(api_key: str, prompt: str, *, temperature: float, max_tokens: int) -> str:
    """Fallback path: call the Gemini generateContent REST endpoint via httpx."""
    import httpx

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{_settings.GEMINI_MODEL}:generateContent"
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
        },
    }

    try:
        with httpx.Client(timeout=_settings.AI_TIMEOUT_SECONDS) as client:
            resp = client.post(
                url,
                params={"key": api_key},
                headers={"Content-Type": "application/json"},
                json=payload,
            )
    except httpx.TimeoutException:
        logger.error("Gemini API request timed out.")
        raise AIError(
            "The AI service timed out. Please try again in a moment."
        )
    except httpx.HTTPError as e:
        logger.error(f"Gemini API connection error: {e}")
        raise AIError(
            "Could not reach the AI service. Please check your network and try again."
        )

    if resp.status_code != 200:
        logger.error(f"Gemini API returned {resp.status_code}: {resp.text[:500]}")
        if resp.status_code in (400, 403):
            raise AIError(
                "The AI service rejected the request. Check that GEMINI_API_KEY is correct "
                "and enabled for this model."
            )
        if resp.status_code == 429:
            raise AIError(
                "The AI service is rate limited. Please wait a moment and try again."
            )
        raise AIError(
            "The AI service returned an error. Please try again later."
        )

    try:
        data = resp.json()
        parts = data["candidates"][0]["content"]["parts"]
        return "".join(p.get("text", "") for p in parts).strip()
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        logger.error(f"Could not parse Gemini response: {e}")
        raise AIError(
            "The AI service returned an empty or invalid response. Please try again."
        )


def generate_questions_for_job(
    job_title: str,
    job_description: str,
    required_skills: list[str],
    preferred_skills: list[str],
    interview_type: str,
    count: int = 5,
) -> list[str]:
    """Generate interview questions for a job position alone (no candidate)."""
    required = ", ".join(required_skills) or "Not specified"
    preferred = ", ".join(preferred_skills) or "Not specified"
    description = job_description or "Not specified"

    prompt = f"""You are an expert technical recruiter and interview coach.

Generate exactly {count} relevant interview questions for the following job position.
Base the questions strictly on the job's title, description, required skills and preferred skills.
Do not invent generic questions; ground every question in the role.

JOB TITLE: {job_title}
JOB DESCRIPTION: {description}
REQUIRED SKILLS: {required}
PREFERRED SKILLS: {preferred}
INTERVIEW TYPE: {interview_type}

Return ONLY the list of questions. One question per line. Number them 1. 2. 3. ...
Do not add any commentary, headings or explanations."""

    raw = _call_gemini(prompt, temperature=0.7, max_tokens=1024)
    questions = _extract_questions(raw)

    fallback_qs = [
        f"What core technical principles and design patterns do you rely on for {job_title} development?",
        f"How do you design and optimize scalable systems using {required_skills[0] if required_skills else 'core skills'}?",
        f"Can you walk us through your debugging process when encountering an elusive bug in production?",
        f"How do you ensure data integrity, system security, and performance under high load?",
        f"How do you collaborate with cross-functional product and engineering teams during sprint cycles?",
    ]
    for fb in fallback_qs:
        if len(questions) >= count:
            break
        if fb not in questions:
            questions.append(fb)

    return questions[:count]


def generate_simulation_questions(
    job_title: str,
    job_description: str,
    required_skills: list[str],
    preferred_skills: list[str],
    interview_type: str,
    candidate_name: str,
    candidate_skills: list[str],
    candidate_education: list[str],
    candidate_experience: list[str],
    candidate_projects: list[str],
    candidate_certifications: list[str],
    count: int = 5,
) -> list[str]:
    """Generate personalized interview questions grounded in BOTH the job and the candidate profile."""
    candidate_block = (
        "CANDIDATE PROFILE:\n"
        f"NAME: {candidate_name or 'The candidate'}\n"
        f"SKILLS: {', '.join(candidate_skills) or 'Not provided'}\n"
        f"EDUCATION: {', '.join(candidate_education) or 'Not provided'}\n"
        f"EXPERIENCE: {', '.join(candidate_experience) or 'Not provided'}\n"
        f"PROJECTS: {', '.join(candidate_projects) or 'Not provided'}\n"
        f"CERTIFICATIONS: {', '.join(candidate_certifications) or 'Not provided'}"
    )

    prompt = f"""You are an expert interviewer conducting a personalized {interview_type} interview.

JOB DETAILS:
TITLE: {job_title}
DESCRIPTION: {job_description or 'Not specified'}
REQUIRED SKILLS: {', '.join(required_skills) or 'Not specified'}
PREFERRED SKILLS: {', '.join(preferred_skills) or 'Not specified'}

{candidate_block}

Generate exactly {count} personalized interview questions.
The questions must be grounded in BOTH the job requirements AND the candidate's actual profile.
For example, reference the candidate's specific projects, technologies, experience, or certifications.
Do NOT generate completely generic questions when candidate information is available.

Return ONLY the list of questions. One question per line. Number them 1. 2. 3. ...
Do not add any commentary, headings or explanations."""

    raw = _call_gemini(prompt, temperature=0.7, max_tokens=1024)
    questions = _extract_questions(raw)

    fallback_sim_qs = [
        f"Can you walk me through your background and how your experience prepares you for the {job_title} role?",
        f"How do you apply your expertise in {candidate_skills[0] if candidate_skills else 'your key skills'} to solve complex challenges?",
        f"Describe a key technical project you worked on recently, your specific role, and the technical decisions you made.",
        f"How do you handle technical disagreements, project trade-offs, or tight delivery deadlines with your team?",
        f"What motivates you about this position, and where do you see your technical impact in the coming year?",
    ]
    for fb in fallback_sim_qs:
        if len(questions) >= count:
            break
        if fb not in questions:
            questions.append(fb)

    return questions[:count]



def evaluate_answer_ai(
    question: str,
    candidate_name: str,
    job_title: str,
    answer: str,
    interview_type: str,
) -> dict:
    """Ask Gemini to score and provide feedback on a candidate's interview answer."""
    prompt = f"""You are an expert interviewer evaluating a candidate's answer during a {interview_type} interview.

CANDIDATE: {candidate_name or 'The candidate'}
JOB POSITION: {job_title}
QUESTION: {question}

CANDIDATE'S ANSWER:
\"\"\"
{answer}
\"\"\"

Evaluate the answer on:
1. Relevance to the question
2. Depth and specificity
3. Clarity and structure

Return your evaluation as JSON with exactly these keys:
- "score": an integer from 0 to 100
- "feedback": 2-3 sentences of constructive feedback

Return ONLY the JSON object. No markdown, no extra text."""

    raw = _call_gemini(prompt, temperature=0.3, max_tokens=512)

    # Tolerate markdown fences
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        data = json.loads(cleaned)
        score = int(data.get("score", 50))
        feedback = str(data.get("feedback", ""))
    except (json.JSONDecodeError, TypeError, ValueError):
        logger.warning(f"Gemini evaluation was not valid JSON; got: {raw[:300]}")
        raise AIError(
            "Could not evaluate the answer with the AI service. Please try again."
        )

    score = max(0, min(100, score))
    if not feedback.strip():
        feedback = "The AI did not provide detailed feedback. Practice to improve."

    return {"score": score, "feedback": feedback}
