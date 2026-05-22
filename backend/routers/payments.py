from fastapi import APIRouter, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
import os
import base64
import json
from datetime import datetime, timezone
import requests
import stripe

from models.payment import (
    EventCheckoutCreate,
    EventCheckoutResponse,
    EventPaymentStatusResponse,
    IOSIAPComplete,
)
from core.plans import (
    APPLE_PRODUCT_PRICES,
    EVENT_PLANS,
    STRIPE_PRICE_ENV,
    TIER_TO_APPLE_PRODUCT,
    get_public_plan_config,
)

router = APIRouter(prefix="/payments", tags=["payments"])

APPLE_PRODUCTION_VERIFY_URL = "https://buy.itunes.apple.com/verifyReceipt"
APPLE_SANDBOX_VERIFY_URL = "https://sandbox.itunes.apple.com/verifyReceipt"

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

def get_app_public_url() -> str:
    return os.environ.get("APP_PUBLIC_URL", "https://stag-and-hen.com").rstrip("/")


def get_tier_price_id(tier: str) -> str:
    price_id = os.environ.get(STRIPE_PRICE_ENV.get(tier, ""))
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
    try:
        metadata = stripe_value(obj, "metadata", {}) or {}
        return dict(metadata)
    except Exception:
        return {}


def stripe_list_data(obj):
    if obj is None:
        return []
    if isinstance(obj, dict):
        return obj.get("data", [])
    return getattr(obj, "data", [])


def is_storekit2_jws(receipt_data: str) -> bool:
    return receipt_data.startswith("eyJ") and receipt_data.count(".") == 2


def decode_storekit2_jws(jws_token: str) -> dict:
    try:
        payload_b64 = jws_token.split(".")[1]
        payload_b64 += "=" * (-len(payload_b64) % 4)
        payload_json = base64.urlsafe_b64decode(payload_b64.encode("utf-8"))
        return json.loads(payload_json)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Apple StoreKit receipt.")


def verify_apple_receipt(receipt_data: str) -> dict:
    payload = {
        "receipt-data": receipt_data,
        "exclude-old-transactions": True,
    }
    shared_secret = os.environ.get("APPLE_IAP_SHARED_SECRET")
    if shared_secret:
        payload["password"] = shared_secret

    try:
        prod_response = requests.post(APPLE_PRODUCTION_VERIFY_URL, json=payload, timeout=5)
        prod_json = prod_response.json()
    except Exception:
        prod_json = {}

    if prod_json.get("status") == 0:
        return prod_json

    if prod_json.get("status") != 21007 and prod_json:
        raise HTTPException(status_code=400, detail="Invalid Apple receipt.")

    try:
        sandbox_response = requests.post(APPLE_SANDBOX_VERIFY_URL, json=payload, timeout=5)
        sandbox_json = sandbox_response.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Apple receipt validation failed.")

    if sandbox_json.get("status") != 0:
        raise HTTPException(status_code=400, detail="Invalid Apple receipt.")

    return sandbox_json


def get_apple_purchase_from_receipt(receipt_data: str, expected_product_id: str) -> dict:
    if is_storekit2_jws(receipt_data):
        payload = decode_storekit2_jws(receipt_data)
        product_id = payload.get("productId")
        transaction_id = payload.get("transactionId")
        if product_id != expected_product_id or not transaction_id:
            raise HTTPException(status_code=400, detail="Apple receipt does not match this event package.")
        return {
            "product_id": product_id,
            "transaction_id": str(transaction_id),
            "environment": payload.get("environment", "Production"),
            "is_storekit2": True,
        }

    receipt_info = verify_apple_receipt(receipt_data)
    purchases = (
        receipt_info.get("latest_receipt_info")
        or receipt_info.get("receipt", {}).get("in_app")
        or []
    )
    matching_purchase = next(
        (purchase for purchase in reversed(purchases) if purchase.get("product_id") == expected_product_id),
        None,
    )
    if not matching_purchase:
        raise HTTPException(status_code=400, detail="Apple receipt does not include this event package.")

    transaction_id = matching_purchase.get("transaction_id")
    if not transaction_id:
        raise HTTPException(status_code=400, detail="Apple receipt is missing a transaction ID.")

    return {
        "product_id": matching_purchase.get("product_id"),
        "transaction_id": str(transaction_id),
        "environment": receipt_info.get("environment", "Production"),
        "is_storekit2": False,
    }


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

    try:
        for session in stripe_list_data(sessions):
            metadata = stripe_metadata(session)
            if (
                metadata.get("event_id") == event_id
                or stripe_value(session, "client_reference_id") == event_id
            ) and (
                stripe_value(session, "payment_status") == "paid"
                or stripe_value(session, "status") == "complete"
            ):
                return session
    except Exception:
        return None
    return None


