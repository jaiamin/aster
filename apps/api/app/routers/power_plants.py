import csv
import io

import httpx
from fastapi import APIRouter

from app.services.base import fetch_and_cache

router = APIRouter()

DATA_URL = "https://raw.githubusercontent.com/wri/global-power-plant-database/master/output_database/global_power_plant_database.csv"
CACHE_KEY = "power_plants"
CACHE_TTL = 86400

_FUEL_MAP = {
    "Petro": "Oil",
    "Cogeneration": "Gas",
    "Storage": "Other",
    "Wave and Tidal": "Hydro",
}


def _transform(resp: httpx.Response) -> list:
    reader = csv.DictReader(io.StringIO(resp.text))
    results = []
    for row in reader:
        try:
            lat = float(row["latitude"])
            lng = float(row["longitude"])
        except (ValueError, KeyError):
            continue

        try:
            capacity = round(float(row.get("capacity_mw", "")), 1)
        except ValueError:
            capacity = 0

        try:
            year = int(float(row.get("commissioning_year", "")))
        except ValueError:
            year = None

        results.append(
            {
                "id": row.get("gppd_idnr", ""),
                "name": row.get("name", "Unknown"),
                "latitude": lat,
                "longitude": lng,
                "country": row.get("country_long", ""),
                "countryCode": row.get("country", ""),
                "fuelType": _FUEL_MAP.get(row.get("primary_fuel", "Other"), row.get("primary_fuel", "Other")),
                "capacityMw": capacity,
                "owner": row.get("owner") or None,
                "commissioningYear": year,
            }
        )
    return results


@router.get("/power-plants")
async def get_power_plants():
    return await fetch_and_cache(CACHE_KEY, DATA_URL, CACHE_TTL, _transform, error_source="WRI", request_timeout=60.0)
