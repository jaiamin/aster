import httpx
from fastapi import APIRouter, HTTPException

from app import cache
from app.http_client import get_client

router = APIRouter()

CELESTRAK_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json"
CACHE_KEY = "satellites"
CACHE_TTL = 7200

SATCAT_URL = "https://celestrak.org/satcat/records.php"
DETAIL_CACHE_TTL = 86400


@router.get("/satellites")
async def get_satellites():
    cached = await cache.get(CACHE_KEY)
    if cached is not None:
        return cached

    client = get_client()
    try:
        resp = await client.get(CELESTRAK_URL)
        resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code, detail="CelesTrak API error"
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=502, detail="Failed to reach CelesTrak API"
        )

    result = resp.json()
    await cache.set(CACHE_KEY, result, CACHE_TTL)
    return result


@router.get("/satellites/{norad_id}/detail")
async def get_satellite_detail(norad_id: int):
    detail_key = f"satellite_detail:{norad_id}"
    cached = await cache.get(detail_key)
    if cached is not None:
        return cached

    satcat = None

    client = get_client()
    try:
        resp = await client.get(
            SATCAT_URL, params={"CATNR": norad_id, "FORMAT": "json"}, timeout=10.0
        )
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
