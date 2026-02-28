import logging

import httpx
from fastapi import APIRouter, HTTPException

from app import cache
from app.http_client import get_client

router = APIRouter()
logger = logging.getLogger(__name__)

DATA_URL = "https://raw.githubusercontent.com/tayljordan/ports/main/ports.json"
CACHE_KEY = "ports"
CACHE_TTL = 86400
LOOKUP_CACHE_TTL = 86400


async def _ensure_port_cache():
    """Make sure the port list is loaded (reuses get_ports cache)."""
    cached = await cache.get(CACHE_KEY)
    if cached is not None:
        return cached

    client = get_client()
    try:
        resp = await client.get(DATA_URL)
        resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="Port data source error")
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Failed to fetch port data")

    raw: list[dict] = resp.json()
    results = []
    seen_coords: set[tuple[float, float]] = set()
    for i, entry in enumerate(raw):
        try:
            lat = float(entry["LATITUDE"])
            lng = float(entry["LONGITUDE"])
        except (ValueError, KeyError, TypeError):
            continue

        coord = (round(lat, 4), round(lng, 4))
        if coord in seen_coords:
            continue
        seen_coords.add(coord)

        city = entry.get("CITY") or "Unknown"
        state = entry.get("STATE") or None
        country = entry.get("COUNTRY") or None

        results.append(
            {
                "id": i,
                "name": city,
                "state": state,
                "country": country,
                "latitude": lat,
                "longitude": lng,
            }
        )

    await cache.set(CACHE_KEY, results, CACHE_TTL)
    return results


@router.get("/ports")
async def get_ports():
    return await _ensure_port_cache()


def _search_ports(ports: list[dict], query: str) -> dict | None:
    """Case-insensitive substring match against port names, preferring exact."""
    q = query.lower().strip()
    if not q:
        return None

    for p in ports:
        if p["name"].lower() == q:
            return p

    for p in ports:
        if p["name"].lower().startswith(q):
            return p

    for p in ports:
        if q in p["name"].lower():
            return p

    return None


async def _nominatim_lookup(query: str) -> dict | None:
    """Forward geocode via Nominatim as fallback."""
    try:
        client = get_client()
        resp = await client.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "q": f"{query} port",
                "format": "json",
                "limit": "1",
                "addressdetails": "1",
            },
            headers={"User-Agent": "aster-app", "Accept-Language": "en"},
            timeout=10.0,
        )
        resp.raise_for_status()
        results = resp.json()
        if results:
            hit = results[0]
            return {
                "name": hit.get("display_name", query).split(",")[0],
                "latitude": float(hit["lat"]),
                "longitude": float(hit["lon"]),
            }
    except Exception:
        logger.debug("Nominatim lookup failed for %r", query)
    return None


@router.get("/ports/lookup")
async def lookup_port(q: str = ""):
    """Resolve an AIS destination string to a port location."""
    q = q.strip().upper()
    if not q:
        return None

    lookup_key = f"port_lookup:{q}"
    cached = await cache.get(lookup_key, default=cache.MISSING)
    if cached is not cache.MISSING:
        return cached

    ports = await _ensure_port_cache()

    # Build candidate list: full string, then segments (last first)
    segments = [s.strip() for s in q.split("-") if s.strip()]
    candidates = [q]
    if len(segments) > 1:
        candidates.extend(reversed(segments))
    else:
        candidates.extend(segments)

    # Try port database first for each candidate
    for candidate in candidates:
        match = _search_ports(ports, candidate)
        if match:
            result = {
                "name": match["name"],
                "latitude": match["latitude"],
                "longitude": match["longitude"],
            }
            await cache.set(lookup_key, result, LOOKUP_CACHE_TTL)
            return result

    # Fallback to Nominatim for each candidate
    for candidate in candidates:
        result = await _nominatim_lookup(candidate)
        if result:
            await cache.set(lookup_key, result, LOOKUP_CACHE_TTL)
            return result

    # Cache the miss too
    await cache.set(lookup_key, None, LOOKUP_CACHE_TTL)
    return None
