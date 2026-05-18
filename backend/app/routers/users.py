from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import (
    bump_permissions_version,
    get_current_user,
    require_permission,
)
from app.models import User
from app.routers.auth import pwd_context
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services import audit_service

router = APIRouter()


@router.get("/me", response_model=UserRead)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/", response_model=list[UserRead])
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("users:read")),
):
    return db.query(User).order_by(User.created_at.desc()).offset(skip).limit(limit).all()


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:write")),
):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=pwd_context.hash(payload.password),
        role=payload.role,
        is_active=payload.is_active,
    )
    db.add(user)
    db.flush()
    audit_service.log(
        db, user=current_user,
        action="user.create",
        entity_type="user", entity_id=str(user.id),
        detail=f"email={user.email} role={user.role}",
    )
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: str,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:write")),
):
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="User not found") from None
    user = db.query(User).filter(User.id == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    data = payload.model_dump(exclude_unset=True)
    password = data.pop("password", None)
    role_changed = "role" in data and data["role"] != user.role
    for k, v in data.items():
        setattr(user, k, v)
    if password is not None:
        user.password_hash = pwd_context.hash(password)
    # Invalidate the permission cache when the user's role changes.
    if role_changed:
        bump_permissions_version(user, db)
    audit_service.log(
        db, user=current_user,
        action="user.update",
        entity_type="user", entity_id=str(uid),
        detail=str(list(data.keys())),
    )
    db.commit()
    db.refresh(user)
    return user