async def sync_event_payment_status(event: dict, allow_recent_lookup: bool = True) -> str:
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

    if not session and allow_recent_lookup:
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


@router.get("/config")
async def get_payment_config():
    return {
        "plans": get_public_plan_config(),
        "apple_products": TIER_TO_APPLE_PRODUCT,
        "apple_prices": APPLE_PRODUCT_PRICES,
    }


@router.get("/event-status/{event_id}", response_model=EventPaymentStatusResponse)
async def get_event_payment_status(event_id: str, owner_pin: str):
    event = await db.events.find_one({"id": event_id, "owner_pin": owner_pin, "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found or owner PIN is invalid.")

    payment_status = await sync_event_payment_status(event, allow_recent_lookup=True)
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

    payment_status = await sync_event_payment_status(
        event,
        allow_recent_lookup=bool(event.get("stripe_checkout_session_id")),
    )
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

    tier = event.get("event_tier", "prime")
    if tier not in EVENT_PLANS:
        raise HTTPException(status_code=400, detail="Unsupported event package.")

    price_id = get_tier_price_id(tier)
    public_url = get_app_public_url()

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            client_reference_id=event["id"],
            metadata={
                "event_id": event["id"],
                "event_tier": tier,
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


@router.post("/ios-iap/complete", response_model=EventPaymentStatusResponse)
async def complete_ios_iap_purchase(purchase_input: IOSIAPComplete):
    event = await db.events.find_one({
        "id": purchase_input.event_id,
        "owner_pin": purchase_input.owner_pin,
        "is_active": True,
    })
    if not event:
        raise HTTPException(status_code=404, detail="Event not found or owner PIN is invalid.")

    expected_product_id = TIER_TO_APPLE_PRODUCT.get(event.get("event_tier", "prime"))
    if purchase_input.product_id != expected_product_id:
        raise HTTPException(status_code=400, detail="Apple product does not match this event package.")

    if not purchase_input.purchase_token:
        raise HTTPException(status_code=400, detail="Apple receipt is missing.")

    apple_purchase = get_apple_purchase_from_receipt(
        purchase_input.purchase_token,
        expected_product_id,
    )
    apple_transaction_id = apple_purchase["transaction_id"]

    existing_purchase = await db.events.find_one({
        "ios_iap_transaction_id": apple_transaction_id,
    })
    if existing_purchase and existing_purchase["id"] != event["id"]:
        raise HTTPException(status_code=409, detail="This Apple purchase has already been used.")
    if existing_purchase and existing_purchase["id"] == event["id"]:
        return EventPaymentStatusResponse(
            event_id=event["id"],
            payment_status=existing_purchase.get("payment_status", "paid"),
            checkout_session_id=existing_purchase.get("stripe_checkout_session_id"),
        )

    now = datetime.now(timezone.utc).isoformat()
    await db.events.update_one(
        {"id": event["id"]},
        {
            "$set": {
                "payment_status": "paid",
                "payment_provider": "apple_iap",
                "ios_iap_product_id": apple_purchase["product_id"],
                "ios_iap_transaction_id": apple_transaction_id,
                "ios_iap_environment": apple_purchase["environment"],
                "ios_iap_is_storekit2": apple_purchase["is_storekit2"],
                "ios_iap_purchase_token": purchase_input.purchase_token,
                "paid_at": now,
                "updated_at": now,
            }
        },
    )

    return EventPaymentStatusResponse(
        event_id=event["id"],
        payment_status="paid",
        checkout_session_id=event.get("stripe_checkout_session_id"),
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
