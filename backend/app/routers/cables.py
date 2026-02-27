import time as _time

import httpx
from fastapi import APIRouter, HTTPException

from app.http_client import get_client

router = APIRouter()

CABLES_URL = "https://www.submarinecablemap.com/api/v3/cable/cable-geo.json"
LANDING_POINTS_URL = "https://www.submarinecablemap.com/api/v3/landing-point/landing-point-geo.json"

_cache: dict | None = None
_cache_time: float = 0
CACHE_TTL = 86400.0  # 24 hours — static data


@router.get("/cables")
async def get_cables():
    global _cache, _cache_time

    now = _time.monotonic()
    if _cache is not None and (now - _cache_time) < CACHE_TTL:
        return _cache

    client = get_client()
    try:
        cables_resp, points_resp = await _fetch_both(client)
    except httpx.HTTPStatusError as e:
        if _cache is not None:
            return _cache
        raise HTTPException(status_code=e.response.status_code, detail="Cable data error")
    except httpx.RequestError:
        if _cache is not None:
            return _cache
        raise HTTPException(status_code=502, detail="Failed to fetch cable data")

    cables_geo = cables_resp.json()
    points_geo = points_resp.json()

    result = {
        "cables": cables_geo,
        "landingPoints": points_geo,
    }

    _cache = result
    _cache_time = now
    return result


async def _fetch_both(client: httpx.AsyncClient):
    cables_resp = await client.get(CABLES_URL)
    cables_resp.raise_for_status()
    points_resp = await client.get(LANDING_POINTS_URL)
    points_resp.raise_for_status()
    return cables_resp, points_resp
