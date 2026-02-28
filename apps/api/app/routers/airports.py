import contextlib
import csv
import io

import httpx
from fastapi import APIRouter

from app.services.base import fetch_and_cache

router = APIRouter()

DATA_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv"
CACHE_KEY = "airports"
CACHE_TTL = 86400
INCLUDE_TYPES = {"large_airport", "medium_airport"}


def _transform(resp: httpx.Response) -> list:
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
        with contextlib.suppress(ValueError):
            elev = int(row.get("elevation_ft") or "")

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
    return results


@router.get("/airports")
async def get_airports():
    return await fetch_and_cache(CACHE_KEY, DATA_URL, CACHE_TTL, _transform, error_source="OurAirports")
