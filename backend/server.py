from fastapi import FastAPI
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import routers
from routers import events_router, media_router, shop_router, shop_requests_router, dares_router, kitty_router, auth_router

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(
    title="Stag & Hen API",
    description="API for the Stag & Hen party planning app",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Include all routers with /api prefix
app.include_router(events_router, prefix="/api")
app.include_router(media_router, prefix="/api")
app.include_router(shop_router, prefix="/api")
app.include_router(shop_requests_router, prefix="/api")
app.include_router(dares_router, prefix="/api")
app.include_router(kitty_router, prefix="/api")
app.include_router(auth_router, prefix="/api")


@app.get("/api/")
async def root():
    return {
        "message": "Welcome to The Stag & Hen API",
        "tagline": "Last Stop Before The Altar",
        "version": "1.0.0"
    }


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}


@app.on_event("startup")
async def startup_event():
    """Seed some sample shop items on startup"""
    logger.info("Starting Stag & Hen API...")
    
    # Check if shop items exist
    count = await db.shop_items.count_documents({})
    if count == 0:
        logger.info("Seeding sample shop items...")
        sample_items = [
            {
                "id": "shop-001",
                "name": "Bride to Be Sash - Rose Gold",
                "description": "Beautiful rose gold sash perfect for the bride-to-be. Premium quality satin.",
                "price": 8.99,
                "affiliate_url": "https://www.amazon.co.uk/dp/example1",
                "image_url": "https://images.unsplash.com/photo-1519741497674-611481863552?w=400",
                "category": "sashes",
                "is_active": True,
                "created_at": "2024-01-01T00:00:00Z"
            },
            {
                "id": "shop-002",
                "name": "Team Bride Sashes - Pack of 6",
                "description": "Pack of 6 white and rose gold Team Bride sashes for the whole crew.",
                "price": 12.99,
                "affiliate_url": "https://www.amazon.co.uk/dp/example2",
                "image_url": "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400",
                "category": "sashes",
                "is_active": True,
                "created_at": "2024-01-01T00:00:00Z"
            },
            {
                "id": "shop-003",
                "name": "Bride Tiara & Veil Set",
                "description": "Sparkling tiara with attached veil. Perfect photo prop!",
                "price": 14.99,
                "affiliate_url": "https://www.amazon.co.uk/dp/example3",
                "image_url": "https://images.unsplash.com/photo-1594552072238-b8a33785b261?w=400",
                "category": "hats",
                "is_active": True,
                "created_at": "2024-01-01T00:00:00Z"
            },
            {
                "id": "shop-004",
                "name": "Stag Do Antlers Headband",
                "description": "Funny stag antlers headband for the groom-to-be. Lightweight and comfortable.",
                "price": 9.99,
                "affiliate_url": "https://www.amazon.co.uk/dp/example4",
                "image_url": "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400",
                "category": "hats",
                "is_active": True,
                "created_at": "2024-01-01T00:00:00Z"
            },
            {
                "id": "shop-005",
                "name": "Hen Party Games Pack",
                "description": "10 hilarious hen party games including dare cards, Mr & Mrs quiz, and more!",
                "price": 16.99,
                "affiliate_url": "https://www.amazon.co.uk/dp/example5",
                "image_url": "https://images.unsplash.com/photo-1529543544277-826c67ee7b08?w=400",
                "category": "games",
                "is_active": True,
                "created_at": "2024-01-01T00:00:00Z"
            },
            {
                "id": "shop-006",
                "name": "Rose Gold Balloon Arch Kit",
                "description": "Complete balloon arch kit in rose gold, pink and white. Perfect for photos!",
                "price": 24.99,
                "affiliate_url": "https://www.amazon.co.uk/dp/example6",
                "image_url": "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400",
                "category": "decorations",
                "is_active": True,
                "created_at": "2024-01-01T00:00:00Z"
            },
            {
                "id": "shop-007",
                "name": "Bride Squad Sunglasses - Pack of 8",
                "description": "Fun pink heart-shaped sunglasses for the whole squad. UV protected!",
                "price": 11.99,
                "affiliate_url": "https://www.amazon.co.uk/dp/example7",
                "image_url": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400",
                "category": "accessories",
                "is_active": True,
                "created_at": "2024-01-01T00:00:00Z"
            },
            {
                "id": "shop-008",
                "name": "Groom Survival Kit",
                "description": "Funny groom survival kit with hangover cures, snacks and emergency essentials!",
                "price": 19.99,
                "affiliate_url": "https://www.amazon.co.uk/dp/example8",
                "image_url": "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400",
                "category": "other",
                "is_active": True,
                "created_at": "2024-01-01T00:00:00Z"
            }
        ]
        await db.shop_items.insert_many(sample_items)
        logger.info(f"Seeded {len(sample_items)} shop items")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
