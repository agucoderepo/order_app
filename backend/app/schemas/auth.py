from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID
 
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from app.schemas import TimestampMixin

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
 
 
class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: str = Field(default="operator")
 
    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        allowed = {"admin", "operator"}
        if v not in allowed:
            raise ValueError(f"role must be one of {allowed}")
        return v

    @field_validator("password")
    @classmethod
    def validate_password_utf8_bytes(cls, v: str) -> str:
        # bcrypt only supports passwords up to 72 bytes.
        if len(v.encode("utf-8")) > 72:
            raise ValueError("password must be at most 72 bytes in UTF-8")
        return v
 
 
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int      # seconds until access token expiry
 
 
class RefreshRequest(BaseModel):
    refresh_token: str
 
 
class GoogleCallbackRequest(BaseModel):
    """Query params received from Google OAuth redirect."""
    code: str
    state: Optional[str] = None
 