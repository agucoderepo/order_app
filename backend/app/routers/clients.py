from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import require_permission
from app.models import Client, User
from app.schemas.client import ClientCreate, ClientRead, ClientUpdate
from app.services import audit_service

router = APIRouter()


@router.get("/", response_model=list[ClientRead])
def list_clients(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("clients:read")),
):
    q = db.query(Client).order_by(Client.name)
    if active_only:
        q = q.filter(Client.is_active.is_(True))
    return q.offset(skip).limit(limit).all()


@router.post("/", response_model=ClientRead, status_code=status.HTTP_201_CREATED)
def create_client(
    payload: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("clients:write")),
):
    row = Client(
        name=payload.name,
        address=payload.address,
        phone=payload.phone,
        notes=payload.notes,
        created_by=current_user.id,
    )
    db.add(row)
    db.flush()
    audit_service.log(
        db, user=current_user,
        action="client.create",
        entity_type="client", entity_id=str(row.id),
        detail=f"name={row.name}",
    )
    db.commit()
    db.refresh(row)
    return row


@router.get("/{client_id}", response_model=ClientRead)
def get_client(
    client_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("clients:read")),
):
    try:
        cid = uuid.UUID(client_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Client not found") from None
    row = db.query(Client).filter(Client.id == cid).first()
    if not row:
        raise HTTPException(status_code=404, detail="Client not found")
    return row


@router.patch("/{client_id}", response_model=ClientRead)
def update_client(
    client_id: str,
    payload: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("clients:write")),
):
    try:
        cid = uuid.UUID(client_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Client not found") from None
    row = db.query(Client).filter(Client.id == cid).first()
    if not row:
        raise HTTPException(status_code=404, detail="Client not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    audit_service.log(
        db, user=current_user,
        action="client.update",
        entity_type="client", entity_id=str(cid),
        detail=str(list(payload.model_dump(exclude_unset=True).keys())),
    )
    db.commit()
    db.refresh(row)
    return row
