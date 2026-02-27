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
FIELD_VERTICAL_RATE = 11
FIELD_SQUAWK = 14

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
                "vertical_rate": s[FIELD_VERTICAL_RATE],
                "squawk": s[FIELD_SQUAWK],
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


# --- Flight track endpoint ---

_track_cache: dict[str, tuple[float, dict]] = {}
TRACK_CACHE_TTL = 30.0


@router.get("/flights/{icao24}/track")
async def get_flight_track(icao24: str):
    now = _time.monotonic()
    cached = _track_cache.get(icao24)
    if cached and (now - cached[0]) < TRACK_CACHE_TTL:
        return cached[1]

    url = f"{settings.opensky_base_url}/tracks/all"
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            token = await _get_token(client)
            headers = {"Authorization": f"Bearer {token}"} if token else {}
            resp = await client.get(
                url, params={"icao24": icao24, "time": 0}, headers=headers
            )
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code, detail="OpenSky track error"
            )
        except httpx.RequestError:
            raise HTTPException(status_code=502, detail="Failed to reach OpenSky API")

    data = resp.json()
    path = []
    for wp in data.get("path") or []:
        path.append(
            {
                "time": wp[0],
                "latitude": wp[1],
                "longitude": wp[2],
                "altitude": wp[3],
                "heading": wp[4],
                "on_ground": wp[5],
            }
        )

    result = {
        "icao24": data.get("icao24"),
        "callsign": (data.get("callsign") or "").strip(),
        "startTime": data.get("startTime"),
        "endTime": data.get("endTime"),
        "path": path,
    }
    _track_cache[icao24] = (now, result)
    return result


# --- Flight detail endpoint (hexdb.io) ---

HEXDB_BASE = "https://hexdb.io/api/v1"
_detail_cache: dict[str, tuple[float, dict]] = {}
DETAIL_CACHE_TTL = 300.0


@router.get("/flights/{icao24}/detail")
async def get_flight_detail(icao24: str, callsign: str = ""):
    now = _time.monotonic()
    cache_key = f"{icao24}:{callsign}"
    cached = _detail_cache.get(cache_key)
    if cached and (now - cached[0]) < DETAIL_CACHE_TTL:
        return cached[1]

    async with httpx.AsyncClient(timeout=10.0) as client:
        aircraft_resp = await client.get(f"{HEXDB_BASE}/aircraft/{icao24}")
        photo_resp = await client.get(
            f"https://hexdb.io/hex-image-thumb?hex={icao24}"
        )
        route_resp = (
            await client.get(f"{HEXDB_BASE}/route/icao/{callsign}")
            if callsign
            else None
        )

    photo_url = None
    if photo_resp.status_code == 200 and photo_resp.text.startswith("http"):
        photo_url = photo_resp.text.strip()

    aircraft = None
    if aircraft_resp.status_code == 200:
        a = aircraft_resp.json()
        aircraft = {
            "registration": a.get("Registration"),
            "type": a.get("Type"),
            "icaoType": a.get("ICAOTypeCode"),
            "manufacturer": a.get("Manufacturer"),
            "operator": a.get("RegisteredOwners"),
        }

    route = None
    if route_resp and route_resp.status_code == 200:
        r = route_resp.json()
        origin_icao = (r.get("route") or "").split("-")[0].strip() if r.get("route") else None
        dest_icao = (r.get("route") or "").split("-")[-1].strip() if r.get("route") else None

        airports = {}
        async with httpx.AsyncClient(timeout=10.0) as client:
            for key, code in [("origin", origin_icao), ("destination", dest_icao)]:
                if not code:
                    continue
                resp = await client.get(f"{HEXDB_BASE}/airport/icao/{code}")
                if resp.status_code == 200:
                    ap = resp.json()
                    airports[key] = {
                        "icao": ap.get("icao"),
                        "name": ap.get("airport"),
                        "latitude": ap.get("latitude"),
                        "longitude": ap.get("longitude"),
                    }

        route = {
            "origin": airports.get("origin"),
            "destination": airports.get("destination"),
        }

    result = {"aircraft": aircraft, "route": route, "photoUrl": photo_url}
    _detail_cache[cache_key] = (now, result)
    return result
