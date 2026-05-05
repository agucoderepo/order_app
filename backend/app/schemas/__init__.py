"""
Pydantic v2 schemas for the Order Management App.
 
Conventions used throughout:
- *Base     — shared fields, not used directly
- *Create   — request body for POST (fields required to create)
- *Update   — request body for PATCH (all fields optional)
- *Read     — response model (includes id, timestamps, nested relations)
- *Summary  — lightweight response for list endpoints (no deep nesting)
 
All UUIDs are str in schemas (serialized from Python uuid.UUID).
Decimals use Python Decimal for precision; serialized as float in JSON.
"""
 
from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID
 
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
 
 
# ---------------------------------------------------------------------------
# Shared base
# ---------------------------------------------------------------------------
 
class TimestampMixin(BaseModel):
    created_at: datetime
    updated_at: Optional[datetime] = None
 
 