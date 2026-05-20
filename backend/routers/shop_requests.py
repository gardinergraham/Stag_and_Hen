from fastapi import APIRouter, HTTPException
from typing import List, Optional, Literal
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime

from models.shop_request import ShopRequest, ShopRequestCreate

router = APIRouter(prefix="/shop-requests", tags=["shop-requests"])

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


def verify_global_admin(admin_username: Optional[str], admin_password: Optional[str]) -> None:
    if admin_username != "GrahamAdmin" or admin_password != "1234":
        raise HTTPException(status_code=403, detail="Only admins can manage shop requests")


@router.post("/", response_model=ShopRequest)
async def create_shop_request(request_input: ShopRequestCreate):
    """Create a product wishlist request from the mobile app"""
    shop_request = ShopRequest(**request_input.model_dump())
    request_doc = shop_request.model_dump()
    request_doc['created_at'] = request_doc['created_at'].isoformat()

    await db.shop_requests.insert_one(request_doc)
    return shop_request


@router.get("/", response_model=List[ShopRequest])
async def get_shop_requests(
    status: Optional[Literal["pending", "approved", "rejected"]] = "pending",
    admin_username: Optional[str] = None,
    admin_password: Optional[str] = None,
):
    """Get wishlist requests for web admin review"""
    verify_global_admin(admin_username, admin_password)

    query = {}
    if status:
        query["status"] = status

    requests = await db.shop_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    for request in requests:
        if isinstance(request['created_at'], str):
            request['created_at'] = datetime.fromisoformat(request['created_at'])

    return requests


@router.put("/{request_id}/status", response_model=ShopRequest)
async def update_shop_request_status(
    request_id: str,
    status: Literal["pending", "approved", "rejected"],
    admin_username: Optional[str] = None,
    admin_password: Optional[str] = None,
):
    """Update a wishlist request status"""
    verify_global_admin(admin_username, admin_password)

    result = await db.shop_requests.update_one({"id": request_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")

    updated_request = await db.shop_requests.find_one({"id": request_id}, {"_id": 0})
    if isinstance(updated_request['created_at'], str):
        updated_request['created_at'] = datetime.fromisoformat(updated_request['created_at'])

    return updated_request
