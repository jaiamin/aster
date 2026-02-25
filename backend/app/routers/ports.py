import time as _time

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

DATA_URL = "https://raw.githubusercontent.com/tayljordan/ports/main/ports.json"

_cache: list | None = None
_cache_time: float = 0
CACHE_TTL = 86400.0  # 24 hours — static dataset


@router.get("/ports")
async def get_ports():
    global _cache, _cache_time

    now = _time.monotonic()
    if _cache is not None and (now - _cache_time) < CACHE_TTL:
        return _cache

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.get(DATA_URL)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            if _cache is not None:
                return _cache
            raise HTTPException(status_code=e.response.status_code, detail="Port data source error")
        except httpx.RequestError:
            if _cache is not None:
                return _cache
            raise HTTPException(status_code=502, detail="Failed to fetch port data")

    raw: list[dict] = resp.json()
    results = []
    for i, entry in enumerate(raw):
        try:
            lat = float(entry["LATITUDE"])
            lng = float(entry["LONGITUDE"])
        except (ValueError, KeyError, TypeError):
            continue

        city = entry.get("CITY") or "Unknown"
        state = entry.get("STATE") or None
        country = entry.get("COUNTRY") or None

        results.append(
            {
                "id": i,
                "name": city,
                "state": state,
                "country": country,
                "latitude": lat,
                "longitude": lng,
            }
        )

    _cache = results
    _cache_time = now
    return results
