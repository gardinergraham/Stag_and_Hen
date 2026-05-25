from fastapi import APIRouter, HTTPException
from typing import List
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone

from models.event import Event, EventCreate, EventUpdate
from models.member import Member
from core.plans import EVENT_PLANS
from services.qr_code import generate_qr_code_data
from services.s3 import delete_s3_file_by_url

router = APIRouter(prefix="/events", tags=["events"])

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


def is_multi_day_event(start_date, end_date) -> bool:
    if not start_date or not end_date:
        return False
    return end_date.date() > start_date.date()


async def delete_event_data(event_ids: List[str]):
    """Permanently remove event-owned records from the database."""
    if not event_ids:
        return {}

    event_query = {"event_id": {"$in": event_ids}}
    results = {}
    media_items = await db.media.find(event_query, {"_id": 0, "file_url": 1, "thumbnail_url": 1}).to_list(5000)
    deleted_files = 0
    for media in media_items:
        for url in [media.get("file_url"), media.get("thumbnail_url")]:
            if url and delete_s3_file_by_url(url):
                deleted_files += 1
    results["media_files"] = deleted_files
    results["media"] = (await db.media.delete_many(event_query)).deleted_count
    results["members"] = (await db.members.delete_many(event_query)).deleted_count
    results["kitty_transactions"] = (await db.kitty_transactions.delete_many(event_query)).deleted_count
    results["point_awards"] = (await db.point_awards.delete_many(event_query)).deleted_count
    results["spin_results"] = (await db.spin_results.delete_many(event_query)).deleted_count
    results["secret_missions"] = (await db.secret_missions.delete_many(event_query)).deleted_count
    results["event_dares"] = (await db.dares.delete_many(event_query)).deleted_count
    results["event_spinner_pairs"] = (await db.spinner_pairs.delete_many(event_query)).deleted_count
    results["shop_requests"] = (await db.shop_requests.delete_many(event_query)).deleted_count
    results["events"] = (await db.events.delete_many({"id": {"$in": event_ids}})).deleted_count
    return results


@router.post("/", response_model=Event)
async def create_event(event_input: EventCreate):
    """Create a new stag or hen event"""
    if event_input.event_tier == "one_day" and is_multi_day_event(event_input.event_date, event_input.event_end_date):
        raise HTTPException(
            status_code=400,
            detail="The One Day package is only available for events that start and end on the same day.",
        )

    plan = EVENT_PLANS.get(event_input.event_tier, EVENT_PLANS["prime"])
    event = Event(
        event_name=event_input.event_name,
        event_type=event_input.event_type,
        bride_groom_name=event_input.bride_groom_name,
        event_date=event_input.event_date,
        event_end_date=event_input.event_end_date,
        description=event_input.description,
        owner_name=event_input.owner_name,
        media_delete_policy=plan["media_delete_policy"],
        event_tier=event_input.event_tier,
        event_tier_price=plan["price"],
    )
    
    # Create owner as first member
    owner_member = Member(
        event_id=event.id,
        name=event_input.owner_name,
        role="owner"
    )
    
    # Prepare documents for MongoDB
    event_doc = event.model_dump()
    event_doc['event_date'] = event_doc['event_date'].isoformat() if event_doc['event_date'] else None
    event_doc['event_end_date'] = event_doc['event_end_date'].isoformat() if event_doc['event_end_date'] else None
    event_doc['created_at'] = event_doc['created_at'].isoformat()
    event_doc['updated_at'] = event_doc['updated_at'].isoformat()
    
    member_doc = owner_member.model_dump()
    member_doc['joined_at'] = member_doc['joined_at'].isoformat()
    
    await db.events.insert_one(event_doc)
    await db.members.insert_one(member_doc)
    
    return event


@router.get("/", response_model=List[Event])
async def get_events():
    """Get all events"""
    events = await db.events.find({"is_active": True}, {"_id": 0}).to_list(100)
    for event in events:
        if event.get('event_date') and isinstance(event['event_date'], str):
            event['event_date'] = datetime.fromisoformat(event['event_date'])
        if event.get('event_end_date') and isinstance(event['event_end_date'], str):
            event['event_end_date'] = datetime.fromisoformat(event['event_end_date'])
        if isinstance(event['created_at'], str):
            event['created_at'] = datetime.fromisoformat(event['created_at'])
        if isinstance(event['updated_at'], str):
            event['updated_at'] = datetime.fromisoformat(event['updated_at'])
    return events


