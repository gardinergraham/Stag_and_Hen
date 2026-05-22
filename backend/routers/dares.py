from fastapi import APIRouter, HTTPException
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime
import random

from models.dare import (
    Dare,
    DareCreate,
    SecretMission,
    SecretMissionAssign,
    SecretMissionCompleteRequest,
    SecretMissionCompletion,
    SecretMissionTemplate,
    SecretMissionTemplateCreate,
    SpinResult,
    SpinResultCreate,
    SpinnerPair,
    SpinnerPairCreate,
)

router = APIRouter(prefix="/dares", tags=["dares"])

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

SECRET_MISSION_TEMPLATES = [
    "Make someone say the word pineapple without telling them why.",
    "Get a selfie with security or a staff member.",
    "Convince someone outside the group that it is your birthday.",
    "Get the guest of honour to sing one line of a song.",
    "Start a toast and get at least three people to join in.",
    "Find someone wearing the party colour and get a photo.",
    "Get someone to call the guest of honour by a new nickname.",
    "Borrow a harmless prop for a photo and return it straight away.",
    "Start a chant without explaining why.",
    "Get three people to do the same pose in one photo.",
    "Make someone tell you their best marriage advice.",
    "Get the group to cheer for no obvious reason.",
]


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


def normalize_secret_mission(mission):
    if not mission:
        return mission
    mission.pop("_id", None)
    if isinstance(mission.get("created_at"), str):
        try:
            mission["created_at"] = datetime.fromisoformat(mission["created_at"].replace("Z", "+00:00"))
        except ValueError:
            mission["created_at"] = datetime.utcnow()
    if mission.get("completed_at") and isinstance(mission["completed_at"], str):
        try:
            mission["completed_at"] = datetime.fromisoformat(mission["completed_at"].replace("Z", "+00:00"))
        except ValueError:
            mission["completed_at"] = None
    return mission


def normalize_secret_mission_template(template):
    if not template:
        return template
    template.pop("_id", None)
    if isinstance(template.get("created_at"), str):
        try:
            template["created_at"] = datetime.fromisoformat(template["created_at"].replace("Z", "+00:00"))
        except ValueError:
            template["created_at"] = datetime.utcnow()
    return template


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


@router.get("/secret-mission-templates", response_model=List[SecretMissionTemplate])
async def get_secret_mission_templates(event_type: Optional[str] = None):
    query = {"is_active": True}
    if event_type in ("stag", "hen"):
        query["event_type"] = {"$in": ["all", event_type]}

    templates = await db.secret_mission_templates.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [normalize_secret_mission_template(template) for template in templates]


@router.post("/secret-mission-templates", response_model=SecretMissionTemplate)
async def create_secret_mission_template(
    template_input: SecretMissionTemplateCreate,
    admin_username: Optional[str] = None,
    admin_password: Optional[str] = None,
):
    if not is_global_admin(admin_username, admin_password):
        raise HTTPException(status_code=403, detail="Only admins can create secret mission templates")

    template = SecretMissionTemplate(
        text=template_input.text,
        event_type=template_input.event_type,
    )
    template_doc = template.model_dump()
    template_doc["created_at"] = template_doc["created_at"].isoformat()
    await db.secret_mission_templates.insert_one(template_doc)
    return template


@router.put("/secret-mission-templates/{template_id}", response_model=SecretMissionTemplate)
async def update_secret_mission_template(
    template_id: str,
    template_input: SecretMissionTemplateCreate,
    admin_username: Optional[str] = None,
    admin_password: Optional[str] = None,
):
    if not is_global_admin(admin_username, admin_password):
        raise HTTPException(status_code=403, detail="Only admins can edit secret mission templates")

    existing = await db.secret_mission_templates.find_one({"id": template_id, "is_active": True})
    if not existing:
        raise HTTPException(status_code=404, detail="Secret mission template not found")

    await db.secret_mission_templates.update_one(
        {"id": template_id},
        {"$set": template_input.model_dump()},
    )
    updated = await db.secret_mission_templates.find_one({"id": template_id}, {"_id": 0})
    return normalize_secret_mission_template(updated)


