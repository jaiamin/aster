import httpx
from fastapi import APIRouter, HTTPException

from app import cache
from app.geo.country_lookup import country_from_coords
from app.http_client import get_client

router = APIRouter()

UPCOMING_URL = "https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=50&mode=detailed"
PREVIOUS_URL = "https://ll.thespacedevs.com/2.3.0/launches/previous/?limit=50&mode=detailed"
CACHE_KEY = "launches"
CACHE_TTL = 600


def _parse_launch(launch: dict) -> dict | None:
    pad = launch.get("pad") or {}
    lat = pad.get("latitude")
    lng = pad.get("longitude")
    if lat is None or lng is None:
        return None

    try:
        lat = float(lat)
        lng = float(lng)
    except (TypeError, ValueError):
        return None

    rocket = launch.get("rocket") or {}
    rocket_config = rocket.get("configuration") or {}
    mission = launch.get("mission") or {}
    orbit = mission.get("orbit") or {}
    status = launch.get("status") or {}
    launch_provider = rocket_config.get("manufacturer") or {}
    pad_location = pad.get("location") or {}

    return {
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
        "country": country_from_coords(lat, lng),
    }


@router.get("/launches")
async def get_launches():
    cached = await cache.get(CACHE_KEY)
    if cached is not None:
        return cached

    results = []
    client = get_client()
    for url in (UPCOMING_URL, PREVIOUS_URL):
        try:
            resp = await client.get(url)
            resp.raise_for_status()
            raw = resp.json()
            for launch in raw.get("results", []):
                parsed = _parse_launch(launch)
                if parsed:
                    results.append(parsed)
        except (httpx.HTTPStatusError, httpx.RequestError):
            pass

    if not results:
        raise HTTPException(status_code=502, detail="Failed to fetch launch data")

    await cache.set(CACHE_KEY, results, CACHE_TTL)
    return results
