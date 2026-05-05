from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models import Provider, User
from app.schemas.provider import ProviderCreate, ProviderRead, ProviderUpdate

router = APIRouter()


@router.get("/", response_model=list[ProviderRead])
def list_providers(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Provider).order_by(Provider.name)
    if active_only:
        q = q.filter(Provider.is_active.is_(True))
    return q.offset(skip).limit(limit).all()


@router.post("/", response_model=ProviderRead, status_code=status.HTTP_201_CREATED)
def create_provider(
    payload: ProviderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = Provider(
        name=payload.name,
        contact_name=payload.contact_name,
        phone=payload.phone,
        notes=payload.notes,
        created_by=current_user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/{provider_id}", response_model=ProviderRead)
def get_provider(
    provider_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    try:
        pid = uuid.UUID(provider_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Provider not found") from None
    row = db.query(Provider).filter(Provider.id == pid).first()
    if not row:
        raise HTTPException(status_code=404, detail="Provider not found")
    return row


@router.patch("/{provider_id}", response_model=ProviderRead)
def update_provider(
    provider_id: str,
    payload: ProviderUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    try:
        pid = uuid.UUID(provider_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Provider not found") from None
    row = db.query(Provider).filter(Provider.id == pid).first()
    if not row:
        raise HTTPException(status_code=404, detail="Provider not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row
