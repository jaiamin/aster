import time as _time

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

DATA_URL = "https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=50&mode=detailed"

_cache: list | None = None
_cache_time: float = 0
CACHE_TTL = 600.0  # 10 min — conservative for 15 req/hr limit


@router.get("/launches")
async def get_launches():
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
            raise HTTPException(status_code=e.response.status_code, detail="Launch Library 2 error")
        except httpx.RequestError:
            if _cache is not None:
                return _cache
            raise HTTPException(status_code=502, detail="Failed to fetch launch data")

    raw = resp.json()
    results = []
    for launch in raw.get("results", []):
        pad = launch.get("pad") or {}
        lat = pad.get("latitude")
        lng = pad.get("longitude")
        if lat is None or lng is None:
            continue

        try:
            lat = float(lat)
            lng = float(lng)
        except (TypeError, ValueError):
            continue

        rocket = launch.get("rocket") or {}
        rocket_config = rocket.get("configuration") or {}
        mission = launch.get("mission") or {}
        orbit = mission.get("orbit") or {}
        status = launch.get("status") or {}
        launch_provider = rocket_config.get("manufacturer") or {}
        pad_location = pad.get("location") or {}

        results.append(
            {
                "id": launch.get("id", ""),
                "name": launch.get("name", "Unknown"),
                "status": status.get("abbrev", "Unknown"),
                "net": launch.get("net", ""),
                "rocketName": rocket_config.get("full_name") or rocket_config.get("name", "Unknown"),
                "provider": launch_provider.get("name", "Unknown") if isinstance(launch_provider, dict) else str(launch_provider),
                "missionName": mission.get("name"),
                "missionOrbit": orbit.get("abbrev"),
                "missionDescription": mission.get("description"),
                "padName": pad.get("name", "Unknown"),
                "padLocation": pad_location.get("name", "Unknown") if isinstance(pad_location, dict) else str(pad_location),
                "latitude": lat,
                "longitude": lng,
                "image": launch.get("image") or (rocket_config.get("image") if rocket_config else None),
                "probability": launch.get("probability"),
                "url": launch.get("url", ""),
            }
        )

    _cache = results
    _cache_time = now
    return results
