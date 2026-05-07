from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import date, datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models import Product, PurchaseOrder, ShoppingList, ShoppingListItem, User
from app.schemas.shopping_list import (
    ProviderGroup,
    ShoppingListItemAdjust,
    ShoppingListItemRead,
    ShoppingListRead,
)
from app.services import audit_service, shopping_list_service

router = APIRouter()


def _list_with_items(db: Session, list_date: date) -> ShoppingList | None:
    return (
        db.query(ShoppingList)
        .options(
            joinedload(ShoppingList.items)
            .joinedload(ShoppingListItem.product)
            .joinedload(Product.provider),
            joinedload(ShoppingList.items).joinedload(ShoppingListItem.provider),
        )
        .filter(ShoppingList.list_date == list_date)
        .first()
    )


def _to_read(sl: ShoppingList) -> ShoppingListRead:
    by_provider: dict[object, list[ShoppingListItem]] = defaultdict(list)
    for it in sl.items:
        by_provider[it.provider_id].append(it)
    groups: list[ProviderGroup] = []
    for items in by_provider.values():
        prov = items[0].provider
        reads: list[ShoppingListItemRead] = []
        subtotal = Decimal("0")
        for it in items:
            reads.append(ShoppingListItemRead.model_validate(it))
            subtotal += it.final_quantity * it.product.price
        groups.append(
            ProviderGroup(provider=prov, items=reads, subtotal=subtotal)
        )
    groups.sort(key=lambda g: g.provider.name)
    return ShoppingListRead(
        id=sl.id,
        list_date=sl.list_date,
        status=sl.status,
        created_by=sl.created_by,
        finalized_at=sl.finalized_at,
        created_at=sl.created_at,
        by_provider=groups,
    )


@router.post("/{list_date}/aggregate", response_model=ShoppingListRead)
def aggregate_list(
    list_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shopping_list_service.aggregate_orders_into_list(
        list_date, str(current_user.id), db
    )
    sl = _list_with_items(db, list_date)
    if not sl:
        raise HTTPException(status_code=404, detail="Shopping list not found")
    audit_service.log(
        db, user=current_user,
        action="shopping_list.aggregate",
        entity_type="shopping_list", entity_id=str(sl.id),
        detail=str(list_date),
    )
    db.commit()
    return _to_read(sl)


@router.get("/{list_date}", response_model=ShoppingListRead)
def get_list(
    list_date: date,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    sl = _list_with_items(db, list_date)
    if not sl:
        raise HTTPException(status_code=404, detail="Shopping list not found")
    return _to_read(sl)


@router.patch(
    "/{list_date}/items/{item_id}",
    response_model=ShoppingListRead,
)
def adjust_item(
    list_date: date,
    item_id: str,
    payload: ShoppingListItemAdjust,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        iid = uuid.UUID(item_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Item not found") from None
    sl = _list_with_items(db, list_date)
    if not sl:
        raise HTTPException(status_code=404, detail="Shopping list not found")
    item = next((i for i in sl.items if i.id == iid), None)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if payload.adjusted_quantity is not None:
        item.adjusted_quantity = payload.adjusted_quantity
    if payload.notes is not None:
        item.notes = payload.notes
    audit_service.log(
        db, user=current_user,
        action="shopping_list.adjust_item",
        entity_type="shopping_list_item", entity_id=str(iid),
        detail=f"adj_qty={payload.adjusted_quantity} notes={payload.notes}",
    )
    db.commit()
    sl = _list_with_items(db, list_date)
    assert sl is not None
    return _to_read(sl)


@router.patch("/{list_date}/finalize", response_model=ShoppingListRead)
def finalize_list(
    list_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sl = _list_with_items(db, list_date)
    if not sl:
        raise HTTPException(status_code=404, detail="Shopping list not found")
    if sl.status == "finalized":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="List already finalized",
        )
    sl.status = "finalized"
    sl.finalized_at = datetime.now(timezone.utc)
    audit_service.log(
        db, user=current_user,
        action="shopping_list.finalize",
        entity_type="shopping_list", entity_id=str(sl.id),
        detail=str(list_date),
    )
    db.commit()
    sl = _list_with_items(db, list_date)
    assert sl is not None
    shopping_list_service.create_purchase_orders_for_list(sl, str(current_user.id), db)
    sl = _list_with_items(db, list_date)
    assert sl is not None
    return _to_read(sl)


@router.patch("/{list_date}/reopen", response_model=ShoppingListRead)
def reopen_list(
    list_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sl = _list_with_items(db, list_date)
    if not sl:
        raise HTTPException(status_code=404, detail="Shopping list not found")
    if sl.status != "finalized":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="List is not finalized",
        )
    # Delete all purchase orders (and their items via DB CASCADE) for this list
    db.query(PurchaseOrder).filter(
        PurchaseOrder.shopping_list_id == sl.id
    ).delete(synchronize_session="fetch")
    sl.status = "open"
    sl.finalized_at = None
    audit_service.log(
        db, user=current_user,
        action="shopping_list.reopen",
        entity_type="shopping_list", entity_id=str(sl.id),
        detail=str(list_date),
    )
    db.commit()
    sl = _list_with_items(db, list_date)
    assert sl is not None
    return _to_read(sl)
