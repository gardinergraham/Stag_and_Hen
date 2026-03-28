from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal
from datetime import datetime, timezone
import uuid


class ShopItemCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    price: float = Field(..., gt=0)
    affiliate_url: str
    image_url: Optional[str] = None
    category: Literal["sashes", "hats", "decorations", "games", "accessories", "costumes", "other"] = Field(default="other")


class ShopItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    price: float
    affiliate_url: str
    image_url: Optional[str] = None
    category: Literal["sashes", "hats", "decorations", "games", "accessories", "costumes", "other"]
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
