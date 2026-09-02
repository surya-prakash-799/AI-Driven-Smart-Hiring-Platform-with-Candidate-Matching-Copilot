from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import User
from app.routes.deps import get_current_user
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    UserResponse,
)
from app.utils.security import create_access_token, hash_password, verify_password

router = APIRouter()


@router.post(
    "/auth/register",
    response_model=AuthResponse,
    summary="Register a new account",
    description="Create a new user account. The account is stored in the database and a session token is returned.",
    responses={
        201: {"description": "Account created and session started"},
        409: {"description": "An account with this email already exists"},
        422: {"description": "Validation error"},
        503: {"description": "Database unavailable"},
    },
    status_code=201,
)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    clean_email = data.email.lower().strip()
    clean_name = data.name.strip()

    try:
        existing = db.query(User).filter(User.email == clean_email).first()
    except SQLAlchemyError as e:
        logger.error(f"Database error during register check for {clean_email}: {e}")
        raise HTTPException(
            status_code=503,
            detail="Database service is currently unavailable. Please try again.",
        )

    if existing:
        raise HTTPException(
            status_code=409, detail="An account with this email already exists."
        )

    try:
        user = User(
            name=clean_name,
            email=clean_email,
            password_hash=hash_password(data.password),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error during user registration for {clean_email}: {e}")
        raise HTTPException(
            status_code=503,
            detail="Failed to save new user to database. Please try again.",
        )

    try:
        token = create_access_token(user.id)
        user_resp = UserResponse.model_validate(user)
    except Exception as e:
        logger.error(f"Error creating auth response after registration: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to generate user session token."
        )

    return AuthResponse(
        access_token=token,
        user=user_resp,
    )


@router.post(
    "/auth/login",
    response_model=AuthResponse,
    summary="Sign in",
    description="Authenticate with an account stored in the database and receive a session token.",
    responses={
        200: {"description": "Signed in successfully"},
        401: {"description": "Invalid email or password"},
        422: {"description": "Validation error"},
        503: {"description": "Database unavailable"},
    },
)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    clean_email = data.email.lower().strip()

    try:
        user = db.query(User).filter(User.email == clean_email).first()
    except SQLAlchemyError as e:
        logger.error(f"Database error during login query for {clean_email}: {e}")
        raise HTTPException(
            status_code=503,
            detail="Database service is currently unavailable. Please try again.",
        )
    except Exception as e:
        logger.error(f"Unexpected error querying user during login: {e}")
        raise HTTPException(
            status_code=500, detail="Internal error while processing login."
        )

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    try:
        token = create_access_token(user.id)
        user_resp = UserResponse.model_validate(user)
    except Exception as e:
        logger.error(f"Error building auth response for user {user.id}: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to generate user session token."
        )

    return AuthResponse(
        access_token=token,
        user=user_resp,
    )


@router.get(
    "/auth/me",
    response_model=UserResponse,
    summary="Get the current user",
    description="Validate the session token and return the authenticated user.",
    responses={
        200: {"description": "Current user returned"},
        401: {"description": "Invalid or missing token"},
    },
)
def me(current_user: User = Depends(get_current_user)):
    try:
        return UserResponse.model_validate(current_user)
    except Exception as e:
        logger.error(f"Error validating user session response: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to validate user session."
        )

