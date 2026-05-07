from collections import defaultdict
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import (
    ShoppingList, ShoppingListItem, Order, OrderItem, Product,
    PurchaseOrder, PurchaseOrderItem,
)


def get_or_create_shopping_list(list_date: date, user_id: str, db: Session) -> ShoppingList:
    sl = db.query(ShoppingList).filter(ShoppingList.list_date == list_date).first()
    if not sl:
        sl = ShoppingList(list_date=list_date, created_by=user_id)
        db.add(sl)
        db.commit()
        db.refresh(sl)
    return sl


def aggregate_orders_into_list(list_date: date, user_id: str, db: Session) -> ShoppingList:
    """
    Aggregate all confirmed orders for list_date into ShoppingListItems.
    Replaces any existing items for that day (idempotent — safe to re-run).
    """
    sl = get_or_create_shopping_list(list_date, user_id, db)

    # Delete existing items so we can recalculate cleanly
    db.query(ShoppingListItem).filter(
        ShoppingListItem.shopping_list_id == sl.id
    ).delete()

    # Aggregate confirmed order_items for the day
    rows = (
        db.query(
            Product.id.label("product_id"),
            Product.provider_id.label("provider_id"),
            func.sum(OrderItem.quantity).label("total_quantity"),
        )
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.order_date == list_date, Order.status == "confirmed")
        .group_by(Product.id, Product.provider_id)
        .all()
    )

    for row in rows:
        db.add(ShoppingListItem(
            shopping_list_id=sl.id,
            product_id=row.product_id,
            provider_id=row.provider_id,
            total_quantity=row.total_quantity,
        ))

    db.commit()
    db.refresh(sl)
    return sl


def create_purchase_orders_for_list(sl: ShoppingList, user_id: str, db: Session) -> None:
    """
    Create one PurchaseOrder per provider from a finalized ShoppingList.
    Each PO contains the items for that provider with final_quantity and
    a snapshotted unit_price from the product at finalization time.
    Idempotent — skips providers that already have a PO for this list.
    """
    by_provider: dict = defaultdict(list)
    for item in sl.items:
        by_provider[item.provider_id].append(item)

    for provider_id, items in by_provider.items():
        existing = db.query(PurchaseOrder).filter(
            PurchaseOrder.shopping_list_id == sl.id,
            PurchaseOrder.provider_id == provider_id,
        ).first()
        if existing:
            continue

        po = PurchaseOrder(
            shopping_list_id=sl.id,
            provider_id=provider_id,
            status="pending",
            created_by=user_id,
        )
        db.add(po)
        db.flush()

        for item in items:
            db.add(PurchaseOrderItem(
                purchase_order_id=po.id,
                product_id=item.product_id,
                quantity=item.final_quantity,
                unit_price=item.product.price,
            ))

    db.commit()