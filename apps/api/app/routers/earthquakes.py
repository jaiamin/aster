import httpx
from fastapi import APIRouter

from app.geo.country_lookup import country_from_coords
from app.services.base import fetch_and_cache

router = APIRouter()

USGS_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
CACHE_KEY = "earthquakes"
CACHE_TTL = 60


def _transform(resp: httpx.Response) -> list:
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
    return quakes


@router.get("/earthquakes")
async def get_earthquakes():
    return await fetch_and_cache(CACHE_KEY, USGS_URL, CACHE_TTL, _transform, error_source="USGS", request_timeout=15.0)
