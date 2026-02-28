import csv
import io

import httpx
from fastapi import APIRouter

from app.geo.country_lookup import country_from_coords
from app.services.base import fetch_and_cache

router = APIRouter()

FIRMS_URL = "https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_Global_24h.csv"
CACHE_KEY = "wildfires"
CACHE_TTL = 600
MIN_FRP = 15.0


def _transform(resp: httpx.Response) -> list:
    reader = csv.DictReader(io.StringIO(resp.text))
    fires = []
    for row in reader:
        try:
            frp = float(row.get("frp") or 0)
            if frp < MIN_FRP:
                continue
            lat = float(row["latitude"])
            lon = float(row["longitude"])
            fires.append(
                {
                    "latitude": lat,
                    "longitude": lon,
                    "brightness": float(row.get("bright_ti4") or 0),
                    "frp": frp,
                    "confidence": row.get("confidence", ""),
                    "acqDate": row.get("acq_date", ""),
                    "acqTime": row.get("acq_time", ""),
                    "daynight": row.get("daynight", ""),
                    "country": country_from_coords(lat, lon),
                }
            )
        except (ValueError, KeyError):
            continue
    return fires


@router.get("/wildfires")
async def get_wildfires():
    return await fetch_and_cache(CACHE_KEY, FIRMS_URL, CACHE_TTL, _transform, error_source="FIRMS")
