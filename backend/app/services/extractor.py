import re
from typing import Any

from loguru import logger

from app.utils.regex_helper import (
    EDUCATION_KEYWORDS,
    EXPERIENCE_KEYWORDS,
    PROJECT_KEYWORDS,
    CERTIFICATION_KEYWORDS,
    clean_line,
    extract_emails,
    extract_github,
    extract_linkedin,
    extract_phones,
    extract_skills_from_text,
    is_skill_list_line,
    looks_like_date_line,
)

_SPACY_MODEL = "en_core_web_sm"
_nlp = None
_spacy_loaded = False

_OTHER_HEADERS = [
    "skills", "summary", "profile", "objective", "contact",
    "references", "awards", "interests", "languages", "strengths",
]

_HEADING_WORDS = {
    "resume", "cv", "curriculum", "vitae", "contact", "summary", "profile",
    "objective", "references", "education", "skills", "technical skills",
    "projects", "experience", "work experience", "professional experience",
    "employment", "certifications", "certificates", "awards", "interests",
    "strengths", "competencies", "declaration", "achievements", "personal",
    "name", "email", "phone", "address", "work history", "languages", "tools",
    "programming languages", "web technologies",
}

_DEGREE_PATTERN = re.compile(
    r"(?i)\b(?:"
    r"b\.?\s?tech|m\.?\s?tech|"
    r"b\.\s?e\.?|m\.\s?e\.?|"
    r"b\.\s?sc\.?|m\.\s?sc\.?|"
    r"b\.\s?com\.?|m\.\s?com\.?|"
    r"b\.\s?a\.?|m\.\s?a\.?|"
    r"b\.\s?eng\.?|m\.\s?eng\.?|"
    r"bca|mca|mba|bba|"
    r"ph\.?d|doctorate|bachelor|master|diploma|associate|"
    r"post.?graduate|graduation|degree"
    r")\b"
)

_INSTITUTION_PATTERN = re.compile(
    r"(?i)\b(?:university|college|institute|school|polytechnic|academy)\b"
)

_MONTH_YEAR_PATTERN = re.compile(
    r"(?i)\b(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s*)?(?:19|20)\d{2}\b"
)

_YEAR_RANGE_PATTERN = re.compile(
    r"(?i)\b(?:19|20)\d{2}\s*[-–—/]\s*(?:(?:19|20)\d{2}|present|current)\b"
)

_SCORE_PATTERN = re.compile(r"(?i)(score|cgpa|gpa|percentage|percent)\s*[:\-]?\s*[^|]*")

_SKILL_HEADER_LABELS = (
    "programming languages", "web technologies", "technical skills", "skills",
    "tools", "languages", "frameworks", "databases", "technologies",
)

_ACTION_VERBS = {
    "developed", "designed", "responsible", "worked", "built", "implemented",
    "managed", "led", "created", "maintained", "improved", "deployed",
    "architected", "analyzed", "analysed", "tested", "wrote", "delivered",
    "coordinated", "mentored", "assisted", "collaborated",
}


def _get_nlp():
    """Lazily load the spaCy model once and cache it."""
    global _nlp, _spacy_loaded
    if not _spacy_loaded:
        _spacy_loaded = True
        try:
            import spacy

            _nlp = spacy.load(_SPACY_MODEL)
            logger.info(f"spaCy model '{_SPACY_MODEL}' loaded")
        except OSError:
            logger.warning(
                f"spaCy model '{_SPACY_MODEL}' not found. "
                "Install it with: python -m spacy download en_core_web_sm"
            )
        except Exception as e:
            logger.warning(f"spaCy NER unavailable, falling back to heuristics: {e}")
    return _nlp


def _clean_name(name: str) -> str:
    name = re.sub(r"[:,\|/\-_\(\)\[\]{}]", " ", name).strip()
    name = re.sub(r"\s+", " ", name)
    return name.strip()


def _is_heading_line(line: str) -> bool:
    lowered = line.lower().strip().rstrip(":")
    return lowered in _HEADING_WORDS or lowered in {"objective", "career objective"}


def _is_location_or_contact(name: str) -> bool:
    """Reject lines that look like addresses/locations rather than names."""
    if "," in name:
        return True
    lowered = name.lower()
    location_markers = {
        "andhra pradesh", "telangana", "tamil nadu", "karnataka", "maharastra",
        "maharashtra", "kerala", "uttar pradesh", "delhi", "mumbai", "hyderabad",
        "bengaluru", "bangalore", "chennai", "pune", "kolkata", "india", "usa",
        "united states", "canada", "london", "singapore", "dubai", "germany",
        "australia", "remote",
    }
    if any(marker in lowered for marker in location_markers):
        return True
    if re.search(r"\b(?:p\.?o\.?|street|road|city|state|zip|pin|district)\b", lowered):
        return True
    return False


