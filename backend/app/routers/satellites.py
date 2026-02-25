import time as _time

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

_cache: list | None = None
_cache_time: float = 0
CACHE_TTL = 7200.0  # 2 hours

CELESTRAK_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json"


@router.get("/satellites")
async def get_satellites():
    global _cache, _cache_time

    now = _time.monotonic()
    if _cache is not None and (now - _cache_time) < CACHE_TTL:
        return _cache

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.get(CELESTRAK_URL)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            if _cache is not None:
                return _cache
            raise HTTPException(
                status_code=e.response.status_code, detail="CelesTrak API error"
            )
        except httpx.RequestError:
            if _cache is not None:
                return _cache
            raise HTTPException(
                status_code=502, detail="Failed to reach CelesTrak API"
            )

    result = resp.json()
    _cache = result
    _cache_time = now
    return result
