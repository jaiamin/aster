import json
import logging
import time as _time

import redis.asyncio as redis

logger = logging.getLogger(__name__)

_redis: redis.Redis | None = None
_fallback: dict[str, tuple[float, str]] = {}

PREFIX = "aster:"


async def connect(url: str) -> None:
    global _redis
    try:
        _redis = redis.from_url(url, decode_responses=True)
        await _redis.ping()
        logger.info("Redis connected: %s", url)
    except Exception:
        logger.warning("Redis unavailable — using in-memory fallback")
        _redis = None


async def disconnect() -> None:
    global _redis
    if _redis:
        await _redis.aclose()
        _redis = None


MISSING = object()


async def get(key: str, default=None):
    full_key = PREFIX + key
    if _redis:
        try:
            raw = await _redis.get(full_key)
            if raw is not None:
                return json.loads(raw)
            return default
        except Exception:
            logger.warning("Redis get failed for %s — checking fallback", key)

    entry = _fallback.get(full_key)
    if entry is not None:
        exp, raw = entry
        if exp > _time.monotonic():
            return json.loads(raw)
        del _fallback[full_key]
    return default


async def set(key: str, value, ttl: int) -> None:
    full_key = PREFIX + key
    raw = json.dumps(value)
    if _redis:
        try:
            await _redis.set(full_key, raw, ex=ttl)
            return
        except Exception:
            logger.warning("Redis set failed for %s — using fallback", key)

    _fallback[full_key] = (_time.monotonic() + ttl, raw)
    _prune_fallback()


async def get_with_ttl(key: str) -> tuple | None:
    """Return (value, remaining_ttl) or None if not cached."""
    full_key = PREFIX + key
    if _redis:
        try:
            pipe = _redis.pipeline()
            pipe.get(full_key)
            pipe.ttl(full_key)
            raw, ttl = await pipe.execute()
            if raw is not None:
                return json.loads(raw), max(ttl, 0)
            return None
        except Exception:
            logger.warning("Redis get_with_ttl failed for %s — checking fallback", key)

    entry = _fallback.get(full_key)
    if entry:
        remaining = entry[0] - _time.monotonic()
        if remaining > 0:
            return json.loads(entry[1]), int(remaining)
        del _fallback[full_key]
    return None


MAX_FALLBACK_ENTRIES = 500


def _prune_fallback() -> None:
    now = _time.monotonic()
    stale = [k for k, (exp, _) in _fallback.items() if exp <= now]
    for k in stale:
        del _fallback[k]
    if len(_fallback) > MAX_FALLBACK_ENTRIES:
        by_age = sorted(_fallback.items(), key=lambda kv: kv[1][0])
        for k, _ in by_age[: len(_fallback) - MAX_FALLBACK_ENTRIES]:
            del _fallback[k]
