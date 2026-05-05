from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models import User
from app.schemas.order import OrderCreate, OrderRead, OrderUpdate
from app.services import order_service, whatsapp_parser

router = APIRouter()


@router.get("/", response_model=list[OrderRead])
def list_orders(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return order_service.list_orders(db, skip=skip, limit=limit)


@router.post("/", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return order_service.create_order(db, payload, created_by=current_user.id)


@router.post("/parse-whatsapp")
def parse_whatsapp(
    body: dict,                               # { "text": "..." }
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Parse a raw WhatsApp message and return a draft order for review.
    Does NOT save anything — the frontend displays the draft and the
    user confirms it via POST /orders/.
    """
    return whatsapp_parser.parse_whatsapp_message(body["text"], db)


@router.patch("/{order_id}", response_model=OrderRead)
def update_order(
    order_id: str,
    payload: OrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = order_service.get_order_or_404(db, order_id)
    return order_service.update_order(db, order, payload)