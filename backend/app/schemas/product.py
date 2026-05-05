from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID
 
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.schemas import TimestampMixin
from app.schemas.provider import ProviderSummary


class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    unit: str = Field(min_length=1, max_length=50)
    price: Decimal = Field(gt=0, decimal_places=2)
    provider_id: UUID
 
 
class ProductCreate(ProductBase):
    pass
 
 
class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    unit: Optional[str] = Field(default=None, min_length=1, max_length=50)
    price: Optional[Decimal] = Field(default=None, gt=0, decimal_places=2)
    provider_id: Optional[UUID] = None
    is_active: Optional[bool] = None
 
 
class ProductRead(ProductBase, TimestampMixin):
    id: UUID
    is_active: bool
    created_by: UUID
    provider: ProviderSummary
 
    model_config = {"from_attributes": True}
 
 
class ProductSummary(BaseModel):
    """Used in order item and shopping list responses."""
    id: UUID
    name: str
    unit: str
    price: Decimal
    provider: ProviderSummary
 
    model_config = {"from_attributes": True}
 
 
class ProductSearchResult(BaseModel):
    """Returned by GET /products/search — optimised for mobile order entry."""
    id: UUID
    name: str
    unit: str
    price: Decimal
    provider_name: str
 
    model_config = {"from_attributes": True}