import time as _time

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

USGS_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"

_cache: list | None = None
_cache_time: float = 0
CACHE_TTL = 60.0


@router.get("/earthquakes")
async def get_earthquakes():
    global _cache, _cache_time

    now = _time.monotonic()
    if _cache is not None and (now - _cache_time) < CACHE_TTL:
        return _cache

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(USGS_URL)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            if _cache is not None:
                return _cache
            raise HTTPException(status_code=e.response.status_code, detail="USGS API error")
        except httpx.RequestError:
            if _cache is not None:
                return _cache
            raise HTTPException(status_code=502, detail="Failed to reach USGS API")

    data = resp.json()
    quakes = []
    for f in data.get("features") or []:
        props = f.get("properties", {})
        coords = f.get("geometry", {}).get("coordinates", [])
        if len(coords) < 3:
            continue
        mag = props.get("mag")
        if mag is None:
            continue
        quakes.append(
            {
                "id": f.get("id"),
                "magnitude": mag,
                "place": props.get("place"),
                "time": props.get("time"),
                "longitude": coords[0],
                "latitude": coords[1],
                "depth": coords[2],
                "tsunami": bool(props.get("tsunami")),
                "alert": props.get("alert"),
                "significance": props.get("sig"),
                "magType": props.get("magType"),
                "status": props.get("status"),
                "felt": props.get("felt"),
                "url": props.get("url"),
            }
        )

    _cache = quakes
    _cache_time = now
    return quakes
