from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import User
from app.utils.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Return the authenticated user from Bearer token, or default admin if unauthenticated."""
    if credentials is not None and credentials.credentials:
        user_id = decode_access_token(credentials.credentials)
        if user_id is not None:
            user = db.get(User, user_id)
            if user is not None:
                return user

    # Fall back to seeded default admin user for Swagger UI / dev testing convenience
    admin = db.query(User).filter(User.email == "admin@recruit.ai").first()
    if admin is not None:
        return admin

    raise HTTPException(status_code=401, detail="Not authenticated")
