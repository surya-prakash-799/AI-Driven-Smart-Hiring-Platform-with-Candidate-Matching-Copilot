import sys
from pathlib import Path

from loguru import logger

from app.core.config import Settings


def setup_logging(settings: Settings) -> Path:
    """Configure loguru: colored console output plus a rotating file log."""
    log_file = Path(settings.LOG_DIR) / settings.LOG_FILE_NAME
    log_file.parent.mkdir(parents=True, exist_ok=True)

    logger.remove()
    logger.add(
        sys.stderr,
        level=settings.LOG_LEVEL,
        format=(
            "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
            "<level>{level: <8}</level> | "
            "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
            "<level>{message}</level>"
        ),
    )
    logger.add(
        str(log_file),
        level="DEBUG",
        rotation="10 MB",
        retention="30 days",
        compression="gz",
        enqueue=True,
    )
    return log_file
