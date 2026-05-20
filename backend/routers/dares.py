from fastapi import APIRouter, HTTPException
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime

from models.dare import Dare, DareCreate

router = APIRouter(prefix="/dares", tags=["dares"])

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]


def is_global_admin(admin_username: Optional[str], admin_password: Optional[str]) -> bool:
    return admin_username == "GrahamAdmin" and admin_password == "1234"


async def verify_event_owner(event_id: Optional[str], owner_pin: Optional[str]) -> None:
    if not event_id or not owner_pin:
        raise HTTPException(status_code=403, detail="Owner access is required")

    event = await db.events.find_one({"id": event_id, "owner_pin": owner_pin, "is_active": True})
    if not event:
        raise HTTPException(status_code=403, detail="Invalid owner PIN")


def normalize_dare(dare):
    if isinstance(dare.get("created_at"), str):
        dare["created_at"] = datetime.fromisoformat(dare["created_at"].replace("Z", "+00:00"))
    return dare


@router.get("/", response_model=List[Dare])
async def get_dares(
    event_id: Optional[str] = None,
    event_type: Optional[str] = None,
    include_event: bool = True,
):
    query = {"is_active": True}
    scope_filters = [{"event_id": None}]

    if include_event and event_id:
        scope_filters.append({"event_id": event_id})

    query["$or"] = scope_filters

    if event_type in ("stag", "hen"):
        query["event_type"] = {"$in": ["all", event_type]}

    dares = await db.dares.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [normalize_dare(dare) for dare in dares]


@router.post("/", response_model=Dare)
async def create_dare(
    dare_input: DareCreate,
    owner_pin: Optional[str] = None,
    admin_username: Optional[str] = None,
    admin_password: Optional[str] = None,
):
    admin = is_global_admin(admin_username, admin_password)
    if dare_input.event_id:
        if not admin:
            await verify_event_owner(dare_input.event_id, owner_pin)
        created_by = "admin" if admin else "owner"
    else:
        if not admin:
            raise HTTPException(status_code=403, detail="Only admins can create global dares")
        created_by = "admin"

    dare = Dare(
        text=dare_input.text,
        category=dare_input.category,
        event_type=dare_input.event_type,
        event_id=dare_input.event_id,
        created_by=created_by,
    )
    dare_doc = dare.model_dump()
    dare_doc["created_at"] = dare_doc["created_at"].isoformat()
    await db.dares.insert_one(dare_doc)
    return dare


@router.put("/{dare_id}", response_model=Dare)
async def update_dare(
    dare_id: str,
    dare_input: DareCreate,
    owner_pin: Optional[str] = None,
    admin_username: Optional[str] = None,
    admin_password: Optional[str] = None,
):
    existing = await db.dares.find_one({"id": dare_id, "is_active": True})
    if not existing:
        raise HTTPException(status_code=404, detail="Dare not found")

    admin = is_global_admin(admin_username, admin_password)
    if existing.get("event_id") and not admin:
        await verify_event_owner(existing.get("event_id"), owner_pin)
    elif not admin:
        raise HTTPException(status_code=403, detail="Only admins can edit global dares")

    update_data = dare_input.model_dump()
    if not admin:
        update_data["event_id"] = existing.get("event_id")
        update_data["event_type"] = existing.get("event_type", "all")

    await db.dares.update_one({"id": dare_id}, {"$set": update_data})
    updated = await db.dares.find_one({"id": dare_id}, {"_id": 0})
    return normalize_dare(updated)


@router.delete("/{dare_id}")
async def delete_dare(
    dare_id: str,
    owner_pin: Optional[str] = None,
    admin_username: Optional[str] = None,
    admin_password: Optional[str] = None,
):
    existing = await db.dares.find_one({"id": dare_id, "is_active": True})
    if not existing:
        raise HTTPException(status_code=404, detail="Dare not found")

    admin = is_global_admin(admin_username, admin_password)
    if existing.get("event_id") and not admin:
        await verify_event_owner(existing.get("event_id"), owner_pin)
    elif not admin:
        raise HTTPException(status_code=403, detail="Only admins can delete global dares")

    await db.dares.update_one({"id": dare_id}, {"$set": {"is_active": False}})
    return {"message": "Dare deleted successfully"}
