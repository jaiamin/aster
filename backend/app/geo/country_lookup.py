"""Lightweight point-in-country lookup using Natural Earth boundaries."""

import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

_countries: list[dict] | None = None


def _load_countries() -> list[dict]:
    global _countries
    if _countries is not None:
        return _countries

    path = Path(__file__).parent / "countries.geojson"
    if not path.exists():
        logger.warning("countries.geojson not found at %s", path)
        _countries = []
        return _countries

    with open(path) as f:
        data = json.load(f)

    _countries = []
    for feature in data.get("features", []):
        name = (
            feature.get("properties", {}).get("name")
            or feature.get("properties", {}).get("ADMIN")
            or feature.get("properties", {}).get("NAME")
        )
        if not name:
            continue

        geom = feature.get("geometry")
        if not geom:
            continue

        # Pre-compute bounding box for fast rejection
        coords = _flatten_coords(geom)
        if not coords:
            continue

        lngs = [c[0] for c in coords]
        lats = [c[1] for c in coords]
        bbox = (min(lngs), min(lats), max(lngs), max(lats))

        _countries.append({
            "name": name,
            "geometry": geom,
            "bbox": bbox,
        })

    logger.info("Loaded %d countries for reverse geocoding", len(_countries))
    return _countries


def _flatten_coords(geom: dict) -> list[tuple[float, float]]:
    """Extract all coordinate pairs from a GeoJSON geometry."""
    gtype = geom.get("type", "")
    coords = geom.get("coordinates", [])

    if gtype == "Polygon":
        return [(c[0], c[1]) for ring in coords for c in ring]
    elif gtype == "MultiPolygon":
        return [(c[0], c[1]) for poly in coords for ring in poly for c in ring]
    return []


def _point_in_polygon(lng: float, lat: float, rings: list[list]) -> bool:
    """Ray-casting algorithm for point-in-polygon."""
    for ring in rings:
        n = len(ring)
        inside = False
        j = n - 1
        for i in range(n):
            xi, yi = ring[i][0], ring[i][1]
            xj, yj = ring[j][0], ring[j][1]
            if ((yi > lat) != (yj > lat)) and (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi):
                inside = not inside
            j = i
        if inside:
            return True
    return False


def _point_in_geometry(lng: float, lat: float, geom: dict) -> bool:
    """Test if a point is inside a GeoJSON Polygon or MultiPolygon."""
    gtype = geom.get("type", "")
    coords = geom.get("coordinates", [])

    if gtype == "Polygon":
        return _point_in_polygon(lng, lat, coords)
    elif gtype == "MultiPolygon":
        for polygon in coords:
            if _point_in_polygon(lng, lat, polygon):
                return True
    return False


def country_from_coords(lat: float, lng: float) -> str | None:
    """Return country name for the given coordinates, or None if in ocean."""
    countries = _load_countries()

    for country in countries:
        bbox = country["bbox"]
        # Fast bbox rejection
        if lng < bbox[0] or lng > bbox[2] or lat < bbox[1] or lat > bbox[3]:
            continue
        if _point_in_geometry(lng, lat, country["geometry"]):
            return country["name"]

    return None
