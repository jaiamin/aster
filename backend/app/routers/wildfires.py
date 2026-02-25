import csv
import io
import time as _time

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

FIRMS_URL = "https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_Global_24h.csv"

_cache: list | None = None
_cache_time: float = 0
CACHE_TTL = 600.0  # 10 minutes — FIRMS updates hourly

# Only include fires with meaningful FRP to keep payload manageable
MIN_FRP = 15.0


@router.get("/wildfires")
async def get_wildfires():
    global _cache, _cache_time

    now = _time.monotonic()
    if _cache is not None and (now - _cache_time) < CACHE_TTL:
        return _cache

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.get(FIRMS_URL)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            if _cache is not None:
                return _cache
            raise HTTPException(
                status_code=e.response.status_code, detail="FIRMS API error"
            )
        except httpx.RequestError:
            if _cache is not None:
                return _cache
            raise HTTPException(status_code=502, detail="Failed to reach FIRMS")

    reader = csv.DictReader(io.StringIO(resp.text))
    fires = []
    for row in reader:
        try:
            frp = float(row.get("frp") or 0)
            if frp < MIN_FRP:
                continue

            lat = float(row["latitude"])
            lon = float(row["longitude"])
            bright = float(row.get("bright_ti4") or 0)
            confidence = row.get("confidence", "")
            acq_date = row.get("acq_date", "")
            acq_time = row.get("acq_time", "")
            daynight = row.get("daynight", "")

            fires.append(
                {
                    "latitude": lat,
                    "longitude": lon,
                    "brightness": bright,
                    "frp": frp,
                    "confidence": confidence,
                    "acqDate": acq_date,
                    "acqTime": acq_time,
                    "daynight": daynight,
                }
            )
        except (ValueError, KeyError):
            continue

    _cache = fires
    _cache_time = now
    return fires
