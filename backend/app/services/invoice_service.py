from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models import Invoice, Order


def create_invoices_for_list(
    list_date,
    finalize_count: int,
    user_id: str,
    db: Session,
    *,
    order_owner_id: Optional[str] = None,
) -> None:
    """
    Create one Invoice per confirmed order for the given date.

    order_owner_id — when set, only invoice orders created by that user
                     (operator mode). When None, invoice all confirmed orders
                     for the date (admin mode).

    finalize_count > 1 means re-finalization; invoice number gets -UPDn suffix.
    Existing invoices for these orders are replaced (idempotent).
    """
    now = datetime.now(timezone.utc)
    date_part = now.strftime("%Y%m%d")
    time_part = now.strftime("%H%M%S")
    suffix = f"-UPD{finalize_count}" if finalize_count > 1 else ""

    orders_q = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.order_date == list_date, Order.status == "confirmed")
    )
    if order_owner_id:
        orders_q = orders_q.filter(Order.created_by == order_owner_id)
    orders = orders_q.all()

    if not orders:
        return

    # Delete existing invoices for these orders before recreating
    order_ids_q = db.query(Order.id).filter(
        Order.order_date == list_date,
        Order.status == "confirmed",
    )
    if order_owner_id:
        order_ids_q = order_ids_q.filter(Order.created_by == order_owner_id)

    db.query(Invoice).filter(
        Invoice.order_id.in_(order_ids_q)
    ).delete(synchronize_session="fetch")
    db.flush()

    for order in orders:
        total = Decimal("0")
        for item in order.items:
            line = item.unit_price * item.quantity * (1 - item.discount / Decimal("100"))
            total += line

        short_id = str(order.id).replace("-", "")[:6].upper()
        invoice_number = f"INV-{date_part}-{time_part}-{short_id}{suffix}"

        db.add(Invoice(
            order_id=order.id,
            client_id=order.client_id,
            invoice_number=invoice_number,
            total_amount=total.quantize(Decimal("0.01")),
            status="draft",
            created_by=user_id,
        ))

    db.commit()


def delete_invoices_for_date(
    list_date,
    db: Session,
    *,
    order_owner_id: Optional[str] = None,
) -> None:
    """
    Remove invoices for confirmed orders on a given date (called on reopen).

    order_owner_id — when set, only delete invoices for orders created by
                     that user (operator mode).
    """
    order_ids_q = db.query(Order.id).filter(
        Order.order_date == list_date,
        Order.status == "confirmed",
    )
    if order_owner_id:
        order_ids_q = order_ids_q.filter(Order.created_by == order_owner_id)

    db.query(Invoice).filter(
        Invoice.order_id.in_(order_ids_q)
    ).delete(synchronize_session="fetch")
