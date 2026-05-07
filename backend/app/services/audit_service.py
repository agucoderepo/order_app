from sqlalchemy.orm import Session
from app.models import AuditLog, User


def log(
    db: Session,
    *,
    user: User,
    action: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    detail: str | None = None,
) -> None:
    """Append an audit entry. Does not commit — caller controls the transaction."""
    db.add(AuditLog(
        user_id=user.id,
        user_email=user.email,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        detail=detail,
    ))
