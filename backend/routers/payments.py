from fastapi import APIRouter, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
import stripe

from models.payment import EventCheckoutCreate, EventCheckoutResponse

router = APIRouter(prefix="/payments", tags=["payments"])

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

TIER_PRICE_ENV = {
    "one_day": "STRIPE_PRICE_ONE_DAY",
    "extended": "STRIPE_PRICE_EXTENDED",
    "prime": "STRIPE_PRICE_PRIME",
}


def get_app_public_url() -> str:
    return os.environ.get("APP_PUBLIC_URL", "https://stag-and-hen.com").rstrip("/")


def get_tier_price_id(tier: str) -> str:
    price_id = os.environ.get(TIER_PRICE_ENV.get(tier, ""))
    if not price_id:
        raise HTTPException(status_code=500, detail=f"Stripe price ID is missing for {tier}.")
    return price_id


@router.post("/event-checkout", response_model=EventCheckoutResponse)
async def create_event_checkout(checkout_input: EventCheckoutCreate):
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe secret key is not configured.")

    event = await db.events.find_one({
        "id": checkout_input.event_id,
        "owner_pin": checkout_input.owner_pin,
        "is_active": True,
    })
    if not event:
        raise HTTPException(status_code=404, detail="Event not found or owner PIN is invalid.")

    if event.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="This event has already been paid for.")

    price_id = get_tier_price_id(event.get("event_tier", "prime"))
    public_url = get_app_public_url()

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            client_reference_id=event["id"],
            metadata={
                "event_id": event["id"],
                "event_tier": event.get("event_tier", "prime"),
                "owner_name": event.get("owner_name", ""),
            },
            success_url=f"{public_url}/payment-success?event_id={event['id']}&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{public_url}/payment-cancel?event_id={event['id']}",
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not create Stripe checkout: {str(exc)}")

    await db.events.update_one(
        {"id": event["id"]},
        {
            "$set": {
                "payment_status": "pending",
                "stripe_checkout_session_id": session.id,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )

    return EventCheckoutResponse(
        checkout_url=session.url,
        checkout_session_id=session.id,
        payment_status="pending",
    )


@router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET")
    if not webhook_secret:
        raise HTTPException(status_code=500, detail="Stripe webhook secret is not configured.")

    payload = await request.body()
    signature = request.headers.get("stripe-signature")
    if not signature:
        raise HTTPException(status_code=400, detail="Missing Stripe signature.")

    try:
        event = stripe.Webhook.construct_event(payload, signature, webhook_secret)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Stripe payload.")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid Stripe signature.")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        event_id = session.get("metadata", {}).get("event_id") or session.get("client_reference_id")
        if event_id:
            await db.events.update_one(
                {"id": event_id},
                {
                    "$set": {
                        "payment_status": "paid",
                        "stripe_checkout_session_id": session.get("id"),
                        "stripe_payment_intent": session.get("payment_intent"),
                        "paid_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                },
            )
    elif event["type"] in {"checkout.session.expired", "payment_intent.payment_failed"}:
        session = event["data"]["object"]
        event_id = session.get("metadata", {}).get("event_id") or session.get("client_reference_id")
        if event_id:
            await db.events.update_one(
                {"id": event_id},
                {
                    "$set": {
                        "payment_status": "failed",
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                },
            )

    return {"received": True}
