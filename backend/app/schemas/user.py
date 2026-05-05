from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID
 
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.schemas import TimestampMixin

class UserBase(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    role: str = Field(default="operator")
    is_active: bool = True
 
    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in {"admin", "operator"}:
            raise ValueError("role must be 'admin' or 'operator'")
        return v
 
 
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)
 
 
class UserUpdate(BaseModel):
    """All fields optional for PATCH."""
    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)
 
    @field_validator("role")
    @classmethod
    def validate_role(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in {"admin", "operator"}:
            raise ValueError("role must be 'admin' or 'operator'")
        return v
 
 
class UserRead(UserBase, TimestampMixin):
    id: UUID
 
    model_config = {"from_attributes": True}
 
 
class UserSummary(BaseModel):
    """Lightweight — used inside nested relations."""
    id: UUID
    name: str
    email: EmailStr
 
    model_config = {"from_attributes": True}
 
 
