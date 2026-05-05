from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID
 
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from  app.schemas.product import ProductSummary
from  app.schemas.provider import ProviderSummary


PO_STATUSES = {"pending", "sent", "received"}
 
 
class PurchaseOrderItemRead(BaseModel):
    id: UUID
    product: ProductSummary
    quantity: Decimal
    unit_price: Decimal
    line_total: Decimal             # quantity * unit_price — computed in service
 
    model_config = {"from_attributes": True}
 
 
class PurchaseOrderRead(BaseModel):
    id: UUID
    shopping_list_id: UUID
    provider: ProviderSummary
    status: str
    pdf_path: Optional[str] = None
    created_by: UUID
    created_at: datetime
    items: list[PurchaseOrderItemRead]
    total_amount: Decimal
 
    model_config = {"from_attributes": True}
 
 
class PurchaseOrderSummary(BaseModel):
    id: UUID
    list_date: date
    provider: ProviderSummary
    status: str
    total_amount: Decimal
    pdf_path: Optional[str] = None
 
    model_config = {"from_attributes": True}
 
 
class PurchaseOrderUpdate(BaseModel):
    status: Optional[str] = None
 
    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in PO_STATUSES:
            raise ValueError(f"status must be one of {PO_STATUSES}")
        return v