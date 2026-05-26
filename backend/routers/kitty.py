from fastapi import APIRouter, HTTPException
from typing import List
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
import uuid
import stripe

from models.kitty import (
    KittyConnectStart,
    KittyContribution,
    KittyContributionCheckout,
    KittyTransaction,
    KittyWithdrawal,
)

router = APIRouter(prefix="/kitty", tags=["kitty"])

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")


def get_app_public_url() -> str:
    return os.environ.get("APP_PUBLIC_URL", "https://stag-and-hen.com").rstrip("/")


def to_minor_units(amount: float) -> int:
    return int(round(float(amount) * 100))


async def get_owned_event(event_id: str, owner_pin: str) -> dict:
    event = await db.events.find_one({"id": event_id, "owner_pin": owner_pin, "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found or owner PIN is invalid.")
    return event


async def get_connect_account_status(event: dict) -> dict:
    account_id = event.get("stripe_connect_account_id")
    if not account_id:
        return {
            "connected": False,
            "charges_enabled": False,
            "payouts_enabled": False,
            "details_submitted": False,
            "account_id": None,
        }

    try:
        account = stripe.Account.retrieve(account_id)
    except Exception:
        return {
            "connected": False,
            "charges_enabled": False,
            "payouts_enabled": False,
            "details_submitted": False,
            "account_id": account_id,
        }

    status = {
        "connected": bool(getattr(account, "details_submitted", False)),
        "charges_enabled": bool(getattr(account, "charges_enabled", False)),
        "payouts_enabled": bool(getattr(account, "payouts_enabled", False)),
        "details_submitted": bool(getattr(account, "details_submitted", False)),
        "account_id": account_id,
    }
    await db.events.update_one(
        {"id": event["id"]},
        {
            "$set": {
                "stripe_connect_charges_enabled": status["charges_enabled"],
                "stripe_connect_payouts_enabled": status["payouts_enabled"],
                "stripe_connect_details_submitted": status["details_submitted"],
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )
    return status


@router.post("/connect/start")
async def start_kitty_connect(payload: KittyConnectStart):
    """Create or resume Stripe Connect onboarding for the event owner."""
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe secret key is not configured.")

    event = await get_owned_event(payload.event_id, payload.owner_pin)
    account_id = event.get("stripe_connect_account_id")

    if not account_id:
        try:
            account = stripe.Account.create(
                type="express",
                country=os.environ.get("STRIPE_CONNECT_COUNTRY", "GB"),
                capabilities={
                    "card_payments": {"requested": True},
                    "transfers": {"requested": True},
                },
                metadata={
                    "event_id": event["id"],
                    "owner_name": event.get("owner_name", ""),
                },
            )
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Could not create Stripe Connect account: {str(exc)}")

        account_id = account.id
        await db.events.update_one(
            {"id": event["id"]},
            {
                "$set": {
                    "stripe_connect_account_id": account_id,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )

    public_url = get_app_public_url()
    try:
        account_link = stripe.AccountLink.create(
            account=account_id,
            refresh_url=f"{public_url}/support?stripe_connect=refresh",
            return_url=f"{public_url}/support?stripe_connect=return",
            type="account_onboarding",
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not start Stripe onboarding: {str(exc)}")

    status = await get_connect_account_status({**event, "stripe_connect_account_id": account_id})
    return {
        **status,
        "onboarding_url": account_link.url,
    }


@router.get("/connect/status/{event_id}")
async def kitty_connect_status(event_id: str, owner_pin: str):
    event = await get_owned_event(event_id, owner_pin)
    return await get_connect_account_status(event)


@router.post("/connect/dashboard")
async def kitty_connect_dashboard(payload: KittyConnectStart):
    event = await get_owned_event(payload.event_id, payload.owner_pin)
    account_id = event.get("stripe_connect_account_id")
    if not account_id:
        raise HTTPException(status_code=400, detail="Stripe Connect has not been set up for this event.")

    status = await get_connect_account_status(event)
    if not status.get("details_submitted"):
        return await start_kitty_connect(payload)

    try:
        login_link = stripe.Account.create_login_link(account_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not open Stripe dashboard: {str(exc)}")

    return {
        **status,
        "dashboard_url": login_link.url,
    }


@router.post("/contribution-checkout")
async def create_kitty_contribution_checkout(contribution: KittyContributionCheckout):
    """Create a Stripe Checkout payment that sends kitty funds to the owner's Connect account."""
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe secret key is not configured.")

    event = await db.events.find_one({"id": contribution.event_id, "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    account_id = event.get("stripe_connect_account_id")
    if not account_id:
        raise HTTPException(status_code=400, detail="The event owner needs to set up kitty payments first.")

    status = await get_connect_account_status(event)
    if not status.get("charges_enabled"):
        raise HTTPException(status_code=400, detail="Kitty payments are not ready yet. The owner needs to finish Stripe setup.")

    amount_minor = to_minor_units(contribution.amount)
    if amount_minor < 50:
        raise HTTPException(status_code=400, detail="Minimum kitty contribution is £0.50.")

    transaction = KittyTransaction(
        event_id=contribution.event_id,
        transaction_type="contribution",
        amount=amount_minor / 100,
        contributor_name=contribution.contributor_name,
        message=contribution.message,
        payment_status="pending",
    )
    tx_doc = transaction.model_dump()
    tx_doc["created_at"] = tx_doc["created_at"].isoformat()
    await db.kitty_transactions.insert_one(tx_doc)

    public_url = get_app_public_url()
    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "gbp",
                        "product_data": {
                            "name": f"Kitty contribution for {event.get('event_name', 'Stag & Hen event')}",
                        },
                        "unit_amount": amount_minor,
                    },
                    "quantity": 1,
                }
            ],
            payment_intent_data={
                "transfer_data": {
                    "destination": account_id,
                },
                "metadata": {
                    "purchase_type": "kitty_contribution",
                    "event_id": event["id"],
                    "kitty_transaction_id": transaction.id,
                },
            },
            metadata={
                "purchase_type": "kitty_contribution",
                "event_id": event["id"],
                "kitty_transaction_id": transaction.id,
                "contributor_name": contribution.contributor_name,
            },
            success_url=f"{public_url}/payment-success?type=kitty&event_id={event['id']}&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{public_url}/payment-cancel?type=kitty&event_id={event['id']}",
        )
    except Exception as exc:
        await db.kitty_transactions.update_one(
            {"id": transaction.id},
            {"$set": {"payment_status": "failed", "stripe_payment_id": None}},
        )
        raise HTTPException(status_code=502, detail=f"Could not start kitty payment: {str(exc)}")

    await db.kitty_transactions.update_one(
        {"id": transaction.id},
        {"$set": {"stripe_payment_id": session.id}},
    )

    return {
        "checkout_url": session.url,
        "checkout_session_id": session.id,
        "payment_status": "pending",
        "transaction_id": transaction.id,
    }


@router.post("/contribute", response_model=KittyTransaction)
async def contribute_to_kitty(contribution: KittyContribution):
    """Add money to the event kitty (MOCKED - Stripe Connect placeholder)"""
    # Verify event exists
    event = await db.events.find_one({"id": contribution.event_id, "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Create transaction
    transaction = KittyTransaction(
        event_id=contribution.event_id,
        transaction_type="contribution",
        amount=contribution.amount,
        contributor_name=contribution.contributor_name,
        message=contribution.message,
        payment_status="completed",  # MOCKED - would be "pending" with real Stripe
        stripe_payment_id=f"mock_pi_{uuid.uuid4().hex[:16]}"  # MOCKED
    )
    
    # Update kitty balance
    new_balance = event.get('kitty_balance', 0) + contribution.amount
    await db.events.update_one(
        {"id": contribution.event_id},
        {"$set": {"kitty_balance": new_balance, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Save transaction
    tx_doc = transaction.model_dump()
    tx_doc['created_at'] = tx_doc['created_at'].isoformat()
    await db.kitty_transactions.insert_one(tx_doc)
    
    return transaction


@router.post("/withdraw", response_model=KittyTransaction)
async def withdraw_from_kitty(withdrawal: KittyWithdrawal):
    """Withdraw money from the kitty (owner only) (MOCKED)"""
    # Verify event and owner
    event = await db.events.find_one({"id": withdrawal.event_id, "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event['owner_pin'] != withdrawal.owner_pin:
        raise HTTPException(status_code=403, detail="Invalid owner PIN")
    
    current_balance = event.get('kitty_balance', 0)
    if withdrawal.amount > current_balance:
        raise HTTPException(status_code=400, detail=f"Insufficient funds. Current balance: £{current_balance:.2f}")
    
    # Create transaction
    transaction = KittyTransaction(
        event_id=withdrawal.event_id,
        transaction_type="withdrawal",
        amount=withdrawal.amount,
        purpose=withdrawal.purpose,
        payment_status="completed",  # MOCKED
        stripe_payment_id=f"mock_po_{uuid.uuid4().hex[:16]}"  # MOCKED
    )
    
    # Update kitty balance
    new_balance = current_balance - withdrawal.amount
    await db.events.update_one(
        {"id": withdrawal.event_id},
        {"$set": {"kitty_balance": new_balance, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Save transaction
    tx_doc = transaction.model_dump()
    tx_doc['created_at'] = tx_doc['created_at'].isoformat()
    await db.kitty_transactions.insert_one(tx_doc)
    
    return transaction


@router.get("/balance/{event_id}")
async def get_kitty_balance(event_id: str):
    """Get the current kitty balance for an event"""
    event = await db.events.find_one({"id": event_id, "is_active": True}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return {
        "event_id": event_id,
        "balance": event.get('kitty_balance', 0),
        "currency": "GBP"
    }


@router.get("/transactions/{event_id}", response_model=List[KittyTransaction])
async def get_kitty_transactions(event_id: str):
    """Get all kitty transactions for an event"""
    event = await db.events.find_one({"id": event_id, "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    transactions = await db.kitty_transactions.find(
        {"event_id": event_id}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    for tx in transactions:
        if isinstance(tx['created_at'], str):
            tx['created_at'] = datetime.fromisoformat(tx['created_at'])
    
    return transactions