def _is_technical_name(name: str) -> bool:
    """Reject candidate names that are actually skill words (e.g. 'Java Script')."""
    lowered = name.lower()
    if lowered in {"java script", "javascript", "html", "css", "python", "react"}:
        return True
    from app.utils.regex_helper import TECH_SKILLS

    words = [w for w in lowered.split() if len(w) >= 2]
    if not words:
        return True
    skill_words = sum(1 for w in words if w in TECH_SKILLS)
    return skill_words / len(words) >= 0.6


def _is_section_header(line: str, keywords: list[str]) -> bool:
    """Heuristic check for a resume section header.

    A header is short, contains no digits, is not a long sentence, contains a
    section keyword, and is written header-style (ALL CAPS or Title Case).
    Lines produced by flattened table cells ('A | B') are checked per segment.
    """
    stripped = line.strip().rstrip(":")
    if not stripped:
        return False
    if len(stripped) > 40:
        return False
    if any(ch.isdigit() for ch in stripped):
        return False

    segments = [seg.strip() for seg in stripped.split("|") if seg.strip()]
    candidates = segments or [stripped]

    for candidate in candidates:
        lower = candidate.lower().rstrip(":")
        if not any(kw in lower for kw in keywords):
            continue
        words = candidate.split()
        if len(words) > 4:
            continue
        if candidate.isupper():
            return True
        alpha_words = [w for w in words if w and w[0].isalpha()]
        if alpha_words and all(w[0].isupper() for w in alpha_words):
            return True
    return False


def _extract_section(text: str, section_keywords: list[str]) -> str:
    all_headers = (
        EDUCATION_KEYWORDS
        + EXPERIENCE_KEYWORDS
        + PROJECT_KEYWORDS
        + CERTIFICATION_KEYWORDS
        + _OTHER_HEADERS
    )
    lines = text.split("\n")
    section_lines: list[str] = []
    capturing = False

    for line in lines:
        stripped = line.strip()

        if not stripped:
            if capturing and section_lines and section_lines[-1] != "":
                section_lines.append("")
            continue

        if capturing and _is_section_header(line, all_headers):
            capturing = False
            continue

        if capturing:
            section_lines.append(stripped)
            continue

        if _is_section_header(line, section_keywords):
            capturing = True

    return "\n".join(section_lines).strip()


def _best_segment(line: str, pattern: re.Pattern[str]) -> str:
    """If a line contains '|' (flattened table cells), return the segment that
    best matches the given pattern, otherwise the whole cleaned line."""
    cleaned = clean_line(line)
    if "|" not in cleaned:
        return cleaned
    segments = [seg.strip() for seg in cleaned.split("|") if seg.strip()]
    if not segments:
        return cleaned
    matches = [seg for seg in segments if pattern.search(seg)]
    if matches:
        return max(matches, key=len)
    return segments[-1]


def _extract_name(text: str) -> str | None:
    # 1) Explicit label: "Name: John Doe"
    name_match = re.search(r"(?im)^\s*name\s*[:\-]\s*([A-Za-z][A-Za-z'\-\. ]{2,60})\s*$", text)
    if name_match:
        candidate = _clean_name(name_match.group(1))
        if (
            2 <= len(candidate.split()) <= 5
            and not _is_location_or_contact(candidate)
            and not _is_technical_name(candidate)
        ):
            return candidate

    lines = [clean_line(ln) for ln in text.splitlines() if ln.strip()]
    if not lines:
        return None

    # 2) ALL-CAPS first line — very common in professional/Indian resumes.
    first = lines[0]
    first_words = first.split()
    if (
        2 <= len(first_words) <= 5
        and first.isupper()
        and not _is_heading_line(first)
        and not any(ch.isdigit() for ch in first)
        and not _is_location_or_contact(first)
        and not _is_technical_name(first)
    ):
        return first

    # 3) spaCy NER on the header block (first ~3000 chars).
    nlp = _get_nlp()
    if nlp is not None:
        try:
            doc = nlp(text[:3000])
            for ent in doc.ents:
                if ent.label_ == "PERSON":
                    name = _clean_name(ent.text)
                    if (
                        2 <= len(name.split()) <= 5
                        and not any(kw in name.lower() for kw in ["resume", "cv", "curriculum", "vitae"])
                        and not _is_location_or_contact(name)
                        and not _is_technical_name(name)
                    ):
                        return name
        except Exception as e:
            logger.warning(f"spaCy NER failed: {e}")

    # 4) Heuristic: first substantive line that looks like a person's name.
    for line in lines[:3]:
        candidate = clean_line(line)
        if not candidate or candidate.lower().startswith("name"):
            continue
        words = candidate.split()
        if 2 <= len(words) <= 5:
            letters = [w for w in words if w[0].isalpha()]
            if (
                all(w[0].isupper() for w in letters)
                and not any(w.lower() in _HEADING_WORDS for w in words)
                and not _is_location_or_contact(candidate)
                and not _is_technical_name(candidate)
            ):
                return candidate
    return None


