from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import (
    ShoppingList, ShoppingListItem, Order, OrderItem, Product
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