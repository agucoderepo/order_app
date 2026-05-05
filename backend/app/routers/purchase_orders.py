from __future__ import annotations

import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models import Product, PurchaseOrder, PurchaseOrderItem, User
from app.schemas.purchase_order import (
    PurchaseOrderItemRead,
    PurchaseOrderRead,
    PurchaseOrderSummary,
    PurchaseOrderUpdate,
)

router = APIRouter()


def _po_detail(db: Session, pid: uuid.UUID) -> PurchaseOrderRead:
    po = (
        db.query(PurchaseOrder)
        .options(
            joinedload(PurchaseOrder.shopping_list),
            joinedload(PurchaseOrder.provider),
            joinedload(PurchaseOrder.items)
            .joinedload(PurchaseOrderItem.product)
            .joinedload(Product.provider),
        )
        .filter(PurchaseOrder.id == pid)
        .first()
    )
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    items = [
        PurchaseOrderItemRead(
            id=i.id,
            product=i.product,
            quantity=i.quantity,
            unit_price=i.unit_price,
            line_total=i.quantity * i.unit_price,
        )
        for i in po.items
    ]
    total_amount = sum((i.line_total for i in items), start=Decimal("0"))
    return PurchaseOrderRead(
        id=po.id,
        shopping_list_id=po.shopping_list_id,
        provider=po.provider,
        status=po.status,
        pdf_path=po.pdf_path,
        created_by=po.created_by,
        created_at=po.created_at,
        items=items,
        total_amount=total_amount,
    )


@router.get("/", response_model=list[PurchaseOrderSummary])
def list_purchase_orders(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = (
        db.query(PurchaseOrder)
        .options(
            joinedload(PurchaseOrder.shopping_list),
            joinedload(PurchaseOrder.provider),
            joinedload(PurchaseOrder.items),
        )
        .order_by(PurchaseOrder.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        PurchaseOrderSummary(
            id=po.id,
            list_date=po.shopping_list.list_date,
            provider=po.provider,
            status=po.status,
            total_amount=sum(
                (i.quantity * i.unit_price for i in po.items), start=Decimal("0")
            ),
            pdf_path=po.pdf_path,
        )
        for po in rows
    ]


@router.get("/{po_id}", response_model=PurchaseOrderRead)
def get_purchase_order(
    po_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    try:
        pid = uuid.UUID(po_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Purchase order not found") from None
    return _po_detail(db, pid)


@router.patch("/{po_id}", response_model=PurchaseOrderRead)
def update_purchase_order(
    po_id: str,
    payload: PurchaseOrderUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    try:
        pid = uuid.UUID(po_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Purchase order not found") from None
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == pid).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if payload.status is not None:
        po.status = payload.status
    db.commit()
    return _po_detail(db, pid)
