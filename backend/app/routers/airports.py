import csv
import io

import httpx
from fastapi import APIRouter, HTTPException

from app import cache
from app.http_client import get_client

router = APIRouter()

DATA_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv"
CACHE_KEY = "airports"
CACHE_TTL = 86400

INCLUDE_TYPES = {"large_airport", "medium_airport"}


@router.get("/airports")
async def get_airports():
    cached = await cache.get(CACHE_KEY)
    if cached is not None:
        return cached

    client = get_client()
    try:
        resp = await client.get(DATA_URL)
        resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="OurAirports error")
    except httpx.RequestError:
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

    await cache.set(CACHE_KEY, results, CACHE_TTL)
    return results
