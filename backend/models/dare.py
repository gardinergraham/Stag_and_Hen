from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal
from datetime import datetime, timezone
import uuid


DareCategory = Literal["warmup", "photo", "cheeky", "drinks"]
DareEventType = Literal["all", "stag", "hen"]


class DareCreate(BaseModel):
    text: str = Field(..., min_length=3, max_length=500)
    category: DareCategory = Field(default="warmup")
    event_type: DareEventType = Field(default="all")
    event_id: Optional[str] = None


class Dare(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    category: DareCategory = "warmup"
    event_type: DareEventType = "all"
    event_id: Optional[str] = None
    created_by: Literal["admin", "owner"] = "admin"
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
