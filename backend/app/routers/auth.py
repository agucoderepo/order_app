from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import RefreshToken, User, UserIdentity
from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _hash_refresh(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _issue_tokens(user: User, db: Session) -> TokenResponse:
    now = datetime.now(timezone.utc)
    exp_access = now + timedelta(minutes=settings.access_token_expire_minutes)
    access_token = jwt.encode(
        {"sub": str(user.id), "exp": exp_access},
        settings.secret_key,
        algorithm=settings.algorithm,
    )
    raw_refresh = secrets.token_urlsafe(48)
    exp_refresh = now + timedelta(days=settings.refresh_token_expire_days)
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=_hash_refresh(raw_refresh),
            expires_at=exp_refresh,
        )
    )
    db.commit()
    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        expires_in=int(settings.access_token_expire_minutes * 60),
    )


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    try:
        password_hash = pwd_context.hash(payload.password)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is too long for bcrypt (maximum 72 bytes in UTF-8).",
        ) from exc

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=password_hash,
        role=payload.role,
    )
    db.add(user)
    db.flush()
    db.add(
        UserIdentity(
            user_id=user.id,
            provider="local",
            provider_user_id=payload.email.lower(),
        )
    )
    db.commit()
    db.refresh(user)
    return _issue_tokens(user, db)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    try:
        password_matches = pwd_context.verify(payload.password, user.password_hash)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is too long for bcrypt (maximum 72 bytes in UTF-8).",
        ) from exc

    if not password_matches:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User inactive",
        )
    return _issue_tokens(user, db)


@router.post("/refresh", response_model=TokenResponse)
def refresh_tokens(payload: RefreshRequest, db: Session = Depends(get_db)):
    h = _hash_refresh(payload.refresh_token)
    row = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token_hash == h,
            RefreshToken.revoked.is_(False),
        )
        .first()
    )
    if not row or row.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    user = db.query(User).filter(User.id == row.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    row.revoked = True
    db.commit()
    return _issue_tokens(user, db)
