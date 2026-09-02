import re


EMAIL_PATTERN = re.compile(
    r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
)

PHONE_PATTERN = re.compile(
    r"(?<!\w)[+]?(?:\d[\s\-().]*){6,14}\d(?!\w)"
)

YEAR_RANGE_PATTERN = re.compile(r"^\d{3,4}\s*[-–—]\s*\d{3,4}$")

LINKEDIN_PATTERN = re.compile(
    r"(?:https?://)?(?:www\.)?linkedin\.com/in/[a-zA-Z0-9\-_%]+/?",
    re.IGNORECASE,
)

GITHUB_PATTERN = re.compile(
    r"(?:https?://)?(?:www\.)?github\.com/[a-zA-Z0-9\-_]+/?",
    re.IGNORECASE,
)

EDUCATION_KEYWORDS = [
    "education", "educational background", "academics", "academic qualifications",
    "qualifications", "bachelor", "master", "phd", "doctorate", "b.tech", "m.tech",
    "b.sc", "m.sc", "b.e.", "m.e.", "bca", "mca", "mba", "bba", "b.com", "m.com",
    "associate", "diploma", "university", "institute", "college", "school",
    "bachelor of technology", "master of technology", "bachelor of science",
    "master of science", "bachelor of engineering", "master of engineering",
    "computer science", "information technology", "electronics",
    "mechanical", "civil", "electrical", "data science", "artificial intelligence",
]

EXPERIENCE_KEYWORDS = [
    "experience", "work history", "employment", "professional experience",
    "work experience", "career", "employment history",
]

PROJECT_KEYWORDS = [
    "projects", "project experience", "key projects", "personal projects",
    "academic projects", "project work",
]

CERTIFICATION_KEYWORDS = [
    "certifications", "certificates", "credentials", "licenses",
    "certification", "certificate",
]

TECH_SKILLS = [
    # Programming Languages
    "python", "java", "javascript", "typescript", "c++", "c#", "ruby",
    "go", "golang", "rust", "php", "swift", "kotlin", "scala", "r",
    "matlab", "perl", "haskell", "elixir", "dart", "lua", "sql",
    # Frontend
    "react", "react.js", "reactjs", "angular", "angularjs", "vue", "vue.js",
    "vuejs", "next.js", "nextjs", "svelte", "html", "css", "sass", "less",
    "tailwind", "tailwind css", "bootstrap", "material ui", "mui",
    # Backend
    "fastapi", "django", "flask", "spring", "spring boot", "express",
    "express.js", "node.js", "nodejs", "nest.js", "nestjs", "rails",
    "ruby on rails", "laravel", "asp.net", ".net", "gin", "fiber",
    # Databases
    "postgresql", "postgres", "mysql", "mongodb", "redis", "elasticsearch",
    "sqlite", "oracle", "sql server", "cassandra", "dynamodb", "firebase",
    "mariadb", "neo4j", "couchdb",
    # Cloud & DevOps
    "aws", "amazon web services", "azure", "microsoft azure", "gcp",
    "google cloud", "docker", "kubernetes", "k8s", "jenkins", "ci/cd",
    "terraform", "ansible", "chef", "puppet", "circleci", "github actions",
    "gitlab ci", "nginx", "apache", "linux", "ubuntu", "centos",
    # AI/ML
    "machine learning", "deep learning", "nlp", "natural language processing",
    "tensorflow", "pytorch", "keras", "scikit-learn", "sklearn", "pandas",
    "numpy", "scipy", "matplotlib", "opencv", "hugging face", "transformers",
    "openai", "langchain", "llm", "large language model", "computer vision",
    "data mining", "neural network", "cnn", "rnn", "lstm",
    # Data
    "spark", "hadoop", "kafka", "airflow", "dbt", "snowflake", "databricks",
    "tableau", "power bi", "excel", "etl", "data engineering", "data analysis",
    "data pipeline",
    # Tools
    "git", "github", "gitlab", "bitbucket", "jira", "confluence", "slack",
    "figma", "postman", "swagger", "vscode", "visual studio",
    # Mobile
    "android", "ios", "flutter", "react native", "swift", "kotlin",
    # Testing
    "pytest", "jest", "mocha", "selenium", "cypress", "junit", "tdd",
    "unit testing", "integration testing",
    # Other
    "agile", "scrum", "kanban", "rest", "restful", "graphql", "grpc",
    "websocket", "microservices", "serverless", "lambda", "api",
    "oauth", "jwt", "encryption", "cybersecurity",
    # Modern / GenAI
    "generative ai", "genai", "prompt engineering", "rag", "llmops",
    "large language models", "vector database", "chromadb", "pinecone",
    "weaviate", "langgraph", "llamaindex", "agents", "ai agents",
    "cuda", "dspy", "fine-tuning", "fine tuning", "rag pipeline",
    "streamlit", "gradio", "django rest framework", "drf", "celery",
    "sqlalchemy", "pydantic", "web scraping", "scrapy", "beautifulsoup",
    "webpack", "vite", "redux", "zustand", "yaml", "docker compose",
    "helm", "prometheus", "grafana", "opentelemetry", "kubectl",
    "cql", "prisma", "s3", "cloudflare", "vercel", "netlify",
    "tailwindcss", "playwright", "puppeteer", "graphql api",
    "event-driven", "event driven", "ddd", "clean architecture",
]


