from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone
import uuid


class PointAwardCreate(BaseModel):
    event_id: str = Field(..., min_length=1)
    member_name: str = Field(..., min_length=1, max_length=80)
    points: int = Field(..., ge=1, le=500)
    reason: str = Field(..., min_length=2, max_length=140)


class PointAward(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    member_name: str
    points: int
    reason: str
    awarded_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = Field(default=True)


class PointLeaderboardEntry(BaseModel):
    member_name: str
    role: str = "crew"
    points: int = 0
