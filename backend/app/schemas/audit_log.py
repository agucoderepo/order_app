from datetime import datetime
from pydantic import BaseModel


class AuditLogRead(BaseModel):
    id: str
    user_id: str
    user_email: str
    action: str
    entity_type: str | None
    entity_id: str | None
    detail: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
