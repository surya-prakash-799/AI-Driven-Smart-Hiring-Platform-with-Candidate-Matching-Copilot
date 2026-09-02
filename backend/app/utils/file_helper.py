import os
import uuid
from pathlib import Path

from fastapi import UploadFile
from loguru import logger

from app.core.config import get_settings

settings = get_settings()

# Signature: PDF files start with "%PDF-" (allow leading whitespace).
# DOCX files are ZIP containers that start with the "PK\x03\x04" magic bytes.
_FILE_SIGNATURES = {
    "pdf": (b"%PDF", 4),
    "docx": (b"PK\x03\x04", 4),
}


def ensure_directories() -> None:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.EXTRACTED_DIR, exist_ok=True)
    os.makedirs(settings.LOG_DIR, exist_ok=True)


def generate_unique_filename(original_filename: str) -> str:
    ext = Path(original_filename).suffix.lower()
    return f"{uuid.uuid4().hex}{ext}"


def get_upload_path(filename: str) -> str:
    return os.path.join(settings.UPLOAD_DIR, filename)


def get_extracted_path(filename: str) -> str:
    return os.path.join(settings.EXTRACTED_DIR, filename)


def validate_file_extension(filename: str) -> bool:
    ext = get_file_extension(filename)
    return ext in settings.ALLOWED_EXTENSIONS


def get_file_extension(filename: str) -> str:
    return Path(filename).suffix.lower().lstrip(".")


def validate_file_signature(content: bytes, ext: str) -> bool:
    """Validate the magic bytes of the uploaded content against its extension."""
    expected = _FILE_SIGNATURES.get(ext)
    if not expected:
        return False
    magic, offset = expected
    stripped = content.lstrip()
    return stripped[:offset] == magic


async def save_upload_file(
    file: UploadFile, filename: str, content: bytes | None = None
) -> str:
    ensure_directories()
    file_path = get_upload_path(filename)
    if content is None:
        content = await file.read()

    if len(content) > settings.MAX_FILE_SIZE:
        raise ValueError(
            f"File size exceeds maximum allowed size of {settings.MAX_FILE_SIZE // (1024 * 1024)} MB"
        )

    with open(file_path, "wb") as f:
        f.write(content)

    logger.info(f"File saved: {file_path} ({len(content)} bytes)")
    return file_path


def remove_file(path: str | os.PathLike[str]) -> None:
    try:
        if os.path.exists(path):
            os.remove(path)
            logger.info(f"Removed file: {path}")
    except OSError as e:
        logger.warning(f"Failed to remove file {path}: {e}")


def cleanup_artifacts(*paths: str | os.PathLike[str]) -> None:
    """Best-effort removal of a set of files (upload + extracted JSON)."""
    for path in paths:
        if path:
            remove_file(path)
