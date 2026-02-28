import httpx
from fastapi import APIRouter

from app.services.base import fetch_and_cache

router = APIRouter()

DATA_URL = "https://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt"
CACHE_KEY = "buoys"
CACHE_TTL = 600


def _parse_val(raw: str) -> float | None:
    if raw == "MM" or raw == "":
        return None
    try:
        return float(raw)
    except ValueError:
        return None


def _transform(resp: httpx.Response) -> list:
    lines = resp.text.strip().split("\n")
    data_lines = [line for line in lines if not line.startswith("#")]
    results = []
    for line in data_lines:
        parts = line.split()
        if len(parts) < 21:
            continue
        lat = _parse_val(parts[1])
        lng = _parse_val(parts[2])
        if lat is None or lng is None:
            continue
        results.append(
            {
                "id": parts[0],
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
    return results


@router.get("/buoys")
async def get_buoys():
    return await fetch_and_cache(CACHE_KEY, DATA_URL, CACHE_TTL, _transform, error_source="NDBC")
