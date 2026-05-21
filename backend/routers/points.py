from fastapi import APIRouter, HTTPException
from typing import List
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime

from models.points import PointAward, PointAwardCreate, PointLeaderboardEntry

router = APIRouter(prefix="/points", tags=["points"])

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]


def normalize_award(award):
    if award and isinstance(award.get("created_at"), str):
        award["created_at"] = datetime.fromisoformat(award["created_at"])
    return award


async def verify_owner(event_id: str, owner_pin: str):
    event = await db.events.find_one({"id": event_id, "owner_pin": owner_pin, "is_active": True})
    if not event:
        raise HTTPException(status_code=403, detail="Invalid owner PIN")
    return event


@router.get("/{event_id}/leaderboard", response_model=List[PointLeaderboardEntry])
async def get_leaderboard(event_id: str):
    event = await db.events.find_one({"id": event_id, "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    members = await db.members.find({"event_id": event_id, "is_active": True}, {"_id": 0}).to_list(200)
    totals = {
        member["name"]: PointLeaderboardEntry(
            member_name=member["name"],
            role=member.get("role", "crew"),
            points=int(member.get("points", 0)),
        )
        for member in members
    }

    for name in [event.get("bride_groom_name"), event.get("owner_name")]:
        if name and name not in totals:
            totals[name] = PointLeaderboardEntry(member_name=name, role="guest_of_honour", points=0)

    return sorted(totals.values(), key=lambda item: item.points, reverse=True)


@router.get("/{event_id}/awards", response_model=List[PointAward])
async def get_recent_awards(event_id: str, limit: int = 20):
    event = await db.events.find_one({"id": event_id, "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    safe_limit = max(1, min(limit, 50))
    awards = await db.point_awards.find(
        {"event_id": event_id, "is_active": True},
        {"_id": 0},
    ).sort("created_at", -1).to_list(safe_limit)
    return [normalize_award(award) for award in awards]


@router.post("/award", response_model=PointAward)
async def award_points(award_input: PointAwardCreate, owner_pin: str):
    event = await verify_owner(award_input.event_id, owner_pin)

    member = await db.members.find_one({
        "event_id": award_input.event_id,
        "name": award_input.member_name,
        "is_active": True,
    })
    if not member and award_input.member_name != event.get("bride_groom_name"):
        raise HTTPException(status_code=404, detail="Crew member not found")

    award = PointAward(
        event_id=award_input.event_id,
        member_name=award_input.member_name,
        points=award_input.points,
        reason=award_input.reason,
        awarded_by=event.get("owner_name", "Owner"),
    )
    award_doc = award.model_dump()
    award_doc["created_at"] = award_doc["created_at"].isoformat()

    await db.point_awards.insert_one(award_doc)
    if member:
        await db.members.update_one(
            {"event_id": award_input.event_id, "name": award_input.member_name, "is_active": True},
            {"$inc": {"points": award_input.points}},
        )

    return award
