import csv
import io

import httpx
from fastapi import APIRouter, HTTPException

from app import cache
from app.geo.country_lookup import country_from_coords
from app.http_client import get_client

router = APIRouter()

FIRMS_URL = "https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_Global_24h.csv"
CACHE_KEY = "wildfires"
CACHE_TTL = 600

# Only include fires with meaningful FRP to keep payload manageable
MIN_FRP = 15.0


@router.get("/wildfires")
async def get_wildfires():
    cached = await cache.get(CACHE_KEY)
    if cached is not None:
        return cached

    client = get_client()
    try:
        resp = await client.get(FIRMS_URL)
        resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code, detail="FIRMS API error"
        )
    except httpx.RequestError:
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
                    "country": country_from_coords(lat, lon),
                }
            )
        except (ValueError, KeyError):
            continue

    await cache.set(CACHE_KEY, fires, CACHE_TTL)
    return fires
