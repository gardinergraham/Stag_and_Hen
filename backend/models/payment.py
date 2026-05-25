from pydantic import BaseModel, Field


class EventCheckoutCreate(BaseModel):
    event_id: str = Field(..., min_length=1)
    owner_pin: str = Field(..., min_length=1)
    target_tier: str | None = None
    purchase_type: str | None = None


class EventCheckoutResponse(BaseModel):
    checkout_url: str
    checkout_session_id: str
    payment_status: str


class EventPaymentStatusResponse(BaseModel):
    event_id: str
    payment_status: str
    checkout_session_id: str | None = None


class IOSIAPComplete(BaseModel):
    event_id: str = Field(..., min_length=1)
    owner_pin: str = Field(..., min_length=1)
    product_id: str = Field(..., min_length=1)
    transaction_id: str | None = None
    purchase_token: str | None = None
    target_tier: str | None = None
    purchase_type: str | None = None