def extract_emails(text: str) -> list[str]:
    results = list(dict.fromkeys(EMAIL_PATTERN.findall(text)))
    # Handle PDF/DOCX formatting artifacts such as 'user @domain.com' or
    # 'user@ domain.com' where a space slipped next to the '@'.
    relaxed = re.findall(
        r"[a-zA-Z0-9._%+\-]+\s*@\s*[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", text
    )
    for candidate in relaxed:
        cleaned = re.sub(r"\s+", "", candidate)
        if cleaned and cleaned not in results:
            results.append(cleaned)
    return results


def extract_phones(text: str) -> list[str]:
    raw = PHONE_PATTERN.findall(text)
    cleaned: list[str] = []
    seen_digits: set[str] = set()
    for p in raw:
        candidate = p.strip().rstrip("-–—.")
        if not _is_plausible_phone(candidate):
            continue
        digits = re.sub(r"\D", "", candidate)
        if digits in seen_digits:
            continue
        seen_digits.add(digits)
        cleaned.append(candidate)
    return cleaned


def _is_plausible_phone(raw: str) -> bool:
    """Filter out common false positives such as date/year ranges and ID numbers."""
    if any(ch.isalpha() for ch in raw):
        return False
    if YEAR_RANGE_PATTERN.match(raw):
        return False
    digits = re.sub(r"\D", "", raw)
    if not (7 <= len(digits) <= 15):
        return False
    if re.fullmatch(r"\d{4}", digits):
        return False
    return True


def extract_linkedin(text: str) -> str | None:
    match = LINKEDIN_PATTERN.search(text)
    if match:
        url = match.group(0)
        if not url.startswith("http"):
            url = "https://" + url
        return url.rstrip("/")
    return None


def extract_github(text: str) -> str | None:
    match = GITHUB_PATTERN.search(text)
    if match:
        url = match.group(0)
        if not url.startswith("http"):
            url = "https://" + url
        return url.rstrip("/")
    return None


def _build_skill_pattern(skill: str) -> str:
    """Build a regex pattern that handles multi-word skills correctly.
    Uses lookahead/lookbehind for single words, and direct search for multi-word skills."""
    words = skill.strip().split()
    if len(words) > 1:
        # Multi-word skill: use direct inclusion check with word boundaries around each word
        escaped_words = [re.escape(w) for w in words]
        return r"(?<!\w)" + r"\s+".join(escaped_words) + r"(?!\w)"
    else:
        return r"(?<!\w)" + re.escape(skill) + r"(?!\w)"


def extract_skills_from_text(text: str) -> list[str]:
    text_lower = text.lower()
    found_skills: list[str] = []
    for skill in TECH_SKILLS:
        pattern = _build_skill_pattern(skill)
        if re.search(pattern, text_lower):
            normalized = _normalize_skill_name(skill)
            if normalized not in found_skills:
                found_skills.append(normalized)
    return found_skills


def extract_known_skills_from_line(line: str) -> list[str]:
    """Return the normalized known tech skills mentioned in a single line."""
    return extract_skills_from_text(line)


def is_skill_list_line(line: str, min_skills: int = 2) -> bool:
    """True when a line is essentially a comma/pipe separated list of known skills.

    Used to filter out technical bullet lists from sections like projects or
    education where they do not belong (e.g. 'Python,Java,SQL,C,C++').
    """
    cleaned = line.strip().lstrip("•-–—*▪▸▹◦·").strip()
    if not cleaned:
        return False

    separators = re.findall(r"[,;|]", cleaned)
    if len(separators) < min_skills - 1:
        return False

    skills = extract_known_skills_from_line(cleaned)
    if len(skills) < min_skills:
        return False

    # Split only on explicit separators (comma/semicolon/pipe) so that
    # multi-word skills such as "Machine Learning" stay intact instead of
    # being broken into single words that never match TECH_SKILLS.
    chunks = [
        c.strip().lstrip("•-–—*▪▸▹◦·").strip().rstrip(".,:")
        for c in re.split(r"[,;|]+", cleaned)
    ]
    chunks = [c for c in chunks if c]
    if not chunks:
        return False

    recognized = 0
    for chunk in chunks:
        chunk_lower = chunk.lower()
        if chunk_lower in TECH_SKILLS or extract_known_skills_from_line(chunk):
            recognized += 1

    return recognized / len(chunks) >= 0.6


