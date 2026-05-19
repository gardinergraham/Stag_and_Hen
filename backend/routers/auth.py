from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
from typing import Optional

from models.member import Member, MemberCreate, MemberAccess

router = APIRouter(prefix="/auth", tags=["auth"])

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


class QRAccessRequest(BaseModel):
    event_id: str
    access_pin: str
    name: str


class OwnerLoginRequest(BaseModel):
    event_name: str
    owner_pin: str


class AccessResponse(BaseModel):
    success: bool
    event_id: str
    event_name: str
    event_type: str
    member_name: str
    role: str
    message: str
    owner_pin: Optional[str] = None
    access_pin: Optional[str] = None


@router.post("/access-qr", response_model=AccessResponse)
async def access_via_qr(request: QRAccessRequest):
    """Join an event via QR code scan"""
    event = await db.events.find_one({
        "id": request.event_id, 
        "access_pin": request.access_pin,
        "is_active": True
    })
    
    if not event:
        raise HTTPException(status_code=401, detail="Invalid QR code or PIN")
    
    # Check if member already exists
    existing_member = await db.members.find_one({
        "event_id": request.event_id,
        "name": request.name,
        "is_active": True
    })
    
    if existing_member:
        role = existing_member['role']
    else:
        # Create new crew member
        member = Member(
            event_id=request.event_id,
            name=request.name,
            role="crew"
        )
        member_doc = member.model_dump()
        member_doc['joined_at'] = member_doc['joined_at'].isoformat()
        await db.members.insert_one(member_doc)
        role = "crew"
    
    return AccessResponse(
        success=True,
        event_id=event['id'],
        event_name=event['event_name'],
        event_type=event['event_type'],
        member_name=request.name,
        role=role,
        message=f"Welcome to {event['event_name']}!"
    )


@router.post("/access-manual", response_model=AccessResponse)
async def access_via_manual(request: MemberAccess):
    """Join an event via manual entry (event name + name + PIN)"""
    event = await db.events.find_one({
        "event_name": {"$regex": f"^{request.event_name}$", "$options": "i"},
        "access_pin": request.pin,
        "is_active": True
    })
    
    if not event:
        raise HTTPException(status_code=401, detail="Invalid event name or PIN")
    
    # Check if member already exists
    existing_member = await db.members.find_one({
        "event_id": event['id'],
        "name": request.name,
        "is_active": True
    })
    
    if existing_member:
        role = existing_member['role']
    else:
        # Create new crew member
        member = Member(
            event_id=event['id'],
            name=request.name,
            role="crew"
        )
        member_doc = member.model_dump()
        member_doc['joined_at'] = member_doc['joined_at'].isoformat()
        await db.members.insert_one(member_doc)
        role = "crew"
    
    return AccessResponse(
        success=True,
        event_id=event['id'],
        event_name=event['event_name'],
        event_type=event['event_type'],
        member_name=request.name,
        role=role,
        message=f"Welcome to {event['event_name']}!"
    )


@router.post("/owner-login", response_model=AccessResponse)
async def owner_login(request: OwnerLoginRequest):
    """Owner login with owner PIN"""
    event = await db.events.find_one({
        "event_name": {"$regex": f"^{request.event_name}$", "$options": "i"},
        "owner_pin": request.owner_pin,
        "is_active": True
    })
    
    if not event:
        raise HTTPException(status_code=401, detail="Invalid event name or owner PIN")
    
    return AccessResponse(
        success=True,
        event_id=event['id'],
        event_name=event['event_name'],
        event_type=event['event_type'],
        member_name=event['owner_name'],
        role="owner",
        message=f"Welcome back, {event['owner_name']}!",
        owner_pin=event['owner_pin'],
        access_pin=event['access_pin']
    )
