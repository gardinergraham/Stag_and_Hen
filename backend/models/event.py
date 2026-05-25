from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal
from datetime import datetime, timezone
import uuid
import secrets


class EventCreate(BaseModel):
    event_name: str = Field(..., min_length=2, max_length=100)
    event_type: Literal["stag", "hen"] = Field(...)
    bride_groom_name: str = Field(..., min_length=2, max_length=100)
    event_date: Optional[datetime] = None
    event_end_date: Optional[datetime] = None
    description: Optional[str] = None
    owner_name: str = Field(..., min_length=2, max_length=50)
    media_delete_policy: Literal["1_day", "1_week", "1_month", "never"] = Field(default="never")
    event_tier: Literal["one_day", "extended", "prime"] = Field(default="prime")
    event_tier_price: float = Field(default=95.0)


class EventUpdate(BaseModel):
    event_name: Optional[str] = None
    bride_groom_name: Optional[str] = None
    event_date: Optional[datetime] = None
    event_end_date: Optional[datetime] = None
    description: Optional[str] = None
    media_delete_policy: Optional[Literal["1_day", "1_week", "1_month", "never"]] = None
    event_tier: Optional[Literal["one_day", "extended", "prime"]] = None
    event_tier_price: Optional[float] = None


class Event(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_name: str
    event_type: Literal["stag", "hen"]
    bride_groom_name: str
    event_date: Optional[datetime] = None
    event_end_date: Optional[datetime] = None
    description: Optional[str] = None
    owner_name: str
    owner_pin: str = Field(default_factory=lambda: f"{secrets.randbelow(10000):04d}")
    access_pin: str = Field(default_factory=lambda: f"{secrets.randbelow(10000):04d}")
    media_delete_policy: Literal["1_day", "1_week", "1_month", "never"] = "never"
    event_tier: Literal["one_day", "extended", "prime"] = "prime"
    event_tier_price: float = Field(default=95.0)
    upload_extension_hours: int = Field(default=0)
    payment_status: Literal["pending", "paid", "failed"] = Field(default="pending")
    kitty_balance: float = Field(default=0.0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = Field(default=True)
