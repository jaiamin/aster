import time as _time

import httpx
from fastapi import APIRouter, HTTPException

from app.config import settings
from app.http_client import get_client

router = APIRouter()

# OpenAQ v3: PM2.5 parameter ID is 2
OPENAQ_LATEST_URL = "https://api.openaq.org/v3/parameters/2/latest"

_cache: list | None = None
_cache_time: float = 0
CACHE_TTL = 1800.0  # 30 minutes


@router.get("/air-quality")
async def get_air_quality():
    global _cache, _cache_time

    if not settings.openaq_api_key:
        if _cache is not None:
            return _cache
        return []

    now = _time.monotonic()
    if _cache is not None and (now - _cache_time) < CACHE_TTL:
        return _cache

    all_results: list[dict] = []
    page = 1
    max_pages = 10
    seen_ids: set[int] = set()

    headers = {"X-API-Key": settings.openaq_api_key}

    client = get_client()
    while page <= max_pages:
        try:
            resp = await client.get(
                OPENAQ_LATEST_URL,
                params={"limit": 1000, "page": page},
                headers=headers,
            )
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            if _cache is not None:
                return _cache
            if all_results:
                break
            raise HTTPException(
                status_code=e.response.status_code,
                detail="OpenAQ API error",
            )
        except httpx.RequestError:
            if _cache is not None:
                return _cache
            if all_results:
                break
            raise HTTPException(status_code=502, detail="Failed to reach OpenAQ API")

        data = resp.json()
        results = data.get("results") or []
        if not results:
            break

        for r in results:
            coords = r.get("coordinates") or {}
            lat = coords.get("latitude")
            lng = coords.get("longitude")
            if lat is None or lng is None:
                continue

            value = r.get("value")
            if value is None or value < 0:
                continue

            loc_id = r.get("locationsId")
            if loc_id in seen_ids:
                continue
            seen_ids.add(loc_id)

            dt = r.get("datetime") or {}

            all_results.append(
                {
                    "id": str(loc_id),
                    "name": f"Station {loc_id}",
                    "city": None,
                    "country": None,
                    "latitude": lat,
                    "longitude": lng,
                    "pm25": round(value, 1),
                    "unit": "µg/m³",
                    "lastUpdated": dt.get("utc"),
                }
            )

        if len(results) < 1000:
            break
        page += 1

    _cache = all_results
    _cache_time = now
    return all_results
