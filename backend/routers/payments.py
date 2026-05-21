from fastapi import APIRouter, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
import stripe

from models.payment import EventCheckoutCreate, EventCheckoutResponse, EventPaymentStatusResponse

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


def stripe_value(obj, key, default=None):
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def stripe_metadata(obj) -> dict:
    metadata = stripe_value(obj, "metadata", {}) or {}
    return dict(metadata)


async def mark_event_paid(event_id: str, session) -> None:
    await db.events.update_one(
        {"id": event_id},
        {
            "$set": {
                "payment_status": "paid",
                "stripe_checkout_session_id": stripe_value(session, "id"),
                "stripe_payment_intent": stripe_value(session, "payment_intent"),
                "paid_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )


async def find_recent_paid_session_for_event(event_id: str):
    try:
        sessions = stripe.checkout.Session.list(limit=100)
    except Exception:
        return None

    for session in sessions.get("data", []):
        metadata = stripe_metadata(session)
        if (
            metadata.get("event_id") == event_id
            or stripe_value(session, "client_reference_id") == event_id
        ) and (
            stripe_value(session, "payment_status") == "paid"
            or stripe_value(session, "status") == "complete"
        ):
            return session
    return None


async def sync_event_payment_status(event: dict) -> str:
    if event.get("payment_status") == "paid":
        return "paid"

    if not stripe.api_key:
        return event.get("payment_status", "pending")

    checkout_session_id = event.get("stripe_checkout_session_id")
    session = None
    if checkout_session_id:
        try:
            session = stripe.checkout.Session.retrieve(checkout_session_id)
        except Exception:
            session = None

    if not session:
        session = await find_recent_paid_session_for_event(event["id"])

    if not session:
        return event.get("payment_status", "pending")

    if stripe_value(session, "payment_status") == "paid" or stripe_value(session, "status") == "complete":
        await mark_event_paid(event["id"], session)
        return "paid"

    if stripe_value(session, "status") == "expired":
        await db.events.update_one(
            {"id": event["id"]},
            {"$set": {"payment_status": "failed", "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        return "failed"

    return event.get("payment_status", "pending")


@router.get("/event-status/{event_id}", response_model=EventPaymentStatusResponse)
async def get_event_payment_status(event_id: str, owner_pin: str):
    event = await db.events.find_one({"id": event_id, "owner_pin": owner_pin, "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found or owner PIN is invalid.")

    payment_status = await sync_event_payment_status(event)
    return EventPaymentStatusResponse(
        event_id=event_id,
        payment_status=payment_status,
        checkout_session_id=event.get("stripe_checkout_session_id"),
    )


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

    payment_status = await sync_event_payment_status(event)
    if payment_status == "paid":
        return EventCheckoutResponse(
            checkout_url="",
            checkout_session_id=event.get("stripe_checkout_session_id") or "",
            payment_status="paid",
        )

    existing_session_id = event.get("stripe_checkout_session_id")
    if existing_session_id:
        try:
            existing_session = stripe.checkout.Session.retrieve(existing_session_id)
            if (
                stripe_value(existing_session, "payment_status") == "paid"
                or stripe_value(existing_session, "status") == "complete"
            ):
                await mark_event_paid(event["id"], existing_session)
                return EventCheckoutResponse(
                    checkout_url="",
                    checkout_session_id=stripe_value(existing_session, "id", ""),
                    payment_status="paid",
                )
            if stripe_value(existing_session, "status") == "open" and stripe_value(existing_session, "url"):
                return EventCheckoutResponse(
                    checkout_url=stripe_value(existing_session, "url"),
                    checkout_session_id=stripe_value(existing_session, "id"),
                    payment_status=payment_status,
                )
        except Exception:
            pass

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
        metadata = stripe_metadata(session)
        event_id = metadata.get("event_id") or stripe_value(session, "client_reference_id")
        if event_id:
            await mark_event_paid(event_id, session)
    elif event["type"] in {"checkout.session.expired", "payment_intent.payment_failed"}:
        session = event["data"]["object"]
        metadata = stripe_metadata(session)
        event_id = metadata.get("event_id") or stripe_value(session, "client_reference_id")
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
