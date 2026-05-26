from pydantic import BaseModel, Field, ConfigDict
from typing import Literal, Optional
from datetime import datetime, timezone
import uuid


class KittyContribution(BaseModel):
    event_id: str
    contributor_name: str
    amount: float = Field(..., gt=0)
    message: Optional[str] = None


class KittyWithdrawal(BaseModel):
    event_id: str
    owner_pin: str
    amount: float = Field(..., gt=0)
    purpose: str = Field(..., min_length=2, max_length=200)


class KittyConnectStart(BaseModel):
    event_id: str
    owner_pin: str


class KittyContributionCheckout(BaseModel):
    event_id: str
    contributor_name: str
    amount: float = Field(..., gt=0)
    message: Optional[str] = None


class KittyTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    transaction_type: Literal["contribution", "withdrawal"]
    amount: float
    contributor_name: Optional[str] = None
    purpose: Optional[str] = None
    message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    payment_status: Literal["pending", "completed", "failed"] = Field(default="completed")
    stripe_payment_id: Optional[str] = None
