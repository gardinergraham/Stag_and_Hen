from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
import logging

logger = logging.getLogger(__name__)


async def cleanup_expired_media():
    """
    Background task to mark expired media as deleted.
    Should be run periodically (e.g., via cron or scheduled task).
    """
    mongo_url = os.environ.get('MONGO_URL')
    if not mongo_url:
        logger.error("MONGO_URL not found in environment")
        return
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'test_database')]
    
    now = datetime.now(timezone.utc)
    
    # Find and mark expired media
    result = await db.media.update_many(
        {
            "delete_at": {"$lt": now.isoformat()},
            "is_deleted": False
        },
        {"$set": {"is_deleted": True}}
    )
    
    logger.info(f"Marked {result.modified_count} expired media items as deleted")
    
    client.close()
    
    return result.modified_count
