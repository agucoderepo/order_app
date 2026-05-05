from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID
 
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.schemas import TimestampMixin

from  app.schemas.product import ProductSummary
from  app.schemas.client import ClientSummary

ORDER_STATUSES = {"draft", "confirmed", "delivered"}
ORDER_SOURCES  = {"manual", "whatsapp"}
 
 
class OrderItemBase(BaseModel):
    product_id: UUID
    quantity: Decimal = Field(gt=0, decimal_places=3)
    notes: Optional[str] = None
 
 
class OrderItemCreate(OrderItemBase):
    """unit_price is NOT provided by the client — snapshotted from the DB."""
    pass
 
 
class OrderItemRead(OrderItemBase):
    id: UUID
    unit_price: Decimal
    product: ProductSummary
 
    model_config = {"from_attributes": True}
 
 
class OrderBase(BaseModel):
    client_id: UUID
    order_date: date = Field(default_factory=date.today)
    notes: Optional[str] = None
 
 
class OrderCreate(OrderBase):
    items: list[OrderItemCreate] = Field(min_length=1)
    source: str = Field(default="manual")
    raw_whatsapp_text: Optional[str] = None
 
    @field_validator("source")
    @classmethod
    def validate_source(cls, v: str) -> str:
        if v not in ORDER_SOURCES:
            raise ValueError(f"source must be one of {ORDER_SOURCES}")
        return v
 
    @model_validator(mode="after")
    def whatsapp_requires_raw_text(self) -> "OrderCreate":
        if self.source == "whatsapp" and not self.raw_whatsapp_text:
            raise ValueError("raw_whatsapp_text is required when source is 'whatsapp'")
        return self
 
 
class OrderUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    items: Optional[list[OrderItemCreate]] = None
 
    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ORDER_STATUSES:
            raise ValueError(f"status must be one of {ORDER_STATUSES}")
        return v
 
 
class OrderRead(OrderBase, TimestampMixin):
    id: UUID
    status: str
    source: str
    created_by: UUID
    client: ClientSummary
    items: list[OrderItemRead]
 
    model_config = {"from_attributes": True}
 
 
class OrderSummary(BaseModel):
    """Lightweight — for list endpoints and shopping list views."""
    id: UUID
    order_date: date
    status: str
    source: str
    client: ClientSummary
    item_count: int
    total_amount: Decimal
 
    model_config = {"from_attributes": True}


class WhatsAppParseRequest(BaseModel):
    text: str = Field(min_length=5)
 
 
class ParsedOrderItem(BaseModel):
    """One extracted item from the WhatsApp message."""
    product_hint: str                       # Raw text from the message
    quantity: Decimal
    unit_hint: Optional[str] = None
    matched_product: Optional[ProductSummary] = None   # None if no match found
    match_score: int = Field(ge=0, le=100)  # rapidfuzz confidence 0–100
    needs_review: bool                      # True if score < 85 or no match
 
 
class WhatsAppParseResponse(BaseModel):
    """
    Returned by POST /orders/parse-whatsapp.
    Frontend displays this as a draft for user review before confirming.
    """
    client_hint: Optional[str] = None
    items: list[ParsedOrderItem]
    raw_text: str