def _extract_education_from_lines(lines: list[str]) -> list[str]:
    entries: list[str] = []
    seen: set[str] = set()
    seen_degrees: set[str] = set()
    used_indexes: set[int] = set()

    for i, line in enumerate(lines):
        if i in used_indexes:
            continue
        if is_skill_list_line(line):
            continue
        if not _DEGREE_PATTERN.search(line):
            continue

        full = clean_line(line)
        if is_skill_list_line(full):
            continue
        degree = _best_segment(line, _DEGREE_PATTERN)
        if not (4 <= len(degree) <= 120):
            continue
        if degree.lower() in seen_degrees:
            used_indexes.add(i)
            continue
        seen_degrees.add(degree.lower())

        # Institution and score normally follow the degree line; years may
        # precede or follow it. Search forward first, then fall back backward.
        after = lines[i + 1:i + 5]
        before = lines[max(0, i - 2):i]

        institution: str | None = None
        score: str | None = None
        years: str | None = None

        def _is_dateish(w: str) -> bool:
            if _INSTITUTION_PATTERN.search(w) or _SCORE_PATTERN.search(w):
                return False
            return bool(_YEAR_RANGE_PATTERN.search(w) or _MONTH_YEAR_PATTERN.search(w))

        for w in after:
            if not w:
                continue
            if _DEGREE_PATTERN.search(w):
                continue
            if len(w) > 120:
                continue
            wl = w.lower()
            if _INSTITUTION_PATTERN.search(wl) and institution is None:
                institution = w
            elif _SCORE_PATTERN.search(wl) and score is None and "|" not in w:
                score = _best_segment(w, _SCORE_PATTERN)
            elif years is None and len(w) < 60 and _is_dateish(w):
                years = w

        if years is None:
            for w in reversed(before):
                if not w:
                    continue
                if _DEGREE_PATTERN.search(w):
                    continue
                if len(w) < 60 and _is_dateish(w):
                    years = w
                    break

        if score and "|" in score:
            score = None

        parts = [degree]
        for extra in (institution, score):
            if extra and extra not in degree and extra != degree:
                parts.append(extra)
        entry = ", ".join(parts)
        if years and years not in entry:
            entry = f"{entry} ({years})"

        if entry not in seen and len(entry) > 5:
            seen.add(entry.lower())
            entries.append(entry)
        used_indexes.add(i)

    return entries[:8]


def _extract_education(text: str) -> list[str]:
    # Prefer the dedicated section, but fall back to scanning the full text
    # when the section produced no usable degree entries (common with
    # flattened/generated resumes where education lives in table cells).
    section_text = _extract_section(text, EDUCATION_KEYWORDS)
    if section_text.strip():
        section_lines = [clean_line(ln) for ln in section_text.split("\n") if ln.strip()]
        entries = _extract_education_from_lines(section_lines)
        if entries:
            return entries

    all_lines = [clean_line(ln) for ln in text.split("\n") if ln.strip()]
    return _extract_education_from_lines(all_lines)


