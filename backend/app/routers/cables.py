import httpx
from fastapi import APIRouter, HTTPException

from app import cache
from app.http_client import get_client

router = APIRouter()

CABLES_URL = "https://www.submarinecablemap.com/api/v3/cable/cable-geo.json"
LANDING_POINTS_URL = "https://www.submarinecablemap.com/api/v3/landing-point/landing-point-geo.json"
CACHE_KEY = "cables"
CACHE_TTL = 86400


@router.get("/cables")
async def get_cables():
    cached = await cache.get(CACHE_KEY)
    if cached is not None:
        return cached

    client = get_client()
    try:
        cables_resp, points_resp = await _fetch_both(client)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="Cable data error")
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Failed to fetch cable data")

    cables_geo = cables_resp.json()
    points_geo = points_resp.json()

    result = {
        "cables": cables_geo,
        "landingPoints": points_geo,
    }

    await cache.set(CACHE_KEY, result, CACHE_TTL)
    return result


async def _fetch_both(client: httpx.AsyncClient):
    cables_resp = await client.get(CABLES_URL)
    cables_resp.raise_for_status()
    points_resp = await client.get(LANDING_POINTS_URL)
    points_resp.raise_for_status()
    return cables_resp, points_resp
