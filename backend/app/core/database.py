from collections.abc import Generator
from typing import Any

from loguru import logger
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

engine_args: dict[str, Any] = {}
if settings.is_sqlite:
    engine_args["connect_args"] = {"check_same_thread": False}
else:
    engine_args.update(
        {
            "pool_size": settings.DB_POOL_SIZE,
            "max_overflow": settings.DB_MAX_OVERFLOW,
            "pool_pre_ping": settings.DB_POOL_PRE_PING,
        }
    )

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    **engine_args,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency: yields a session and guarantees it is closed."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> tuple[bool, str]:
    """Verify the database is reachable. Returns (ok, message)."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True, "Database connected"
    except Exception as e:
        logger.error(f"Database connection check failed: {e}")
        return False, str(e)


def init_db() -> tuple[bool, str]:
    """Create all tables if they do not exist. Never raises; returns (ok, message)."""
    try:
        Base.metadata.create_all(bind=engine)
        return True, "Database tables created/verified"
    except SQLAlchemyError as e:
        # Check if tables exist and are usable (e.g. PostgreSQL sequence/table race condition during concurrent startup)
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1 FROM users LIMIT 1"))
            logger.warning(f"Database table creation reported warning/conflict but tables exist and are accessible: {e}")
            return True, "Database tables verified"
        except Exception:
            logger.error(f"Failed to create/verify database tables: {e}")
            return False, str(e)
    except Exception as e:
        logger.error(f"Unexpected error during database initialization: {e}")
        return False, str(e)


def dispose_engine() -> None:
    """Dispose the engine pool on application shutdown."""
    try:
        engine.dispose()
        logger.info("Database engine disposed")
    except Exception as e:
        logger.warning(f"Failed to dispose database engine: {e}")
