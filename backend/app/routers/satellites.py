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


# --- Satellite detail endpoint ---

SATCAT_URL = "https://celestrak.org/satcat/records.php"

_detail_cache: dict[int, tuple[float, dict]] = {}
DETAIL_CACHE_TTL = 86400.0  # 24 hours


@router.get("/satellites/{norad_id}/detail")
async def get_satellite_detail(norad_id: int):
    now = _time.monotonic()
    cached = _detail_cache.get(norad_id)
    if cached and (now - cached[0]) < DETAIL_CACHE_TTL:
        return cached[1]

    satcat = None

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(
                SATCAT_URL, params={"CATNR": norad_id, "FORMAT": "json"}
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
    _detail_cache[norad_id] = (now, result)
    return result
