from pydantic import BaseModel, Field


class EventCheckoutCreate(BaseModel):
    event_id: str = Field(..., min_length=1)
    owner_pin: str = Field(..., min_length=1)


class EventCheckoutResponse(BaseModel):
    checkout_url: str
    checkout_session_id: str
    payment_status: str


class EventPaymentStatusResponse(BaseModel):
    event_id: str
    payment_status: str
    checkout_session_id: str | None = None
