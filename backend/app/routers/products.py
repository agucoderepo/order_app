from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies.auth import require_permission
from app.models import Product, User
from app.schemas.product import (
    ProductCreate,
    ProductRead,
    ProductSearchResult,
    ProductUpdate,
)
from app.services import audit_service

router = APIRouter()


@router.get("/search", response_model=list[ProductSearchResult])
def search_products(
    q: str,
    limit: int = 25,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("products:read")),
):
    term = f"%{q.strip()}%"
    rows = (
        db.query(Product)
        .join(Product.provider)
        .filter(Product.is_active.is_(True), Product.name.ilike(term))
        .order_by(Product.name)
        .limit(limit)
        .all()
    )
    return [
        ProductSearchResult(
            id=r.id,
            name=r.name,
            unit=r.unit,
            price=r.price,
            provider_name=r.provider.name,
        )
        for r in rows
    ]


@router.get("/", response_model=list[ProductRead])
def list_products(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("products:read")),
):
    query = db.query(Product).options(joinedload(Product.provider)).order_by(Product.name)
    if active_only:
        query = query.filter(Product.is_active.is_(True))
    return query.offset(skip).limit(limit).all()


@router.post("/", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("products:write")),
):
    row = Product(
        name=payload.name,
        unit=payload.unit,
        price=payload.price,
        provider_id=payload.provider_id,
        created_by=current_user.id,
    )
    db.add(row)
    db.flush()
    audit_service.log(
        db, user=current_user,
        action="product.create",
        entity_type="product", entity_id=str(row.id),
        detail=f"name={row.name}",
    )
    db.commit()
    return (
        db.query(Product)
        .options(joinedload(Product.provider))
        .filter(Product.id == row.id)
        .first()
    )


@router.get("/{product_id}", response_model=ProductRead)
def get_product(
    product_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("products:read")),
):
    try:
        pid = uuid.UUID(product_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Product not found") from None
    row = (
        db.query(Product)
        .options(joinedload(Product.provider))
        .filter(Product.id == pid)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Product not found")
    return row


@router.patch("/{product_id}", response_model=ProductRead)
def update_product(
    product_id: str,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("products:write")),
):
    try:
        pid = uuid.UUID(product_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Product not found") from None
    row = db.query(Product).filter(Product.id == pid).first()
    if not row:
        raise HTTPException(status_code=404, detail="Product not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    audit_service.log(
        db, user=current_user,
        action="product.update",
        entity_type="product", entity_id=str(pid),
        detail=str(list(payload.model_dump(exclude_unset=True).keys())),
    )
    db.commit()
    return (
        db.query(Product)
        .options(joinedload(Product.provider))
        .filter(Product.id == pid)
        .first()
    )
