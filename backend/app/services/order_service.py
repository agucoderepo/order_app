from __future__ import annotations

import uuid
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models import Client, Order, OrderItem, Product
from app.schemas.order import OrderCreate, OrderUpdate


def _orders_with_relations(db: Session):
    return db.query(Order).options(
        joinedload(Order.client),
        joinedload(Order.items)
        .joinedload(OrderItem.product)
        .joinedload(Product.provider),
    )


def list_orders(db: Session, *, skip: int = 0, limit: int = 50) -> list[Order]:
    return (
        _orders_with_relations(db)
        .order_by(Order.order_date.desc(), Order.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_order_or_404(db: Session, order_id: str) -> Order:
    try:
        oid = uuid.UUID(order_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        ) from None
    order = _orders_with_relations(db).filter(Order.id == oid).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )
    return order


def _load_products_for_lines(
    db: Session, product_ids: list[uuid.UUID]
) -> dict[uuid.UUID, Product]:
    if not product_ids:
        return {}
    rows = (
        db.query(Product)
        .options(joinedload(Product.provider))
        .filter(Product.id.in_(product_ids))
        .all()
    )
    return {p.id: p for p in rows}


def create_order(
    db: Session, payload: OrderCreate, *, created_by: uuid.UUID
) -> Order:
    client = db.query(Client).filter(Client.id == payload.client_id).first()
    if not client or not client.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Client not found or inactive",
        )

    product_ids = [line.product_id for line in payload.items]
    if len(product_ids) != len(set(product_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate product in order lines",
        )

    products = _load_products_for_lines(db, product_ids)
    missing = [pid for pid in product_ids if pid not in products]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more products not found",
        )
    for p in products.values():
        if not p.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product {p.id} is inactive",
            )

    order = Order(
        client_id=payload.client_id,
        created_by=created_by,
        order_date=payload.order_date,
        status="draft",
        source=payload.source,
        raw_whatsapp_text=payload.raw_whatsapp_text,
        notes=payload.notes,
    )
    db.add(order)
    db.flush()

    for line in payload.items:
        prod = products[line.product_id]
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=line.product_id,
                quantity=line.quantity,
                unit_price=Decimal(str(prod.price)),
                discount=line.discount,
                notes=line.notes,
            )
        )

    db.commit()
    db.refresh(order)
    return get_order_or_404(db, str(order.id))


def update_order(db: Session, order: Order, payload: OrderUpdate) -> Order:
    if payload.status is not None:
        order.status = payload.status
    if payload.notes is not None:
        order.notes = payload.notes

    if payload.items is not None:
        if len(payload.items) < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="items must contain at least one line when provided",
            )
        product_ids = [line.product_id for line in payload.items]
        if len(product_ids) != len(set(product_ids)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate product in order lines",
            )
        products = _load_products_for_lines(db, product_ids)
        missing = [pid for pid in product_ids if pid not in products]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more products not found",
            )
        for p in products.values():
            if not p.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product {p.id} is inactive",
                )

        db.query(OrderItem).filter(OrderItem.order_id == order.id).delete()
        for line in payload.items:
            prod = products[line.product_id]
            db.add(
                OrderItem(
                    order_id=order.id,
                    product_id=line.product_id,
                    quantity=line.quantity,
                    unit_price=Decimal(str(prod.price)),
                    discount=line.discount,
                    notes=line.notes,
                )
            )

    db.commit()
    return get_order_or_404(db, str(order.id))
