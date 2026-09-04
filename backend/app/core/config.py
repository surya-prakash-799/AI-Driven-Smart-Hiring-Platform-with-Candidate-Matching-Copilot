import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings

_BASE_DIR = Path(__file__).resolve().parent.parent.parent


def _resolve_dir(value: str) -> str:
    """Resolve a possibly relative directory path against the project root."""
    path = Path(value).expanduser()
    if not path.is_absolute():
        path = _BASE_DIR / path
    return str(path)


class Settings(BaseSettings):
    DATABASE_URL: str = f"sqlite:///{_BASE_DIR / 'recruitment.db'}"

    UPLOAD_DIR: str = str(_BASE_DIR / "app" / "uploads")
    EXTRACTED_DIR: str = str(_BASE_DIR / "app" / "extracted_data")
    LOG_DIR: str = str(_BASE_DIR / "app" / "logs")
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10 MB
    ALLOWED_EXTENSIONS: list[str] = ["pdf", "docx"]
    MAX_RESUME_TEXT_CHARS: int = 200_000

    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_PRE_PING: bool = True

    LOG_LEVEL: str = "INFO"
    LOG_FILE_NAME: str = "recruitment.log"

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.6-flash"
    AI_TIMEOUT_SECONDS: int = 60

    GROQ_API_KEY: str = ""
    GROQ_WHISPER_MODEL: str = "whisper-large-v3-turbo"

    model_config = {
        # Resolve the .env file relative to the project root so the app loads
        # correctly no matter what the current working directory is (e.g. when
        # started from C:\backend or any other folder).
        "env_file": str(_BASE_DIR / ".env"),
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",
    }

    @field_validator("ALLOWED_EXTENSIONS", "CORS_ORIGINS", mode="before")
    @classmethod
    def parse_list_values(cls, v: Any) -> Any:
        """Accept both JSON arrays (["a","b"]) and comma-separated strings."""
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return []
            if v.startswith("["):
                try:
                    return json.loads(v)
                except json.JSONDecodeError:
                    pass
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    @field_validator("UPLOAD_DIR", "EXTRACTED_DIR", "LOG_DIR", mode="after")
    @classmethod
    def normalize_dirs(cls, v: str) -> str:
        return _resolve_dir(v)

    @field_validator("MAX_FILE_SIZE")
    @classmethod
    def validate_max_file_size(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("MAX_FILE_SIZE must be a positive integer")
        return v

    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")


@lru_cache()
def get_settings() -> Settings:
    return Settings()
