from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import RolePermission, User, UserPermission

bearer_scheme = HTTPBearer()


# ---------------------------------------------------------------------------
# Permission resolution
# ---------------------------------------------------------------------------

def load_permissions_from_db(user: User, db: Session) -> set[str]:
    """Resolve the full permission set for a user from DB (cache miss path)."""
    role_rows = (
        db.query(RolePermission)
        .filter(RolePermission.role_name == user.role)
        .all()
    )
    perms: set[str] = {r.permission_name for r in role_rows}

    override_rows = (
        db.query(UserPermission)
        .filter(UserPermission.user_id == user.id)
        .all()
    )
    for row in override_rows:
        if row.granted:
            perms.add(row.permission_name)
        else:
            perms.discard(row.permission_name)

    return perms


def has_permission(user: User, permission: str) -> bool:
    """Inline check for data-scoping decisions inside route handlers."""
    return permission in getattr(user, "_permissions", set())


# ---------------------------------------------------------------------------
# Cache invalidation helpers
# ---------------------------------------------------------------------------

def bump_permissions_version(user: User, db: Session) -> None:
    """Increment the cache version for one user. Call before db.commit()."""
    user.permissions_version = (user.permissions_version or 0) + 1


def bump_permissions_version_for_role(role: str, db: Session) -> None:
    """Increment the cache version for every user with the given role."""
    db.query(User).filter(User.role == role).update(
        {"permissions_version": User.permissions_version + 1},
        synchronize_session="fetch",
    )


# ---------------------------------------------------------------------------
# Token decoding + permission cache
# ---------------------------------------------------------------------------

def _decode_token(token: str, db: Session) -> User:
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # --- JWT permissions cache ---
    # Fast path: JWT still carries the same permissions version — no extra query.
    # Cache miss: version mismatch (permissions changed since token was issued)
    #             → re-load from DB so the request always sees current permissions.
    jwt_perms: list[str] | None = payload.get("perms")
    jwt_perms_v: int = payload.get("perms_v", -1)

    if jwt_perms is not None and user.permissions_version == jwt_perms_v:
        user._permissions = set(jwt_perms)
    else:
        user._permissions = load_permissions_from_db(user, db)

    return user


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    return _decode_token(credentials.credentials, db)


def get_print_user(
    token: str = Query(..., description="Bearer access token for browser-opened print views"),
    db: Session = Depends(get_db),
) -> User:
    """Auth dependency for /print endpoints — reads token from query param instead of header."""
    return _decode_token(token, db)


def require_permission(permission: str):
    """
    Dependency factory.  Usage:
        current_user: User = Depends(require_permission("orders:write"))
    Raises HTTP 403 if the resolved user does not hold the permission.
    """
    def _dep(current_user: User = Depends(get_current_user)) -> User:
        if not has_permission(current_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: requires '{permission}'",
            )
        return current_user

    return _dep


# ---------------------------------------------------------------------------
# Back-compat alias (kept so any stale imports don't break immediately)
# ---------------------------------------------------------------------------

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Deprecated — prefer require_permission('users:write')."""
    if not has_permission(current_user, "users:write"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user
