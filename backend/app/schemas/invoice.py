from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID
 
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.schemas import TimestampMixin

from  app.schemas.client import ClientSummary
from app.schemas.order import OrderItemRead
 

INVOICE_STATUSES = {"draft", "sent", "paid"}
 
 
class InvoiceRead(BaseModel):
    id: UUID
    order_id: UUID
    client: ClientSummary
    invoice_number: str
    total_amount: Decimal
    status: str
    pdf_path: Optional[str] = None
    created_by: UUID
    created_at: datetime
    # Denormalised for the PDF view — pulls from the related order
    order_date: date
    items: list[OrderItemRead]
 
    model_config = {"from_attributes": True}
 
 
class InvoiceSummary(BaseModel):
    id: UUID
    invoice_number: str
    client: ClientSummary
    order_date: date
    total_amount: Decimal
    status: str
    pdf_path: Optional[str] = None
 
    model_config = {"from_attributes": True}
 
 
class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
 
    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in INVOICE_STATUSES:
            raise ValueError(f"status must be one of {INVOICE_STATUSES}")
        return v
 