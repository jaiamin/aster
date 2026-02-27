import logging
import time as _time

import httpx
from fastapi import APIRouter, HTTPException

from app.http_client import get_client

router = APIRouter()
logger = logging.getLogger(__name__)

DATA_URL = "https://raw.githubusercontent.com/tayljordan/ports/main/ports.json"

_cache: list | None = None
_cache_time: float = 0
CACHE_TTL = 86400.0  # 24 hours — static dataset

_lookup_cache: dict[str, dict | None] = {}
LOOKUP_CACHE_MAX = 5000
LOOKUP_CACHE_EVICT = 1000


async def _ensure_port_cache():
    """Make sure the port list is loaded (reuses get_ports cache)."""
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
        raise HTTPException(status_code=e.response.status_code, detail="Port data source error")
    except httpx.RequestError:
        if _cache is not None:
            return _cache
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

    _cache = results
    _cache_time = now
    return results


@router.get("/ports")
async def get_ports():
    return await _ensure_port_cache()


def _search_ports(ports: list[dict], query: str) -> dict | None:
    """Case-insensitive substring match against port names, preferring exact."""
    q = query.lower().strip()
    if not q:
        return None

    # Exact match first
    for p in ports:
        if p["name"].lower() == q:
            return p

    # Starts-with match
    for p in ports:
        if p["name"].lower().startswith(q):
            return p

    # Substring match
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
    """Resolve an AIS destination string to a port location.

    Handles dash-separated destinations (e.g. "GLRT-HEST") by trying the
    full string first, then each segment individually (last segment first,
    as that's typically the final destination).
    """
    q = q.strip().upper()
    if not q:
        return None

    if q in _lookup_cache:
        return _lookup_cache[q]

    if len(_lookup_cache) >= LOOKUP_CACHE_MAX:
        for key in list(_lookup_cache)[:LOOKUP_CACHE_EVICT]:
            del _lookup_cache[key]

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
            _lookup_cache[q] = result
            return result

    # Fallback to Nominatim for each candidate
    for candidate in candidates:
        result = await _nominatim_lookup(candidate)
        if result:
            _lookup_cache[q] = result
            return result

    _lookup_cache[q] = None
    return None
