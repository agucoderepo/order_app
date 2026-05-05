
from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID
 
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.schemas import TimestampMixin

from  app.schemas.product import ProductSummary
from  app.schemas.provider import ProviderSummary

class ShoppingListItemRead(BaseModel):
    id: UUID
    product: ProductSummary
    provider: ProviderSummary
    total_quantity: Decimal         # System-calculated sum from orders
    adjusted_quantity: Optional[Decimal] = None   # Operator override
    final_quantity: Decimal         # COALESCE(adjusted, total) — computed property
    notes: Optional[str] = None
 
    model_config = {"from_attributes": True}
 
 
class ShoppingListItemAdjust(BaseModel):
    """PATCH body to override a quantity or add a note."""
    adjusted_quantity: Optional[Decimal] = Field(default=None, gt=0, decimal_places=3)
    notes: Optional[str] = None
 
 
class ProviderGroup(BaseModel):
    """Shopping list items grouped by provider — used in the end-of-day view."""
    provider: ProviderSummary
    items: list[ShoppingListItemRead]
    subtotal: Decimal               # Sum of final_quantity * unit_price for this provider
 
 
class ShoppingListRead(BaseModel):
    id: UUID
    list_date: date
    status: str
    created_by: UUID
    finalized_at: Optional[datetime] = None
    created_at: datetime
    by_provider: list[ProviderGroup]   # Items pre-grouped for the frontend
 
    model_config = {"from_attributes": True}
 
 
class ShoppingListSummary(BaseModel):
    id: UUID
    list_date: date
    status: str
    total_items: int
    total_amount: Decimal
    finalized_at: Optional[datetime] = None
 
    model_config = {"from_attributes": True}