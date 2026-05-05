from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models import Product, User
from app.schemas.product import (
    ProductCreate,
    ProductRead,
    ProductSearchResult,
    ProductUpdate,
)

router = APIRouter()


@router.get("/search", response_model=list[ProductSearchResult])
def search_products(
    q: str,
    limit: int = 25,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
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
    _: User = Depends(get_current_user),
):
    query = db.query(Product).options(joinedload(Product.provider)).order_by(Product.name)
    if active_only:
        query = query.filter(Product.is_active.is_(True))
    return query.offset(skip).limit(limit).all()


@router.post("/", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = Product(
        name=payload.name,
        unit=payload.unit,
        price=payload.price,
        provider_id=payload.provider_id,
        created_by=current_user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
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
    _: User = Depends(get_current_user),
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
    _: User = Depends(get_current_user),
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
    db.commit()
    return (
        db.query(Product)
        .options(joinedload(Product.provider))
        .filter(Product.id == pid)
        .first()
    )
