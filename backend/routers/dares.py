from fastapi import APIRouter, HTTPException
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime

from models.dare import Dare, DareCreate, SpinResult, SpinResultCreate, SpinnerPair, SpinnerPairCreate

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


def normalize_spinner_pair(pair):
    if isinstance(pair.get("created_at"), str):
        pair["created_at"] = datetime.fromisoformat(pair["created_at"].replace("Z", "+00:00"))
    return pair


def normalize_spin_result(result):
    if isinstance(result.get("created_at"), str):
        result["created_at"] = datetime.fromisoformat(result["created_at"].replace("Z", "+00:00"))
    return result


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


@router.get("/spinner-pairs", response_model=List[SpinnerPair])
async def get_spinner_pairs(
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

    pairs = await db.spinner_pairs.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [normalize_spinner_pair(pair) for pair in pairs]


@router.post("/spinner-pairs", response_model=SpinnerPair)
async def create_spinner_pair(
    pair_input: SpinnerPairCreate,
    owner_pin: Optional[str] = None,
    admin_username: Optional[str] = None,
    admin_password: Optional[str] = None,
):
    admin = is_global_admin(admin_username, admin_password)
    if pair_input.event_id:
        if not admin:
            await verify_event_owner(pair_input.event_id, owner_pin)
        created_by = "admin" if admin else "owner"
    else:
        if not admin:
            raise HTTPException(status_code=403, detail="Only admins can create global spinner choices")
        created_by = "admin"

    pair = SpinnerPair(
        title=pair_input.title,
        left=pair_input.left,
        right=pair_input.right,
        left_detail=pair_input.left_detail,
        right_detail=pair_input.right_detail,
        left_color=pair_input.left_color,
        right_color=pair_input.right_color,
        event_type=pair_input.event_type,
        event_id=pair_input.event_id,
        created_by=created_by,
    )
    pair_doc = pair.model_dump()
    pair_doc["created_at"] = pair_doc["created_at"].isoformat()
    await db.spinner_pairs.insert_one(pair_doc)
    return pair


@router.put("/spinner-pairs/{pair_id}", response_model=SpinnerPair)
async def update_spinner_pair(
    pair_id: str,
    pair_input: SpinnerPairCreate,
    owner_pin: Optional[str] = None,
    admin_username: Optional[str] = None,
    admin_password: Optional[str] = None,
):
    existing = await db.spinner_pairs.find_one({"id": pair_id, "is_active": True})
    if not existing:
        raise HTTPException(status_code=404, detail="Spinner choice not found")

    admin = is_global_admin(admin_username, admin_password)
    if existing.get("event_id") and not admin:
        await verify_event_owner(existing.get("event_id"), owner_pin)
    elif not admin:
        raise HTTPException(status_code=403, detail="Only admins can edit global spinner choices")

    update_data = pair_input.model_dump()
    if not admin:
        update_data["event_id"] = existing.get("event_id")
        update_data["event_type"] = existing.get("event_type", "all")

    await db.spinner_pairs.update_one({"id": pair_id}, {"$set": update_data})
    updated = await db.spinner_pairs.find_one({"id": pair_id}, {"_id": 0})
    return normalize_spinner_pair(updated)


@router.delete("/spinner-pairs/{pair_id}")
async def delete_spinner_pair(
    pair_id: str,
    owner_pin: Optional[str] = None,
    admin_username: Optional[str] = None,
    admin_password: Optional[str] = None,
):
    existing = await db.spinner_pairs.find_one({"id": pair_id, "is_active": True})
    if not existing:
        raise HTTPException(status_code=404, detail="Spinner choice not found")

    admin = is_global_admin(admin_username, admin_password)
    if existing.get("event_id") and not admin:
        await verify_event_owner(existing.get("event_id"), owner_pin)
    elif not admin:
        raise HTTPException(status_code=403, detail="Only admins can delete global spinner choices")

    await db.spinner_pairs.update_one({"id": pair_id}, {"$set": {"is_active": False}})
    return {"message": "Spinner choice deleted successfully"}


@router.get("/spin-results/{event_id}", response_model=List[SpinResult])
async def get_spin_results(event_id: str, limit: int = 10):
    capped_limit = min(max(limit, 1), 30)
    results = await db.spin_results.find(
        {"event_id": event_id, "is_active": True},
        {"_id": 0},
    ).sort("created_at", -1).to_list(capped_limit)
    return [normalize_spin_result(result) for result in results]


@router.post("/spin-results", response_model=SpinResult)
async def create_spin_result(result_input: SpinResultCreate):
    event = await db.events.find_one({"id": result_input.event_id, "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    result = SpinResult(
        event_id=result_input.event_id,
        spinner_title=result_input.spinner_title,
        target_name=result_input.target_name,
        target_label=result_input.target_label,
        action=result_input.action,
        detail=result_input.detail,
        spun_by=result_input.spun_by,
    )
    result_doc = result.model_dump()
    result_doc["created_at"] = result_doc["created_at"].isoformat()
    await db.spin_results.insert_one(result_doc)
    return result


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
