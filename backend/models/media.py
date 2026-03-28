from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal
from datetime import datetime, timezone
import uuid


class MediaDeletePolicy(BaseModel):
    policy: Literal["1_day", "1_week", "1_month", "never"]


class MediaCreate(BaseModel):
    event_id: str
    uploaded_by: str
    file_url: str
    media_type: Literal["image", "video"]
    caption: Optional[str] = None
    thumbnail_url: Optional[str] = None


class Media(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    uploaded_by: str
    file_url: str
    media_type: Literal["image", "video"]
    caption: Optional[str] = None
    thumbnail_url: Optional[str] = None
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    delete_at: Optional[datetime] = None
    is_deleted: bool = Field(default=False)