@router.get("/{event_id}", response_model=Event)
async def get_event(event_id: str):
    """Get a specific event by ID"""
    event = await db.events.find_one({"id": event_id, "is_active": True}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event.get('event_date') and isinstance(event['event_date'], str):
        event['event_date'] = datetime.fromisoformat(event['event_date'])
    if event.get('event_end_date') and isinstance(event['event_end_date'], str):
        event['event_end_date'] = datetime.fromisoformat(event['event_end_date'])
    if isinstance(event['created_at'], str):
        event['created_at'] = datetime.fromisoformat(event['created_at'])
    if isinstance(event['updated_at'], str):
        event['updated_at'] = datetime.fromisoformat(event['updated_at'])
    
    return event


@router.put("/{event_id}", response_model=Event)
async def update_event(event_id: str, event_update: EventUpdate, owner_pin: str):
    """Update an event (owner only)"""
    event = await db.events.find_one({"id": event_id, "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event['owner_pin'] != owner_pin:
        raise HTTPException(status_code=403, detail="Invalid owner PIN")
    
    update_data = {k: v for k, v in event_update.model_dump().items() if v is not None}
    if update_data:
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        if 'event_date' in update_data and update_data['event_date']:
            update_data['event_date'] = update_data['event_date'].isoformat()
        if 'event_end_date' in update_data and update_data['event_end_date']:
            update_data['event_end_date'] = update_data['event_end_date'].isoformat()
        
        await db.events.update_one({"id": event_id}, {"$set": update_data})
    
    updated_event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if updated_event.get('event_date') and isinstance(updated_event['event_date'], str):
        updated_event['event_date'] = datetime.fromisoformat(updated_event['event_date'])
    if updated_event.get('event_end_date') and isinstance(updated_event['event_end_date'], str):
        updated_event['event_end_date'] = datetime.fromisoformat(updated_event['event_end_date'])
    if isinstance(updated_event['created_at'], str):
        updated_event['created_at'] = datetime.fromisoformat(updated_event['created_at'])
    if isinstance(updated_event['updated_at'], str):
        updated_event['updated_at'] = datetime.fromisoformat(updated_event['updated_at'])
    
    return updated_event


@router.delete("/owner/all")
async def delete_all_owner_events(owner_name: str, owner_pin: str, include_owner_data: bool = False):
    """Delete all events owned by this owner PIN/name, including event data."""
    events = await db.events.find({
        "owner_name": owner_name,
        "owner_pin": owner_pin,
    }, {"_id": 0, "id": 1}).to_list(500)
    if not events:
        raise HTTPException(status_code=404, detail="No matching owner events found")

    event_ids = [event["id"] for event in events]
    deleted = await delete_event_data(event_ids)
    return {
        "message": "Owner events and related data deleted successfully",
        "deleted_event_ids": event_ids,
        "include_owner_data": include_owner_data,
        "deleted": deleted,
    }


@router.delete("/{event_id}")
async def delete_event(event_id: str, owner_pin: str):
    """Delete an event and related event data (owner only)"""
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event['owner_pin'] != owner_pin:
        raise HTTPException(status_code=403, detail="Invalid owner PIN")

    deleted = await delete_event_data([event_id])

    return {"message": "Event and related data deleted successfully", "deleted": deleted}


@router.get("/{event_id}/qr-code")
async def get_event_qr_code(event_id: str, owner_pin: str):
    """Generate QR code data for sharing event access (owner only)"""
    event = await db.events.find_one({"id": event_id, "is_active": True}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event['owner_pin'] != owner_pin:
        raise HTTPException(status_code=403, detail="Invalid owner PIN")
    
    qr_data = generate_qr_code_data(
        event_name=event['event_name'],
        event_id=event['id'],
        access_pin=event['access_pin']
    )
    
    return {
        "qr_data": qr_data,
        "event_name": event['event_name'],
        "access_pin": event['access_pin']
    }


@router.get("/{event_id}/members", response_model=List[Member])
async def get_event_members(event_id: str):
    """Get all members of an event"""
    event = await db.events.find_one({"id": event_id, "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    members = await db.members.find({"event_id": event_id, "is_active": True}, {"_id": 0}).to_list(100)
    for member in members:
        if isinstance(member['joined_at'], str):
            member['joined_at'] = datetime.fromisoformat(member['joined_at'])
    return members
