from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID
 
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.schemas import TimestampMixin

class ClientBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    address: Optional[str] = Field(default=None, max_length=255)
    phone: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = None
 
 
class ClientCreate(ClientBase):
    pass
 
 
class ClientUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    address: Optional[str] = Field(default=None, max_length=255)
    phone: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = None
    is_active: Optional[bool] = None
 
 
class ClientRead(ClientBase, TimestampMixin):
    id: UUID
    is_active: bool
    created_by: UUID
 
    model_config = {"from_attributes": True}
 
 
class ClientSummary(BaseModel):
    id: UUID
    name: str
    phone: Optional[str] = None
 
    model_config = {"from_attributes": True}