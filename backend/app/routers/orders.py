from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import has_permission, require_permission
from app.models import User
from app.schemas.order import OrderCreate, OrderRead, OrderUpdate
from app.services import audit_service, order_service, whatsapp_parser

router = APIRouter()


@router.get("/", response_model=list[OrderRead])
def list_orders(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("orders:read")),
):
    # Users with orders:read:all see every order; others see only their own.
    owner_id = None if has_permission(current_user, "orders:read:all") else current_user.id
    return order_service.list_orders(db, skip=skip, limit=limit, owner_id=owner_id)


@router.post("/", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("orders:write")),
):
    order = order_service.create_order(db, payload, created_by=current_user.id)
    audit_service.log(
        db, user=current_user,
        action="order.create",
        entity_type="order", entity_id=str(order.id),
        detail=f"client_id={order.client_id} status={order.status}",
    )
    db.commit()
    return order


@router.post("/parse-whatsapp")
def parse_whatsapp(
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("orders:parse")),
):
    return whatsapp_parser.parse_whatsapp_message(body["text"], db)


@router.patch("/{order_id}", response_model=OrderRead)
def update_order(
    order_id: str,
    payload: OrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("orders:write")),
):
    order = order_service.get_order_or_404(db, order_id)
    # Without orders:write:all, users can only modify orders they created.
    if not has_permission(current_user, "orders:write:all") and \
            str(order.created_by) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    old_status = order.status
    updated = order_service.update_order(db, order, payload)
    detail = f"status={old_status}->{updated.status}" \
        if payload.status and old_status != updated.status else None
    audit_service.log(
        db, user=current_user,
        action="order.update",
        entity_type="order", entity_id=str(updated.id),
        detail=detail,
    )
    db.commit()
    return updated
