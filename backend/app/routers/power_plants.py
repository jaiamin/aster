import csv
import io

import httpx
from fastapi import APIRouter, HTTPException

from app import cache
from app.http_client import get_client

router = APIRouter()

DATA_URL = "https://raw.githubusercontent.com/wri/global-power-plant-database/master/output_database/global_power_plant_database.csv"
CACHE_KEY = "power_plants"
CACHE_TTL = 86400


def _normalize_fuel(raw: str) -> str:
    mapping = {
        "Petro": "Oil",
        "Cogeneration": "Gas",
        "Storage": "Other",
        "Wave and Tidal": "Hydro",
    }
    return mapping.get(raw, raw)


@router.get("/power-plants")
async def get_power_plants():
    cached = await cache.get(CACHE_KEY)
    if cached is not None:
        return cached

    client = get_client()
    try:
        resp = await client.get(DATA_URL, timeout=60.0)
        resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="WRI data error")
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Failed to fetch power plant data")

    reader = csv.DictReader(io.StringIO(resp.text))
    results = []
    for row in reader:
        try:
            lat = float(row["latitude"])
            lng = float(row["longitude"])
        except (ValueError, KeyError):
            continue

        cap_raw = row.get("capacity_mw", "")
        try:
            capacity = round(float(cap_raw), 1)
        except ValueError:
            capacity = 0

        year_raw = row.get("commissioning_year", "")
        try:
            year = int(float(year_raw))
        except ValueError:
            year = None

        results.append({
            "id": row.get("gppd_idnr", ""),
            "name": row.get("name", "Unknown"),
            "latitude": lat,
            "longitude": lng,
            "country": row.get("country_long", ""),
            "countryCode": row.get("country", ""),
            "fuelType": _normalize_fuel(row.get("primary_fuel", "Other")),
            "capacityMw": capacity,
            "owner": row.get("owner") or None,
            "commissioningYear": year,
        })

    await cache.set(CACHE_KEY, results, CACHE_TTL)
    return results
