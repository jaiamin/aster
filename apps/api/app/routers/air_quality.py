import httpx
from fastapi import APIRouter, HTTPException

from app import cache
from app.config import settings
from app.http_client import get_client

router = APIRouter()

# OpenAQ v3: PM2.5 parameter ID is 2
OPENAQ_LATEST_URL = "https://api.openaq.org/v3/parameters/2/latest"
CACHE_KEY = "air_quality"
CACHE_TTL = 1800


@router.get("/air-quality")
async def get_air_quality():
    if not settings.openaq_api_key:
        cached = await cache.get(CACHE_KEY)
        return cached if cached is not None else []

    cached = await cache.get(CACHE_KEY)
    if cached is not None:
        return cached

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
            if all_results:
                break
            raise HTTPException(
                status_code=e.response.status_code,
                detail="OpenAQ API error",
            )
        except httpx.RequestError:
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

    await cache.set(CACHE_KEY, all_results, CACHE_TTL)
    return all_results
