from fastapi import APIRouter, HTTPException
from typing import List
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone

from models.event import Event, EventCreate, EventUpdate
from models.member import Member
from services.qr_code import generate_qr_code_data

router = APIRouter(prefix="/events", tags=["events"])

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


@router.post("/", response_model=Event)
async def create_event(event_input: EventCreate):
    """Create a new stag or hen event"""
    event = Event(
        event_name=event_input.event_name,
        event_type=event_input.event_type,
        bride_groom_name=event_input.bride_groom_name,
        event_date=event_input.event_date,
        event_end_date=event_input.event_end_date,
        description=event_input.description,
        owner_name=event_input.owner_name,
        media_delete_policy=event_input.media_delete_policy
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


@router.delete("/{event_id}")
async def delete_event(event_id: str, owner_pin: str):
    """Soft delete an event (owner only)"""
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event['owner_pin'] != owner_pin:
        raise HTTPException(status_code=403, detail="Invalid owner PIN")
    
    await db.events.update_one(
        {"id": event_id}, 
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Event deleted successfully"}


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
