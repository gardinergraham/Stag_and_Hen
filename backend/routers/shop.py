from fastapi import APIRouter, HTTPException
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone

from models.shop import ShopItem, ShopItemCreate

router = APIRouter(prefix="/shop", tags=["shop"])

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


@router.post("/items", response_model=ShopItem)
async def create_shop_item(
    item_input: ShopItemCreate,
    event_id: Optional[str] = None,
    owner_pin: Optional[str] = None,
    admin_username: Optional[str] = None,
    admin_password: Optional[str] = None,
):
    """Create a new shop item (admin only - for seeding)"""
    has_global_admin = admin_username == "GrahamAdmin" and admin_password == "1234"
    has_event_owner = False

    if event_id and owner_pin:
        event = await db.events.find_one({"id": event_id, "owner_pin": owner_pin, "is_active": True})
        has_event_owner = event is not None

    if not has_global_admin and not has_event_owner:
        raise HTTPException(status_code=403, detail="Only admins or event owners can add shop items")

    item = ShopItem(
        name=item_input.name,
        description=item_input.description,
        price=item_input.price,
        affiliate_url=item_input.affiliate_url,
        image_url=item_input.image_url,
        category=item_input.category
    )
    
    item_doc = item.model_dump()
    item_doc['created_at'] = item_doc['created_at'].isoformat()
    
    await db.shop_items.insert_one(item_doc)
    
    return item


@router.get("/items", response_model=List[ShopItem])
async def get_shop_items(category: Optional[str] = None):
    """Get all shop items, optionally filtered by category"""
    query = {"is_active": True}
    if category:
        query["category"] = category
    
    items = await db.shop_items.find(query, {"_id": 0}).to_list(100)
    
    for item in items:
        if isinstance(item['created_at'], str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    
    return items


@router.get("/items/{item_id}", response_model=ShopItem)
async def get_shop_item(item_id: str):
    """Get a specific shop item"""
    item = await db.shop_items.find_one({"id": item_id, "is_active": True}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if isinstance(item['created_at'], str):
        item['created_at'] = datetime.fromisoformat(item['created_at'])
    
    return item


@router.get("/categories")
async def get_categories():
    """Get all available categories"""
    return {
        "categories": [
            {"id": "sashes", "name": "Sashes", "icon": "award"},
            {"id": "hats", "name": "Hats & Tiaras", "icon": "crown"},
            {"id": "decorations", "name": "Decorations", "icon": "party-popper"},
            {"id": "games", "name": "Party Games", "icon": "dice"},
            {"id": "accessories", "name": "Accessories", "icon": "glasses"},
            {"id": "costumes", "name": "Costumes", "icon": "shirt"},
            {"id": "other", "name": "Other", "icon": "package"}
        ]
    }


@router.post("/track-click/{item_id}")
async def track_affiliate_click(item_id: str, member_name: str, event_id: Optional[str] = None):
    """Track when someone clicks an affiliate link"""
    item = await db.shop_items.find_one({"id": item_id, "is_active": True})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    click_doc = {
        "item_id": item_id,
        "member_name": member_name,
        "event_id": event_id,
        "clicked_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.affiliate_clicks.insert_one(click_doc)
    
    return {"affiliate_url": item['affiliate_url']}
