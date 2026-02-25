import time as _time

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

DATA_URL = "https://raw.githubusercontent.com/cristianst85/GeoNuclearData/master/data/json/denormalized/nuclear_power_plants.json"

_cache: list | None = None
_cache_time: float = 0
CACHE_TTL = 86400.0  # 24 hours — data is essentially static


@router.get("/nuclear")
async def get_nuclear():
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
            raise HTTPException(status_code=e.response.status_code, detail="GeoNuclearData error")
        except httpx.RequestError:
            if _cache is not None:
                return _cache
            raise HTTPException(status_code=502, detail="Failed to fetch nuclear data")

    raw = resp.json()
    results = []
    for plant in raw:
        lat = plant.get("Latitude")
        lng = plant.get("Longitude")
        if lat is None or lng is None:
            continue

        status = plant.get("Status") or "Unknown"

        results.append(
            {
                "id": plant.get("Id"),
                "name": plant.get("Name", "Unknown"),
                "latitude": lat,
                "longitude": lng,
                "country": plant.get("Country"),
                "countryCode": plant.get("CountryCode"),
                "status": status,
                "reactorType": plant.get("ReactorType"),
                "reactorModel": plant.get("ReactorModel"),
                "capacity": plant.get("Capacity"),
                "operationalFrom": plant.get("OperationalFrom"),
                "operationalTo": plant.get("OperationalTo"),
                "source": plant.get("Source"),
            }
        )

    _cache = results
    _cache_time = now
    return results