@router.delete("/secret-mission-templates/{template_id}")
async def delete_secret_mission_template(
    template_id: str,
    admin_username: Optional[str] = None,
    admin_password: Optional[str] = None,
):
    if not is_global_admin(admin_username, admin_password):
        raise HTTPException(status_code=403, detail="Only admins can delete secret mission templates")

    existing = await db.secret_mission_templates.find_one({"id": template_id, "is_active": True})
    if not existing:
        raise HTTPException(status_code=404, detail="Secret mission template not found")

    await db.secret_mission_templates.update_one({"id": template_id}, {"$set": {"is_active": False}})
    return {"message": "Secret mission template deleted successfully"}


@router.get("/secret-mission/{event_id}", response_model=Optional[SecretMission])
async def get_secret_mission(event_id: str, member_name: str):
    mission = await db.secret_missions.find_one(
        {
            "event_id": event_id,
            "member_name": member_name,
            "is_active": True,
            "is_completed": False,
        },
        {"_id": 0},
    )
    if not mission:
        return None
    return normalize_secret_mission(mission)


@router.post("/secret-mission/assign", response_model=SecretMission)
async def assign_secret_mission(mission_input: SecretMissionAssign):
    event = await db.events.find_one({"id": mission_input.event_id, "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if not mission_input.force_new:
        existing = await db.secret_missions.find_one(
            {
                "event_id": mission_input.event_id,
                "member_name": mission_input.member_name,
                "is_active": True,
                "is_completed": False,
            },
            {"_id": 0},
        )
        if existing:
            return normalize_secret_mission(existing)

    event_type = event.get("event_type")
    templates = await db.secret_mission_templates.find(
        {
            "is_active": True,
            "event_type": {"$in": ["all", event_type]} if event_type in ("stag", "hen") else "all",
        },
        {"_id": 0},
    ).to_list(500)
    template_texts = [template.get("text") for template in templates if template.get("text")]
    mission_text = random.choice(template_texts or SECRET_MISSION_TEMPLATES)

    mission = SecretMission(
        event_id=mission_input.event_id,
        member_name=mission_input.member_name,
        mission_text=mission_text,
    )
    mission_doc = mission.model_dump()
    mission_doc["created_at"] = mission_doc["created_at"].isoformat()
    await db.secret_missions.insert_one(mission_doc)
    return normalize_secret_mission(mission_doc)


@router.put("/secret-mission/{mission_id}/complete", response_model=SecretMission)
async def complete_secret_mission(
    mission_id: str,
    member_name: str,
    completion_input: SecretMissionCompleteRequest,
):
    mission = await db.secret_missions.find_one({"id": mission_id, "is_active": True})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    if mission.get("member_name") != member_name:
        raise HTTPException(status_code=403, detail="This is not your mission")

    completed_at = datetime.utcnow().isoformat()
    await db.secret_missions.update_one(
        {"id": mission_id},
        {
            "$set": {
                "is_completed": True,
                "completed_at": completed_at,
                "evidence": completion_input.evidence,
            }
        },
    )
    updated = await db.secret_missions.find_one({"id": mission_id}, {"_id": 0})
    return normalize_secret_mission(updated)


@router.get("/secret-missions/{event_id}/completions", response_model=List[SecretMissionCompletion])
async def get_secret_mission_completions(event_id: str):
    missions = await db.secret_missions.find(
        {"event_id": event_id, "is_active": True, "is_completed": True},
        {
            "_id": 0,
            "id": 1,
            "event_id": 1,
            "member_name": 1,
            "mission_text": 1,
            "evidence": 1,
            "is_completed": 1,
            "completed_at": 1,
        },
    ).sort("completed_at", -1).to_list(100)
    return [normalize_secret_mission(mission) for mission in missions]


@router.delete("/secret-mission/{mission_id}")
async def delete_secret_mission(mission_id: str, owner_pin: str):
    mission = await db.secret_missions.find_one({"id": mission_id, "is_active": True})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    event = await db.events.find_one({"id": mission.get("event_id"), "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.get("owner_pin") != owner_pin:
        raise HTTPException(status_code=403, detail="Invalid owner PIN")

    await db.secret_missions.update_one({"id": mission_id}, {"$set": {"is_active": False}})
    return {"message": "Mission deleted successfully"}


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
