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


class SpinnerPairCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=80)
    left: str = Field(..., min_length=1, max_length=40)
    right: str = Field(..., min_length=1, max_length=40)
    left_detail: Optional[str] = Field(default=None, max_length=180)
    right_detail: Optional[str] = Field(default=None, max_length=180)
    left_color: str = Field(default="#00B7FF", max_length=20)
    right_color: str = Field(default="#22C55E", max_length=20)
    event_type: DareEventType = Field(default="all")
    event_id: Optional[str] = None


class SpinnerPair(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    left: str
    right: str
    left_detail: Optional[str] = None
    right_detail: Optional[str] = None
    left_color: str = "#00B7FF"
    right_color: str = "#22C55E"
    event_type: DareEventType = "all"
    event_id: Optional[str] = None
    created_by: Literal["admin", "owner"] = "admin"
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SpinResultCreate(BaseModel):
    event_id: str = Field(..., min_length=1)
    spinner_title: str = Field(..., min_length=1, max_length=80)
    target_name: str = Field(..., min_length=1, max_length=80)
    target_label: Optional[str] = Field(default=None, max_length=40)
    action: str = Field(..., min_length=1, max_length=80)
    detail: Optional[str] = Field(default=None, max_length=180)
    spun_by: Optional[str] = Field(default=None, max_length=80)


class SpinResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    spinner_title: str
    target_name: str
    target_label: Optional[str] = None
    action: str
    detail: Optional[str] = None
    spun_by: Optional[str] = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SecretMissionAssign(BaseModel):
    event_id: str = Field(..., min_length=1)
    member_name: str = Field(..., min_length=1, max_length=80)
    force_new: bool = Field(default=False)


class SecretMissionCompleteRequest(BaseModel):
    evidence: Optional[str] = Field(default=None, max_length=500)


class SecretMissionTemplateCreate(BaseModel):
    text: str = Field(..., min_length=3, max_length=220)
    event_type: DareEventType = Field(default="all")


class SecretMissionTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    event_type: DareEventType = "all"
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SecretMission(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    member_name: str
    mission_text: str
    evidence: Optional[str] = None
    is_completed: bool = Field(default=False)
    completed_at: Optional[datetime] = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SecretMissionCompletion(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    event_id: str
    member_name: str
    mission_text: str
    evidence: Optional[str] = None
    is_completed: bool
    completed_at: Optional[datetime] = None
