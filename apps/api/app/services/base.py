import logging
from collections.abc import Callable
from typing import Any

import httpx
from fastapi import HTTPException

from app import cache
from app.http_client import get_client

logger = logging.getLogger(__name__)


async def fetch_and_cache(
    cache_key: str,
    url: str,
    ttl: int,
    transform: Callable[[httpx.Response], Any],
    *,
    error_source: str = "external API",
    request_timeout: float = 30.0,
    params: dict | None = None,
    headers: dict | None = None,
) -> Any:
    """Fetch from external API with cache-first strategy.

    1. Check cache → return if hit
    2. Fetch from URL → transform response → cache → return
    3. On HTTP error → pass through status code
    4. On connection error → 502
    """
    cached = await cache.get(cache_key)
    if cached is not None:
        return cached

    client = get_client()
    try:
        resp = await client.get(url, timeout=request_timeout, params=params, headers=headers)
        resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"{error_source} error")
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail=f"Failed to reach {error_source}")

    result = transform(resp)
    await cache.set(cache_key, result, ttl)
    return result


async def refresh(
    cache_key: str,
    url: str,
    ttl: int,
    transform: Callable[[httpx.Response], Any],
    *,
    request_timeout: float = 30.0,
    params: dict | None = None,
    headers: dict | None = None,
) -> Any:
    """Force-fetch from external API, skipping cache. Used by background scheduler.

    On failure, logs the error and returns None (stale cache preserved).
    """
    client = get_client()
    try:
        resp = await client.get(url, timeout=request_timeout, params=params, headers=headers)
        resp.raise_for_status()
    except Exception:
        logger.warning("Background refresh failed for %s", cache_key)
        return None

    result = transform(resp)
    await cache.set(cache_key, result, ttl)
    return result
