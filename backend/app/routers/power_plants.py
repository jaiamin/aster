import csv
import io
import time as _time

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

DATA_URL = "https://raw.githubusercontent.com/wri/global-power-plant-database/master/output_database/global_power_plant_database.csv"

_cache: list | None = None
_cache_time: float = 0
CACHE_TTL = 86400.0  # 24 hours — data is essentially static


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
    global _cache, _cache_time

    now = _time.monotonic()
    if _cache is not None and (now - _cache_time) < CACHE_TTL:
        return _cache

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.get(DATA_URL)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            if _cache is not None:
                return _cache
            raise HTTPException(status_code=e.response.status_code, detail="WRI data error")
        except httpx.RequestError:
            if _cache is not None:
                return _cache
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

    _cache = results
    _cache_time = now
    return results
