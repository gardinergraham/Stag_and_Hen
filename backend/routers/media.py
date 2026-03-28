from fastapi import APIRouter, HTTPException
from typing import List
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timedelta, timezone

from models.media import Media, MediaCreate

router = APIRouter(prefix="/media", tags=["media"])

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


def calculate_delete_at(policy: str) -> datetime | None:
    """Calculate delete_at timestamp based on policy"""
    now = datetime.now(timezone.utc)
    if policy == "1_day":
        return now + timedelta(days=1)
    elif policy == "1_week":
        return now + timedelta(weeks=1)
    elif policy == "1_month":
        return now + timedelta(days=30)
    return None  # "never"


@router.post("/", response_model=Media)
async def upload_media(media_input: MediaCreate):
    """Upload media to an event"""
    # Verify event exists
    event = await db.events.find_one({"id": media_input.event_id, "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Verify uploader is a member
    member = await db.members.find_one({
        "event_id": media_input.event_id, 
        "name": media_input.uploaded_by,
        "is_active": True
    })
    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this event")
    
    # Calculate delete_at based on event's policy
    delete_at = calculate_delete_at(event['media_delete_policy'])
    
    media = Media(
        event_id=media_input.event_id,
        uploaded_by=media_input.uploaded_by,
        file_url=media_input.file_url,
        media_type=media_input.media_type,
        caption=media_input.caption,
        thumbnail_url=media_input.thumbnail_url,
        delete_at=delete_at
    )
    
    media_doc = media.model_dump()
    media_doc['uploaded_at'] = media_doc['uploaded_at'].isoformat()
    media_doc['delete_at'] = media_doc['delete_at'].isoformat() if media_doc['delete_at'] else None
    
    await db.media.insert_one(media_doc)
    
    return media


@router.get("/event/{event_id}", response_model=List[Media])
async def get_event_media(event_id: str):
    """Get all media for an event"""
    event = await db.events.find_one({"id": event_id, "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Get media that hasn't been deleted
    media_list = await db.media.find({
        "event_id": event_id, 
        "is_deleted": False
    }, {"_id": 0}).to_list(1000)
    
    now = datetime.now(timezone.utc)
    result = []
    
    for media in media_list:
        if isinstance(media['uploaded_at'], str):
            media['uploaded_at'] = datetime.fromisoformat(media['uploaded_at'])
        if media.get('delete_at'):
            if isinstance(media['delete_at'], str):
                media['delete_at'] = datetime.fromisoformat(media['delete_at'])
            # Skip media that should be deleted
            if media['delete_at'] < now:
                await db.media.update_one({"id": media['id']}, {"$set": {"is_deleted": True}})
                continue
        result.append(media)
    
    return result


@router.get("/{media_id}", response_model=Media)
async def get_media(media_id: str):
    """Get a specific media item"""
    media = await db.media.find_one({"id": media_id, "is_deleted": False}, {"_id": 0})
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    if isinstance(media['uploaded_at'], str):
        media['uploaded_at'] = datetime.fromisoformat(media['uploaded_at'])
    if media.get('delete_at') and isinstance(media['delete_at'], str):
        media['delete_at'] = datetime.fromisoformat(media['delete_at'])
    
    return media


@router.delete("/{media_id}")
async def delete_media(media_id: str, member_name: str):
    """Delete media (only by uploader or event owner)"""
    media = await db.media.find_one({"id": media_id, "is_deleted": False})
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    # Check if requester is the uploader
    if media['uploaded_by'] != member_name:
        # Check if requester is the event owner
        event = await db.events.find_one({"id": media['event_id']})
        owner_member = await db.members.find_one({
            "event_id": media['event_id'],
            "name": member_name,
            "role": "owner"
        })
        if not owner_member:
            raise HTTPException(status_code=403, detail="Only the uploader or event owner can delete this media")
    
    await db.media.update_one({"id": media_id}, {"$set": {"is_deleted": True}})
    
    return {"message": "Media deleted successfully"}
