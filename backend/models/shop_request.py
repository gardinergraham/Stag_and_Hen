from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal
from datetime import datetime, timezone
import uuid


class ShopRequestCreate(BaseModel):
    event_id: Optional[str] = None
    event_name: Optional[str] = None
    requester_name: str = Field(..., min_length=1, max_length=80)
    product_name: str = Field(..., min_length=2, max_length=200)
    product_url: Optional[str] = None
    notes: Optional[str] = None


class ShopRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: Optional[str] = None
    event_name: Optional[str] = None
    requester_name: str
    product_name: str
    product_url: Optional[str] = None
    notes: Optional[str] = None
    status: Literal["pending", "approved", "rejected"] = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
