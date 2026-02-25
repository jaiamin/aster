from fastapi import APIRouter

from app.config import settings

router = APIRouter()


@router.get("/config/map")
def get_map_config():
    return {
        "style_url": settings.map_style_url,
        "initial_view": {
            "latitude": settings.map_initial_lat,
            "longitude": settings.map_initial_lng,
            "zoom": settings.map_initial_zoom,
        },
    }
