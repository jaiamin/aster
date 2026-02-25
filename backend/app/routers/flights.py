import time as _time

import httpx
from fastapi import APIRouter, HTTPException

from app.config import settings

router = APIRouter()

FIELD_ICAO24 = 0
FIELD_CALLSIGN = 1
FIELD_ORIGIN_COUNTRY = 2
FIELD_LONGITUDE = 5
FIELD_LATITUDE = 6
FIELD_BARO_ALTITUDE = 7
FIELD_ON_GROUND = 8
FIELD_VELOCITY = 9
FIELD_TRUE_TRACK = 10

_cache: dict | None = None
_cache_time: float = 0
CACHE_TTL = 10.0

_token: str | None = None
_token_time: float = 0
TOKEN_TTL = 25 * 60  # refresh 5 min before 30-min expiry


async def _get_token(client: httpx.AsyncClient) -> str | None:
    global _token, _token_time

    if not settings.opensky_client_id:
        return None

    now = _time.monotonic()
    if _token and (now - _token_time) < TOKEN_TTL:
        return _token

    resp = await client.post(
        settings.opensky_token_url,
        data={
            "grant_type": "client_credentials",
            "client_id": settings.opensky_client_id,
            "client_secret": settings.opensky_client_secret,
        },
    )
    resp.raise_for_status()
    _token = resp.json()["access_token"]
    _token_time = now
    return _token


def _parse_states(data: dict) -> dict:
    states = data.get("states") or []
    flights = []
    for s in states:
        if s[FIELD_ON_GROUND]:
            continue
        lon = s[FIELD_LONGITUDE]
        lat = s[FIELD_LATITUDE]
        if lon is None or lat is None:
            continue
        flights.append(
            {
                "icao24": s[FIELD_ICAO24],
                "callsign": (s[FIELD_CALLSIGN] or "").strip(),
                "origin_country": s[FIELD_ORIGIN_COUNTRY],
                "longitude": lon,
                "latitude": lat,
                "baro_altitude": s[FIELD_BARO_ALTITUDE],
                "velocity": s[FIELD_VELOCITY],
                "true_track": s[FIELD_TRUE_TRACK],
            }
        )
    return {"time": data.get("time"), "flights": flights}


@router.get("/flights")
async def get_flights():
    global _cache, _cache_time

    now = _time.monotonic()
    if _cache is not None and (now - _cache_time) < CACHE_TTL:
        return _cache

    url = f"{settings.opensky_base_url}/states/all"

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            token = await _get_token(client)
            headers = {"Authorization": f"Bearer {token}"} if token else {}
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (401, 429) and _cache is not None:
                if e.response.status_code == 401:
                    global _token
                    _token = None  # force token refresh on next request
                return _cache
            raise HTTPException(status_code=e.response.status_code, detail="OpenSky API error")
        except httpx.RequestError:
            if _cache is not None:
                return _cache
            raise HTTPException(status_code=502, detail="Failed to reach OpenSky API")

    result = _parse_states(resp.json())
    _cache = result
    _cache_time = now
    return result
