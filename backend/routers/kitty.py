from fastapi import APIRouter, HTTPException
from typing import List
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
import uuid

from models.kitty import KittyTransaction, KittyContribution, KittyWithdrawal

router = APIRouter(prefix="/kitty", tags=["kitty"])

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


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
