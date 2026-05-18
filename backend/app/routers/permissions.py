"""
Permission management API.

Endpoints for viewing and updating which permissions are assigned to roles,
and for setting per-user permission overrides.  All endpoints require the
"users:write" permission (admin-equivalent capability).
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import (
    bump_permissions_version,
    bump_permissions_version_for_role,
    require_permission,
)
from app.models import Permission, RolePermission, User, UserPermission
from app.permissions import ALL_PERMISSIONS

router = APIRouter()

_GUARD = Depends(require_permission("users:write"))


# ---------------------------------------------------------------------------
# Schemas (inline — simple enough to not need a separate schemas file)
# ---------------------------------------------------------------------------

class PermissionRead(BaseModel):
    name: str
    description: str | None = None

    model_config = {"from_attributes": True}


class RolePermissionsRead(BaseModel):
    role: str
    permissions: list[str]


class RolePermissionsUpdate(BaseModel):
    permissions: list[str]


class UserPermissionRead(BaseModel):
    permission_name: str
    granted: bool

    model_config = {"from_attributes": True}


class UserPermissionUpsert(BaseModel):
    permission_name: str
    granted: bool = True


# ---------------------------------------------------------------------------
# Permissions catalogue
# ---------------------------------------------------------------------------

@router.get("/", response_model=list[PermissionRead])
def list_permissions(
    db: Session = Depends(get_db),
    _: User = _GUARD,
):
    """List every permission defined in the system."""
    return db.query(Permission).order_by(Permission.name).all()


# ---------------------------------------------------------------------------
# Role-level permissions
# ---------------------------------------------------------------------------

@router.get("/roles/{role}", response_model=RolePermissionsRead)
def get_role_permissions(
    role: str,
    db: Session = Depends(get_db),
    _: User = _GUARD,
):
    rows = db.query(RolePermission).filter(RolePermission.role_name == role).all()
    return RolePermissionsRead(role=role, permissions=[r.permission_name for r in rows])


@router.put("/roles/{role}", response_model=RolePermissionsRead)
def update_role_permissions(
    role: str,
    payload: RolePermissionsUpdate,
    db: Session = Depends(get_db),
    _: User = _GUARD,
):
    """Replace the full permission set for a role. Bumps permissions_version
    for every user holding that role so their next request re-fetches perms."""
    valid = set(ALL_PERMISSIONS.keys())
    unknown = [p for p in payload.permissions if p not in valid]
    if unknown:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown permissions: {unknown}",
        )
    db.query(RolePermission).filter(RolePermission.role_name == role).delete()
    for perm in payload.permissions:
        db.add(RolePermission(role_name=role, permission_name=perm))
    bump_permissions_version_for_role(role, db)
    db.commit()
    return RolePermissionsRead(role=role, permissions=payload.permissions)


# ---------------------------------------------------------------------------
# User-level permission overrides
# ---------------------------------------------------------------------------

@router.get("/users/{user_id}", response_model=list[UserPermissionRead])
def get_user_permission_overrides(
    user_id: str,
    db: Session = Depends(get_db),
    _: User = _GUARD,
):
    """Return per-user permission overrides (grants and denials on top of role)."""
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="User not found") from None
    return db.query(UserPermission).filter(UserPermission.user_id == uid).all()


@router.post(
    "/users/{user_id}",
    response_model=UserPermissionRead,
    status_code=status.HTTP_201_CREATED,
)
def set_user_permission_override(
    user_id: str,
    payload: UserPermissionUpsert,
    db: Session = Depends(get_db),
    _: User = _GUARD,
):
    """Grant or deny a single permission for a specific user.
    Upserts: if an override already exists it is updated in place."""
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="User not found") from None
    user = db.query(User).filter(User.id == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.permission_name not in ALL_PERMISSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown permission: '{payload.permission_name}'",
        )
    existing = (
        db.query(UserPermission)
        .filter(
            UserPermission.user_id == uid,
            UserPermission.permission_name == payload.permission_name,
        )
        .first()
    )
    if existing:
        existing.granted = payload.granted
    else:
        db.add(UserPermission(
            user_id=uid,
            permission_name=payload.permission_name,
            granted=payload.granted,
        ))
    bump_permissions_version(user, db)
    db.commit()
    return UserPermissionRead(
        permission_name=payload.permission_name,
        granted=payload.granted,
    )


@router.delete("/users/{user_id}/{permission_name}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_permission_override(
    user_id: str,
    permission_name: str,
    db: Session = Depends(get_db),
    _: User = _GUARD,
):
    """Remove a per-user permission override, reverting that user to role defaults."""
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="User not found") from None
    user = db.query(User).filter(User.id == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    deleted = (
        db.query(UserPermission)
        .filter(
            UserPermission.user_id == uid,
            UserPermission.permission_name == permission_name,
        )
        .delete()
    )
    if deleted:
        bump_permissions_version(user, db)
    db.commit()
