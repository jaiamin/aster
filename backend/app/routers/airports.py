import csv
import io
import time as _time

import httpx
from fastapi import APIRouter, HTTPException

from app.http_client import get_client

router = APIRouter()

DATA_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv"

_cache: list | None = None
_cache_time: float = 0
CACHE_TTL = 86400.0  # 24 hours — essentially static

INCLUDE_TYPES = {"large_airport", "medium_airport"}


@router.get("/airports")
async def get_airports():
    global _cache, _cache_time

    now = _time.monotonic()
    if _cache is not None and (now - _cache_time) < CACHE_TTL:
        return _cache

    client = get_client()
    try:
        resp = await client.get(DATA_URL)
        resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        if _cache is not None:
            return _cache
        raise HTTPException(status_code=e.response.status_code, detail="OurAirports error")
    except httpx.RequestError:
        if _cache is not None:
            return _cache
        raise HTTPException(status_code=502, detail="Failed to fetch airport data")

    reader = csv.DictReader(io.StringIO(resp.text))
    results = []
    for row in reader:
        atype = row.get("type", "")
        if atype not in INCLUDE_TYPES:
            continue

        try:
            lat = float(row["latitude_deg"])
            lng = float(row["longitude_deg"])
        except (ValueError, KeyError):
            continue

        elev = None
        try:
            elev = int(row.get("elevation_ft") or "")
        except ValueError:
            pass

        results.append(
            {
                "id": row.get("ident", row.get("id", "")),
                "name": row.get("name", "Unknown"),
                "type": atype,
                "latitude": lat,
                "longitude": lng,
                "elevation": elev,
                "country": row.get("iso_country"),
                "region": row.get("iso_region"),
                "municipality": row.get("municipality"),
                "iata": row.get("iata_code") or None,
                "icao": row.get("icao_code") or None,
            }
        )

    _cache = results
    _cache_time = now
    return results
