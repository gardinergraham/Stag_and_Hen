from fastapi import APIRouter, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
import os
import base64
import json
from datetime import datetime, timedelta, timezone
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
    APPLE_UPGRADE_PRODUCT_TO_TIERS,
    APPLE_UPGRADE_PRODUCTS,
    EVENT_PLANS,
    STRIPE_PRICE_ENV,
    TIER_TO_APPLE_PRODUCT,
    UPLOAD_EXTENSION,
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


def get_upgrade_amount_pence(current_tier: str, target_tier: str) -> int:
    if current_tier not in EVENT_PLANS or target_tier not in EVENT_PLANS:
        raise HTTPException(status_code=400, detail="Unsupported event package.")
    amount = EVENT_PLANS[target_tier]["amount_pence"] - EVENT_PLANS[current_tier]["amount_pence"]
    if amount <= 0:
        raise HTTPException(status_code=400, detail="You can only upgrade to a higher package.")
    return amount


def normalize_datetime(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def calculate_media_delete_at(policy: str, event_end_date=None):
    base_date = normalize_datetime(event_end_date) or datetime.now(timezone.utc)
    if policy == "1_day":
        return base_date + timedelta(days=1)
    if policy == "1_week":
        return base_date + timedelta(weeks=1)
    if policy == "1_month":
        return base_date + timedelta(days=30)
    return None


async def apply_event_plan(event_id: str, target_tier: str) -> None:
    if target_tier not in EVENT_PLANS:
        raise HTTPException(status_code=400, detail="Unsupported event package.")

    event = await db.events.find_one({"id": event_id})
    if not event:
        return

    plan = EVENT_PLANS[target_tier]
    now = datetime.now(timezone.utc).isoformat()
    await db.events.update_one(
        {"id": event_id},
        {
            "$set": {
                "event_tier": target_tier,
                "event_tier_price": plan["price"],
                "media_delete_policy": plan["media_delete_policy"],
                "updated_at": now,
            }
        },
    )

    delete_at = calculate_media_delete_at(plan["media_delete_policy"], event.get("event_end_date"))
    await db.media.update_many(
        {"event_id": event_id, "is_deleted": False},
        {"$set": {"delete_at": delete_at.isoformat() if delete_at else None}},
    )


async def apply_upload_extension(event_id: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    await db.events.update_one(
        {"id": event_id},
        {
            "$inc": {"upload_extension_hours": UPLOAD_EXTENSION["hours"]},
            "$set": {
                "last_upload_extension_at": now,
                "updated_at": now,
            },
        },
    )


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
    event = await db.events.find_one({"id": event_id})
    if not event:
        return

    metadata = stripe_metadata(session)
    target_tier = metadata.get("target_tier")
    purchase_type = metadata.get("purchase_type", "event")
    session_id = stripe_value(session, "id")

    if purchase_type == "upload_extension":
        if event.get("last_extension_session_id") == session_id:
            return
        await apply_upload_extension(event_id)
        await db.events.update_one(
            {"id": event_id},
            {
                "$set": {
                    "last_extension_session_id": session_id,
                    "last_extension_payment_intent": stripe_value(session, "payment_intent"),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
        return

    if purchase_type == "upgrade" and event.get("last_upgrade_session_id") == session_id:
        return

    if target_tier:
        await apply_event_plan(event_id, target_tier)

    payment_updates = {
        "stripe_checkout_session_id": session_id,
        "stripe_payment_intent": stripe_value(session, "payment_intent"),
        "paid_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if purchase_type == "upgrade":
        payment_updates.update({
            "last_upgrade_session_id": stripe_value(session, "id"),
            "last_upgraded_at": datetime.now(timezone.utc).isoformat(),
        })
    else:
        payment_updates["payment_status"] = "paid"

    await db.events.update_one(
        {"id": event_id},
        {"$set": payment_updates},
    )


async def sync_saved_addon_session(event: dict, field_name: str) -> bool:
    session_id = event.get(field_name)
    if not session_id:
        return False

    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except Exception:
        return False

    if stripe_value(session, "payment_status") == "paid" or stripe_value(session, "status") == "complete":
        await mark_event_paid(event["id"], session)
        return True

    return False


async def find_recent_paid_session_for_event(event_id: str, purchase_types: set[str] | None = None):
    try:
        sessions = stripe.checkout.Session.list(limit=100)
    except Exception:
        return None

    try:
        for session in stripe_list_data(sessions):
            metadata = stripe_metadata(session)
            if purchase_types and metadata.get("purchase_type") not in purchase_types:
                continue
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


async def sync_recent_paid_addon_session(event: dict) -> bool:
    session = await find_recent_paid_session_for_event(
        event["id"],
        purchase_types={"upgrade"},
    )
    if not session:
        return False

    await mark_event_paid(event["id"], session)
    return True


async def sync_event_payment_status(event: dict, allow_recent_lookup: bool = True) -> str:
    await sync_saved_addon_session(event, "stripe_upgrade_session_id")
    await sync_saved_addon_session(event, "stripe_upload_extension_session_id")
    if allow_recent_lookup:
        await sync_recent_paid_addon_session(event)

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
        "apple_upgrade_products": {
            f"{from_tier}_to_{to_tier}": product_id
            for (from_tier, to_tier), product_id in APPLE_UPGRADE_PRODUCTS.items()
        },
        "upload_extension": {
            "hours": UPLOAD_EXTENSION["hours"],
            "display_price_gbp": UPLOAD_EXTENSION["display_price_gbp"],
            "apple_product_id": UPLOAD_EXTENSION["apple_product_id"],
        },
        "apple_prices": APPLE_PRODUCT_PRICES,
    }


@router.get("/event-status/{event_id}", response_model=EventPaymentStatusResponse)
async def get_event_payment_status(event_id: str, owner_pin: str):
    event = await db.events.find_one({"id": event_id, "owner_pin": owner_pin, "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found or owner PIN is invalid.")

    payment_status = await sync_event_payment_status(event, allow_recent_lookup=True)
    refreshed_event = await db.events.find_one({"id": event_id, "is_active": True}, {"_id": 0}) or event
    return EventPaymentStatusResponse(
        event_id=event_id,
        payment_status=payment_status,
        checkout_session_id=refreshed_event.get("stripe_checkout_session_id"),
        event_tier=refreshed_event.get("event_tier"),
        event_tier_price=refreshed_event.get("event_tier_price"),
        media_delete_policy=refreshed_event.get("media_delete_policy"),
        upload_extension_hours=refreshed_event.get("upload_extension_hours", 0),
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

    current_tier = event.get("event_tier", "prime")
    target_tier = checkout_input.target_tier or current_tier
    purchase_type = checkout_input.purchase_type or "event"
    is_upgrade = target_tier != current_tier
    is_extension = purchase_type == "upload_extension"
    if target_tier not in EVENT_PLANS:
        raise HTTPException(status_code=400, detail="Unsupported event package.")

    payment_status = await sync_event_payment_status(
        event,
        allow_recent_lookup=bool(event.get("stripe_checkout_session_id")),
    )
    if payment_status == "paid" and not is_upgrade and not is_extension:
        return EventCheckoutResponse(
            checkout_url="",
            checkout_session_id=event.get("stripe_checkout_session_id") or "",
            payment_status="paid",
        )

    existing_session_id = event.get("stripe_checkout_session_id")
    if existing_session_id and not is_upgrade and not is_extension:
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

    if is_upgrade and payment_status != "paid":
        raise HTTPException(status_code=400, detail="Complete the original event payment before upgrading.")
    if is_extension and payment_status != "paid":
        raise HTTPException(status_code=400, detail="Complete the original event payment before extending uploads.")

    if is_extension:
        line_item = {
            "price_data": {
                "currency": "gbp",
                "product_data": {
                    "name": f"Stag & Hen 24 hour upload extension for {event.get('event_name', 'event')}",
                },
                "unit_amount": UPLOAD_EXTENSION["amount_pence"],
            },
            "quantity": 1,
        }
    elif is_upgrade:
        line_item = {
            "price_data": {
                "currency": "gbp",
                "product_data": {
                    "name": f"Stag & Hen upgrade: {EVENT_PLANS[current_tier]['name']} to {EVENT_PLANS[target_tier]['name']}",
                },
                "unit_amount": get_upgrade_amount_pence(current_tier, target_tier),
            },
            "quantity": 1,
        }
    else:
        line_item = {"price": get_tier_price_id(target_tier), "quantity": 1}

    public_url = get_app_public_url()

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            line_items=[line_item],
            client_reference_id=event["id"],
            metadata={
                "event_id": event["id"],
                "event_tier": current_tier,
                "target_tier": target_tier,
                "purchase_type": "upload_extension" if is_extension else ("upgrade" if is_upgrade else "event"),
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
                "updated_at": datetime.now(timezone.utc).isoformat(),
                **({} if (is_upgrade or is_extension) else {"payment_status": "pending"}),
                **(
                    {"stripe_upload_extension_session_id": session.id}
                    if is_extension
                    else
                    {"stripe_upgrade_session_id": session.id}
                    if is_upgrade
                    else {"stripe_checkout_session_id": session.id}
                ),
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

    current_tier = event.get("event_tier", "prime")
    target_tier = purchase_input.target_tier or current_tier
    purchase_type = purchase_input.purchase_type or "event"
    is_extension = purchase_type == "upload_extension"
    is_upgrade = target_tier != current_tier
    if is_extension:
        expected_product_id = UPLOAD_EXTENSION["apple_product_id"]
    elif is_upgrade:
        expected_product_id = APPLE_UPGRADE_PRODUCTS.get((current_tier, target_tier))
        if not expected_product_id:
            raise HTTPException(status_code=400, detail="Unsupported Apple upgrade package.")
    else:
        expected_product_id = TIER_TO_APPLE_PRODUCT.get(current_tier)
    if purchase_input.product_id != expected_product_id:
        raise HTTPException(
            status_code=400,
            detail=(
                "Apple product does not match this event package. "
                f"Expected {expected_product_id}, got {purchase_input.product_id}. "
                f"Current tier {current_tier}, target tier {target_tier}."
            ),
        )

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
    if is_extension:
        await apply_upload_extension(event["id"])
    elif is_upgrade:
        await apply_event_plan(event["id"], target_tier)

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
                **(
                    {
                        "last_ios_upgrade_transaction_id": apple_transaction_id,
                        "last_upgraded_at": now,
                    }
                    if is_upgrade
                    else {}
                ),
                **(
                    {
                        "last_ios_upload_extension_transaction_id": apple_transaction_id,
                        "last_upload_extension_at": now,
                    }
                    if is_extension
                    else {}
                ),
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
        if event_id and metadata.get("purchase_type") not in {"upgrade", "upload_extension"}:
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
