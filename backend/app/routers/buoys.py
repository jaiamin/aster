import time as _time

import httpx
from fastapi import APIRouter, HTTPException

from app.http_client import get_client

router = APIRouter()

DATA_URL = "https://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt"

_cache: list | None = None
_cache_time: float = 0
CACHE_TTL = 600.0  # 10 minutes — real-time data


def _parse_val(raw: str) -> float | None:
    if raw == "MM" or raw == "":
        return None
    try:
        return float(raw)
    except ValueError:
        return None


@router.get("/buoys")
async def get_buoys():
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
        raise HTTPException(status_code=e.response.status_code, detail="NDBC data source error")
    except httpx.RequestError:
        if _cache is not None:
            return _cache
        raise HTTPException(status_code=502, detail="Failed to fetch buoy data")

    lines = resp.text.strip().split("\n")
    # Skip header lines (start with #)
    data_lines = [l for l in lines if not l.startswith("#")]

    results = []
    for line in data_lines:
        parts = line.split()
        if len(parts) < 21:
            continue

        station = parts[0]
        lat = _parse_val(parts[1])
        lng = _parse_val(parts[2])
        if lat is None or lng is None:
            continue

        results.append(
            {
                "id": station,
                "latitude": lat,
                "longitude": lng,
                "time": f"{parts[3]}-{parts[4]}-{parts[5]}T{parts[6]}:{parts[7]}Z",
                "windDir": _parse_val(parts[8]),
                "windSpeed": _parse_val(parts[9]),
                "gust": _parse_val(parts[10]),
                "waveHeight": _parse_val(parts[11]),
                "wavePeriod": _parse_val(parts[12]),
                "pressure": _parse_val(parts[15]),
                "airTemp": _parse_val(parts[17]),
                "waterTemp": _parse_val(parts[18]),
                "dewPoint": _parse_val(parts[19]),
            }
        )

    _cache = results
    _cache_time = now
    return results
