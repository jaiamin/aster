import httpx
from fastapi import APIRouter, HTTPException

from app import cache

router = APIRouter()

DATA_URL = "https://raw.githubusercontent.com/cristianst85/GeoNuclearData/master/data/json/denormalized/nuclear_power_plants.json"
CACHE_KEY = "nuclear"
CACHE_TTL = 86400


@router.get("/nuclear")
async def get_nuclear():
    cached = await cache.get(CACHE_KEY)
    if cached is not None:
        return cached

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.get(DATA_URL)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail="GeoNuclearData error")
        except httpx.RequestError:
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

    await cache.set(CACHE_KEY, results, CACHE_TTL)
    return results
