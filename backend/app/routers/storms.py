import asyncio

import httpx
from fastapi import APIRouter, HTTPException

from app import cache
from app.http_client import get_client

router = APIRouter()

NHC_BASE = "https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather_summary/MapServer"
LAYER_FORECAST_POINTS = 5
LAYER_FORECAST_TRACK = 6
LAYER_PAST_TRACK = 11
QUERY_PARAMS = {"where": "1=1", "outFields": "*", "f": "json", "returnGeometry": "true"}

CACHE_KEY = "storms"
CACHE_TTL = 300


async def _fetch_layer(client: httpx.AsyncClient, layer: int) -> list:
    resp = await client.get(f"{NHC_BASE}/{layer}/query", params=QUERY_PARAMS, timeout=20.0)
    resp.raise_for_status()
    data = resp.json()
    return data.get("features") or []


def _category_from_wind(wind: float | None) -> int:
    if wind is None:
        return 0
    if wind >= 137:
        return 5
    if wind >= 113:
        return 4
    if wind >= 96:
        return 3
    if wind >= 83:
        return 2
    if wind >= 64:
        return 1
    return 0


@router.get("/storms")
async def get_storms():
    cached = await cache.get(CACHE_KEY)
    if cached is not None:
        return cached

    client = get_client()
    try:
        forecast_pts, past_tracks, forecast_tracks = await asyncio.gather(
            _fetch_layer(client, LAYER_FORECAST_POINTS),
            _fetch_layer(client, LAYER_PAST_TRACK),
            _fetch_layer(client, LAYER_FORECAST_TRACK),
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="NHC API error")
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Failed to reach NHC API")

    # Group forecast points by storm name
    storms_map: dict[str, dict] = {}
    for f in forecast_pts:
        attrs = f.get("attributes") or {}
        name = attrs.get("stormname") or attrs.get("STORMNAME")
        if not name:
            continue
        name = name.strip()
        tau = attrs.get("tau", attrs.get("TAU", 0)) or 0
        wind = attrs.get("maxwind", attrs.get("MAXWIND"))
        gust = attrs.get("gust", attrs.get("GUST"))
        pressure = attrs.get("mslp", attrs.get("MSLP"))
        lat = attrs.get("lat", attrs.get("LAT"))
        lon = attrs.get("lon", attrs.get("LON"))
        storm_type = attrs.get("stormtype", attrs.get("STORMTYPE", ""))
        basin = attrs.get("basin", attrs.get("BASIN", ""))
        storm_num = attrs.get("stormnum", attrs.get("STORMNUM", ""))
        date_label = attrs.get("fldatelbl", attrs.get("FLDATELBL", ""))
        movement_dir = attrs.get("movementdir", attrs.get("MOVEMENTDIR"))
        movement_speed = attrs.get("movementspd", attrs.get("MOVEMENTSPD"))

        if lat is None or lon is None:
            geom = f.get("geometry") or {}
            lon = geom.get("x")
            lat = geom.get("y")
        if lat is None or lon is None:
            continue

        cat = _category_from_wind(wind)

        if name not in storms_map:
            storms_map[name] = {
                "id": f"{basin}{storm_num}".strip() or name,
                "name": name,
                "basin": basin,
                "stormType": storm_type,
                "category": cat,
                "windSpeed": wind,
                "gust": gust,
                "pressure": pressure,
                "movementDir": movement_dir,
                "movementSpeed": movement_speed,
                "latitude": lat,
                "longitude": lon,
                "lastUpdated": date_label,
                "forecastTrack": [],
                "pastTrack": [],
            }

        if tau == 0:
            storms_map[name]["latitude"] = lat
            storms_map[name]["longitude"] = lon
            storms_map[name]["windSpeed"] = wind
            storms_map[name]["gust"] = gust
            storms_map[name]["pressure"] = pressure
            storms_map[name]["category"] = cat
            storms_map[name]["stormType"] = storm_type
            storms_map[name]["movementDir"] = movement_dir
            storms_map[name]["movementSpeed"] = movement_speed
            storms_map[name]["lastUpdated"] = date_label
        else:
            storms_map[name]["forecastTrack"].append({
                "lat": lat,
                "lng": lon,
                "tau": tau,
                "maxWind": wind,
                "category": cat,
            })

    # Attach past track lines
    for f in past_tracks:
        attrs = f.get("attributes") or {}
        name = attrs.get("stormname") or attrs.get("STORMNAME") or ""
        name = name.strip()
        if name not in storms_map:
            continue
        geom = f.get("geometry") or {}
        paths = geom.get("paths") or []
        for path in paths:
            storms_map[name]["pastTrack"].extend(path)

    # Sort forecast tracks by tau
    for storm in storms_map.values():
        storm["forecastTrack"].sort(key=lambda p: p["tau"])

    result = list(storms_map.values())
    await cache.set(CACHE_KEY, result, CACHE_TTL)
    return result