def _extract_experience(text: str) -> list[dict[str, Any]]:
    section_text = _extract_section(text, EXPERIENCE_KEYWORDS)
    if not section_text.strip():
        return []

    experiences: list[dict[str, Any]] = []
    blocks = re.split(r"\n\s*\n", section_text)

    duration_pattern = re.compile(
        r"(?i)(?:"
        r"(\d{1,2}\s*(?:\+?\s*)?(?:years?|yrs?|months?|mos?))"  # e.g. "5 years", "3+ yrs"
        r"|"
        r"((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s*\d{4})"  # start date
        r"\s*[-–—to]+\s*"  # separator
        r"((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s*\d{4}|present|current|till\s*date)"  # end date
        r"|"
        r"((?:19|20)\d{2}\s*[-–—/]\s*(?:(?:19|20)\d{2}|present|current))"  # year-only range
        r")",
        re.IGNORECASE,
    )

    role_keywords = [
        "developer", "engineer", "manager", "analyst", "architect", "lead",
        "director", "intern", "consultant", "specialist", "scientist",
        "designer", "administrator", "coordinator", "officer", "trainer",
        "senior", "junior", "associate", "principal", "staff",
    ]

    for block in blocks:
        lines = [ln for ln in block.strip().split("\n") if ln.strip()]
        if not lines:
            continue

        entry: dict[str, Any] = {"company": None, "role": None, "duration": None}

        duration_match = duration_pattern.search(block)
        if duration_match:
            entry["duration"] = duration_match.group(0).strip()

        role_line = None
        for line in lines[:4]:
            line_lower = line.lower()
            if looks_like_date_line(line_lower):
                continue
            if is_skill_list_line(line):
                continue
            if any(kw in line_lower for kw in role_keywords):
                role_line = clean_line(line)
                break
        if role_line:
            # Strip a leading duration prefix like "5+ years as Data Analyst".
            duration_prefix = re.match(
                r"(?i)^\d{1,2}\s*\+?\s*(?:years?|yrs?|months?|mos?)\s+(?:as\s+)?(.+)$",
                role_line,
            )
            entry["role"] = duration_prefix.group(1) if duration_prefix else role_line

        # Derive the company from a role line like "Senior Developer at Tech Corp".
        if not entry["company"] and entry["role"]:
            at_match = re.search(r"(?i)\bat\b\s+(.+)$", entry["role"])
            if at_match:
                company = at_match.group(1).strip()
                if 1 < len(company) < 100:
                    entry["company"] = company

        if not entry["company"]:
            for line in lines[:4]:
                cleaned = clean_line(line)
                if not cleaned:
                    continue
                if looks_like_date_line(cleaned.lower()):
                    continue
                if role_line and cleaned == role_line:
                    continue
                if cleaned == entry.get("role"):
                    continue
                if is_skill_list_line(cleaned):
                    continue
                if any(kw in cleaned.lower() for kw in _ACTION_VERBS):
                    continue
                if 2 < len(cleaned) < 100:
                    entry["company"] = cleaned
                    break

        if entry["company"] or entry["role"]:
            experiences.append(entry)

    return experiences[:10]


def _is_project_like_line(line: str) -> bool:
    cleaned = line.strip().lower()
    if any(label in cleaned for label in _SKILL_HEADER_LABELS):
        return False
    if cleaned.startswith(("project title", "project name", "project:")):
        return True
    return True


def _extract_projects(text: str) -> list[str]:
    section_text = _extract_section(text, PROJECT_KEYWORDS)
    if not section_text.strip():
        return []

    projects: list[str] = []
    for line in section_text.split("\n"):
        cleaned = clean_line(line)
        if not (3 < len(cleaned) < 200):
            continue
        if is_skill_list_line(cleaned):
            continue
        if not _is_project_like_line(cleaned):
            continue
        if cleaned not in projects:
            projects.append(cleaned)

    return projects[:10]


def _extract_certifications(text: str) -> list[str]:
    section_text = _extract_section(text, CERTIFICATION_KEYWORDS)
    if not section_text.strip():
        return []

    certifications: list[str] = []
    for line in section_text.split("\n"):
        cleaned = clean_line(line)
        if not (3 < len(cleaned) < 200):
            continue
        if is_skill_list_line(cleaned):
            continue
        if cleaned not in certifications:
            certifications.append(cleaned)

    return certifications[:10]


def extract_information(text: str) -> dict[str, Any]:
    logger.info(f"Extracting information from {len(text)} characters of text")

    full_name = _extract_name(text)
    emails = extract_emails(text)
    phones = extract_phones(text)
    skills = extract_skills_from_text(text)
    education = _extract_education(text)
    experience = _extract_experience(text)
    projects = _extract_projects(text)
    certifications = _extract_certifications(text)
    linkedin = extract_linkedin(text)
    github = extract_github(text)

    result = {
        "full_name": full_name,
        "email": emails[0] if emails else None,
        "phone": phones[0] if phones else None,
        "skills": skills,
        "education": education,
        "experience": experience,
        "projects": projects,
        "certifications": certifications,
        "linkedin": linkedin,
        "github": github,
    }

    logger.info(
        f"Extraction complete: name={full_name}, email={result['email']}, "
        f"skills={len(skills)}, education={len(education)}, "
        f"experience={len(experience)}, projects={len(projects)}"
    )

    return result