def _normalize_skill_name(skill: str) -> str:
    """Normalize a skill name to its display form."""
    lower = skill.lower()

    # Keep programming languages in proper case
    if lower in ("c++", "c#", "r"):
        return lower.upper()
    if lower == "go":
        return "Go"
    if lower in ("python", "java", "rust", "lua"):
        return skill.title() if skill.islower() else skill

    # Uppercase abbreviations
    if lower in (
        "sql", "php", "cnn", "rnn", "lstm", "nlp", "etl", "tdd", "jwt",
        "ci/cd", "api", "k8s", "aws", "gcp", "mvc", "html", "css", "rest",
        "rag", "drf", "cuda", "s3", "dd", "grpc", "dd", "llm",
    ):
        return lower.upper()

    # Database names with proper casing
    if lower in ("postgresql", "postgres", "mongodb", "mysql", "redis", "elasticsearch", "sqlite", "mariadb"):
        db_names = {
            "postgresql": "PostgreSQL",
            "postgres": "PostgreSQL",
            "mongodb": "MongoDB",
            "mysql": "MySQL",
            "redis": "Redis",
            "elasticsearch": "Elasticsearch",
            "sqlite": "SQLite",
            "mariadb": "MariaDB",
        }
        return db_names[lower]

    # Handle .js variants
    js_variants = {
        "javascript": "JavaScript",
        "typescript": "TypeScript",
        "reactjs": "React.js",
        "nextjs": "Next.js",
        "vuejs": "Vue.js",
        "nestjs": "Nest.js",
        "nodejs": "Node.js",
    }
    if lower in js_variants:
        return js_variants[lower]

    # Handle specific multi-word frameworks
    specific_cases = {
        "react.js": "React.js",
        "vue.js": "Vue.js",
        "next.js": "Next.js",
        "nest.js": "Nest.js",
        "node.js": "Node.js",
        "ruby on rails": "Ruby on Rails",
        "tailwind css": "Tailwind CSS",
        "react native": "React Native",
        "material ui": "Material UI",
        "spring boot": "Spring Boot",
        "machine learning": "Machine Learning",
        "deep learning": "Deep Learning",
        "natural language processing": "Natural Language Processing (NLP)",
        "computer vision": "Computer Vision",
        "data science": "Data Science",
        "data engineering": "Data Engineering",
        "data mining": "Data Mining",
        "data analysis": "Data Analysis",
        "data pipeline": "Data Pipeline",
        "neural network": "Neural Network",
        "hugging face": "Hugging Face",
        "large language model": "Large Language Model (LLM)",
        "github actions": "GitHub Actions",
        "gitlab ci": "GitLab CI",
        "power bi": "Power BI",
        "unit testing": "Unit Testing",
        "integration testing": "Integration Testing",
        "amazon web services": "Amazon Web Services (AWS)",
        "microsoft azure": "Microsoft Azure",
        "google cloud": "Google Cloud",
        "visual studio": "Visual Studio",
        "asp.net": "ASP.NET",
        "opencv": "OpenCV",
    }
    if lower in specific_cases:
        return specific_cases[lower]

    framework_cases = {
        "fastapi": "FastAPI",
        "sqlalchemy": "SQLAlchemy",
        "pydantic": "Pydantic",
        "langchain": "LangChain",
        "langgraph": "LangGraph",
        "llamaindex": "LlamaIndex",
        "chromadb": "ChromaDB",
        "pinecone": "Pinecone",
        "weaviate": "Weaviate",
        "dspy": "DSPy",
        "llmops": "LLMOps",
        "restful": "RESTful",
        "playwright": "Playwright",
        "streamlit": "Streamlit",
        "gradio": "Gradio",
        "celery": "Celery",
        "prisma": "Prisma",
        "webpack": "Webpack",
        "vite": "Vite",
        "redux": "Redux",
        "zustand": "Zustand",
        "prometheus": "Prometheus",
        "grafana": "Grafana",
        "opentelemetry": "OpenTelemetry",
        "tensorflow": "TensorFlow",
        "pytorch": "PyTorch",
        "scikit-learn": "scikit-learn",
        "spark": "Apache Spark",
        "kubernetes": "Kubernetes",
        "terraform": "Terraform",
        "docker compose": "Docker Compose",
        "streamlit": "Streamlit",
        "nginx": "Nginx",
        "flask": "Flask",
        "django": "Django",
        "fastapi": "FastAPI",
        "llamaindex": "LlamaIndex",
    }
    if lower in framework_cases:
        return framework_cases[lower]

    # Default: Title case
    return skill.title()


def clean_line(line: str) -> str:
    """Normalize a single line: collapse whitespace and strip leading bullets."""
    line = re.sub(r"^[\s•\-\*▪▸▹◦·–—]+\s*", "", line).strip()
    line = re.sub(r"\s+", " ", line)
    return line


def looks_like_date_line(line: str) -> bool:
    """True for lines that are only dates/durations (e.g. 'Jan 2020 - Present')."""
    lowered = line.lower().strip()
    if re.search(r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)", lowered):
        return True
    if re.match(r"^\d{2}/\d{4}\s*[-–—]|\d{4}\s*[-–—]\s*\d{4}|^\d{4}\s*[-–—]", lowered):
        return True
    return False
