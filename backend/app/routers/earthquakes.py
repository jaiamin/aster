import httpx
from fastapi import APIRouter, HTTPException

from app import cache
from app.geo.country_lookup import country_from_coords
from app.http_client import get_client

router = APIRouter()

USGS_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
CACHE_KEY = "earthquakes"
CACHE_TTL = 60


@router.get("/earthquakes")
async def get_earthquakes():
    cached = await cache.get(CACHE_KEY)
    if cached is not None:
        return cached

    client = get_client()
    try:
        resp = await client.get(USGS_URL, timeout=15.0)
        resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="USGS API error")
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Failed to reach USGS API")

    data = resp.json()
    quakes = []
    for f in data.get("features") or []:
        props = f.get("properties", {})
        coords = f.get("geometry", {}).get("coordinates", [])
        if len(coords) < 3:
            continue
        mag = props.get("mag")
        if mag is None:
            continue
        lat = coords[1]
        lng = coords[0]
        quakes.append(
            {
                "id": f.get("id"),
                "magnitude": mag,
                "place": props.get("place"),
                "time": props.get("time"),
                "longitude": lng,
                "latitude": lat,
                "depth": coords[2],
                "tsunami": bool(props.get("tsunami")),
                "alert": props.get("alert"),
                "significance": props.get("sig"),
                "magType": props.get("magType"),
                "status": props.get("status"),
                "felt": props.get("felt"),
                "url": props.get("url"),
                "country": country_from_coords(lat, lng),
            }
        )

    await cache.set(CACHE_KEY, quakes, CACHE_TTL)
    return quakes
