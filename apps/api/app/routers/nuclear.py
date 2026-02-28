import httpx
from fastapi import APIRouter

from app.services.base import fetch_and_cache

router = APIRouter()

DATA_URL = "https://raw.githubusercontent.com/cristianst85/GeoNuclearData/master/data/json/denormalized/nuclear_power_plants.json"
CACHE_KEY = "nuclear"
CACHE_TTL = 86400


def _transform(resp: httpx.Response) -> list:
    raw = resp.json()
    results = []
    for plant in raw:
        lat = plant.get("Latitude")
        lng = plant.get("Longitude")
        if lat is None or lng is None:
            continue
        results.append(
            {
                "id": plant.get("Id"),
                "name": plant.get("Name", "Unknown"),
                "latitude": lat,
                "longitude": lng,
                "country": plant.get("Country"),
                "countryCode": plant.get("CountryCode"),
                "status": plant.get("Status") or "Unknown",
                "reactorType": plant.get("ReactorType"),
                "reactorModel": plant.get("ReactorModel"),
                "capacity": plant.get("Capacity"),
                "operationalFrom": plant.get("OperationalFrom"),
                "operationalTo": plant.get("OperationalTo"),
                "source": plant.get("Source"),
            }
        )
    return results


@router.get("/nuclear")
async def get_nuclear():
    return await fetch_and_cache(CACHE_KEY, DATA_URL, CACHE_TTL, _transform, error_source="GeoNuclearData")
