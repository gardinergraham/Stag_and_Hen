from pydantic import BaseModel, Field, ConfigDict
from typing import Literal
from datetime import datetime, timezone
import uuid


class MemberCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    event_id: str


class MemberAccess(BaseModel):
    event_name: str
    name: str
    pin: str


class Member(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    name: str
    role: Literal["owner", "crew"] = Field(default="crew")
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = Field(default=True)
