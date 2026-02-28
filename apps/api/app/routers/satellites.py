import httpx
from fastapi import APIRouter

from app import cache
from app.http_client import get_client
from app.services.base import fetch_and_cache

router = APIRouter()

CELESTRAK_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json"
CACHE_KEY = "satellites"
CACHE_TTL = 7200

SATCAT_URL = "https://celestrak.org/satcat/records.php"
DETAIL_CACHE_TTL = 86400


@router.get("/satellites")
async def get_satellites():
    return await fetch_and_cache(
        CACHE_KEY, CELESTRAK_URL, CACHE_TTL, lambda resp: resp.json(), error_source="CelesTrak"
    )


@router.get("/satellites/{norad_id}/detail")
async def get_satellite_detail(norad_id: int):
    detail_key = f"satellite_detail:{norad_id}"
    cached = await cache.get(detail_key)
    if cached is not None:
        return cached

    satcat = None
    client = get_client()
    try:
        resp = await client.get(SATCAT_URL, params={"CATNR": norad_id, "FORMAT": "json"}, timeout=10.0)
        if resp.status_code == 200:
            records = resp.json()
            if isinstance(records, list) and len(records) > 0:
                r = records[0]
                satcat = {
                    "objectType": r.get("OBJECT_TYPE"),
                    "owner": r.get("OWNER"),
                    "launchDate": r.get("LAUNCH_DATE"),
                    "launchSite": r.get("LAUNCH_SITE"),
                    "decayDate": r.get("DECAY_DATE") or None,
                    "period": r.get("PERIOD"),
                    "apogee": r.get("APOGEE"),
                    "perigee": r.get("PERIGEE"),
                    "rcs": r.get("RCS"),
                }
    except (httpx.RequestError, ValueError):
        pass

    result = {"satcat": satcat}
    await cache.set(detail_key, result, DETAIL_CACHE_TTL)
    return result
