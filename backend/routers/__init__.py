from .events import router as events_router
from .media import router as media_router
from .shop import router as shop_router
from .shop_requests import router as shop_requests_router
from .dares import router as dares_router
from .kitty import router as kitty_router
from .auth import router as auth_router
from .points import router as points_router

__all__ = [
    "events_router",
    "media_router",
    "shop_router",
    "shop_requests_router",
    "dares_router",
    "kitty_router",
    "auth_router",
    "points_router",
]
