from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models import Invoice, Order, OrderItem, Product, User
from app.schemas.invoice import InvoiceRead, InvoiceSummary, InvoiceUpdate
from app.schemas.order import OrderItemRead

router = APIRouter()


def _invoice_read(db: Session, inv_id: uuid.UUID) -> InvoiceRead:
    inv = (
        db.query(Invoice)
        .options(
            joinedload(Invoice.client),
            joinedload(Invoice.order)
            .joinedload(Order.items)
            .joinedload(OrderItem.product)
            .joinedload(Product.provider),
        )
        .filter(Invoice.id == inv_id)
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    items = [OrderItemRead.model_validate(x) for x in inv.order.items]
    return InvoiceRead(
        id=inv.id,
        order_id=inv.order_id,
        client=inv.client,
        invoice_number=inv.invoice_number,
        total_amount=inv.total_amount,
        status=inv.status,
        pdf_path=inv.pdf_path,
        created_by=inv.created_by,
        created_at=inv.created_at,
        order_date=inv.order.order_date,
        items=items,
    )


@router.get("/", response_model=list[InvoiceSummary])
def list_invoices(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = (
        db.query(Invoice)
        .options(
            joinedload(Invoice.client),
            joinedload(Invoice.order),
        )
        .order_by(Invoice.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        InvoiceSummary(
            id=inv.id,
            invoice_number=inv.invoice_number,
            client=inv.client,
            order_date=inv.order.order_date,
            total_amount=inv.total_amount,
            status=inv.status,
            pdf_path=inv.pdf_path,
        )
        for inv in rows
    ]


@router.get("/{invoice_id}", response_model=InvoiceRead)
def get_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    try:
        iid = uuid.UUID(invoice_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Invoice not found") from None
    return _invoice_read(db, iid)


@router.patch("/{invoice_id}", response_model=InvoiceRead)
def update_invoice(
    invoice_id: str,
    payload: InvoiceUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    try:
        iid = uuid.UUID(invoice_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Invoice not found") from None
    inv = db.query(Invoice).filter(Invoice.id == iid).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if payload.status is not None:
        inv.status = payload.status
    db.commit()
    return _invoice_read(db, iid)
