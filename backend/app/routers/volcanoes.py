import time as _time

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

EONET_URL = "https://eonet.gsfc.nasa.gov/api/v3/events"

_cache: list | None = None
_cache_time: float = 0
CACHE_TTL = 1800.0  # 30 minutes — volcano data changes slowly


@router.get("/volcanoes")
async def get_volcanoes():
    global _cache, _cache_time

    now = _time.monotonic()
    if _cache is not None and (now - _cache_time) < CACHE_TTL:
        return _cache

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.get(
                EONET_URL,
                params={"category": "volcanoes", "status": "open", "limit": 365},
            )
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            if _cache is not None:
                return _cache
            raise HTTPException(status_code=e.response.status_code, detail="EONET API error")
        except httpx.RequestError:
            if _cache is not None:
                return _cache
            raise HTTPException(status_code=502, detail="Failed to reach EONET API")

    data = resp.json()
    results = []
    for event in data.get("events") or []:
        geom = event.get("geometry")
        if not geom:
            continue
        latest = geom[-1]
        coords = latest.get("coordinates")
        if not coords or len(coords) < 2:
            continue
        sources = event.get("sources") or []
        source_url = sources[0]["url"] if sources else None
        results.append(
            {
                "id": event["id"],
                "title": event.get("title", "Unknown"),
                "longitude": coords[0],
                "latitude": coords[1],
                "date": latest.get("date"),
                "sourceUrl": source_url,
            }
        )

    _cache = results
    _cache_time = now
    return results
