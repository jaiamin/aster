import httpx
from fastapi import APIRouter

from app.geo.country_lookup import country_from_coords
from app.services.base import fetch_and_cache

router = APIRouter()

EONET_URL = "https://eonet.gsfc.nasa.gov/api/v3/events"
CACHE_KEY = "volcanoes"
CACHE_TTL = 1800


def _transform(resp: httpx.Response) -> list:
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
        lat = coords[1]
        lng = coords[0]
        results.append(
            {
                "id": event["id"],
                "title": event.get("title", "Unknown"),
                "longitude": lng,
                "latitude": lat,
                "date": latest.get("date"),
                "sourceUrl": source_url,
                "country": country_from_coords(lat, lng),
            }
        )
    return results


@router.get("/volcanoes")
async def get_volcanoes():
    return await fetch_and_cache(
        CACHE_KEY,
        EONET_URL,
        CACHE_TTL,
        _transform,
        error_source="EONET",
        params={"category": "volcanoes", "status": "open", "limit": 365},
    )
