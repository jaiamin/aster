import httpx
from fastapi import APIRouter, HTTPException

from app import cache
from app.http_client import get_client

router = APIRouter()

CABLES_URL = "https://www.submarinecablemap.com/api/v3/cable/cable-geo.json"
LANDING_POINTS_URL = "https://www.submarinecablemap.com/api/v3/landing-point/landing-point-geo.json"
CACHE_KEY = "cables"
CACHE_TTL = 86400


async def refresh_cables() -> dict:
    """Fetch cables and cache. Used by scheduler and router."""
    client = get_client()
    try:
        cables_resp = await client.get(CABLES_URL)
        cables_resp.raise_for_status()
        points_resp = await client.get(LANDING_POINTS_URL)
        points_resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="Cable data error")
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Failed to fetch cable data")

    result = {"cables": cables_resp.json(), "landingPoints": points_resp.json()}
    await cache.set(CACHE_KEY, result, CACHE_TTL)
    return result


@router.get("/cables")
async def get_cables():
    cached = await cache.get(CACHE_KEY)
    if cached is not None:
        return cached
    return await refresh_cables()
