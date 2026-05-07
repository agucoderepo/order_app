from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session, joinedload

from app.models import Invoice, Order


def create_invoices_for_list(list_date, finalize_count: int, user_id: str, db: Session) -> None:
    """
    Create one Invoice per confirmed order for the given date.

    finalize_count is the shopping list's finalize_count AFTER incrementing.
    If > 1 this is a re-finalization and the invoice number gets a -UPDn suffix.

    Any existing invoices for these orders are replaced (idempotent).
    """
    now = datetime.now(timezone.utc)
    date_part = now.strftime("%Y%m%d")
    time_part = now.strftime("%H%M%S")
    suffix = f"-UPD{finalize_count}" if finalize_count > 1 else ""

    orders = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.order_date == list_date, Order.status == "confirmed")
        .all()
    )

    if not orders:
        return

    # Delete any existing invoices for these orders before recreating
    confirmed_order_ids = db.query(Order.id).filter(
        Order.order_date == list_date,
        Order.status == "confirmed",
    )
    db.query(Invoice).filter(
        Invoice.order_id.in_(confirmed_order_ids)
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


def delete_invoices_for_date(list_date, db: Session) -> None:
    """Remove all invoices for confirmed orders on a given date (called on reopen)."""
    confirmed_order_ids = db.query(Order.id).filter(
        Order.order_date == list_date,
        Order.status == "confirmed",
    )
    db.query(Invoice).filter(
        Invoice.order_id.in_(confirmed_order_ids)
    ).delete(synchronize_session="fetch")
