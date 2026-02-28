import asyncio
import logging
from collections.abc import Callable, Coroutine
from typing import Any

logger = logging.getLogger(__name__)

_tasks: list[asyncio.Task] = []

# Schedule: (name, refresh_fn, interval_seconds, stagger_offset_seconds)
_schedule: list[tuple[str, Callable[[], Coroutine[Any, Any, Any]], float, float]] = []


def _build_schedule() -> list[tuple[str, Callable[[], Coroutine[Any, Any, Any]], float, float]]:
    """Build refresh schedule. Import here to avoid circular imports at module level."""
    from app.routers.buoys import CACHE_KEY as BUOY_KEY
    from app.routers.buoys import CACHE_TTL as BUOY_TTL
    from app.routers.buoys import DATA_URL as BUOY_URL
    from app.routers.buoys import _transform as buoy_transform
    from app.routers.cables import refresh_cables
    from app.routers.earthquakes import CACHE_KEY as EQ_KEY
    from app.routers.earthquakes import CACHE_TTL as EQ_TTL
    from app.routers.earthquakes import USGS_URL
    from app.routers.earthquakes import _transform as eq_transform
    from app.routers.launches import refresh_launches
    from app.routers.volcanoes import CACHE_KEY as VOLC_KEY
    from app.routers.volcanoes import CACHE_TTL as VOLC_TTL
    from app.routers.volcanoes import EONET_URL
    from app.routers.volcanoes import _transform as volc_transform
    from app.routers.wildfires import CACHE_KEY as FIRE_KEY
    from app.routers.wildfires import CACHE_TTL as FIRE_TTL
    from app.routers.wildfires import FIRMS_URL
    from app.routers.wildfires import _transform as fire_transform
    from app.services.base import refresh
    from app.services.flights import refresh_flights
    from app.services.storms import refresh_storms

    async def refresh_earthquakes():
        return await refresh(EQ_KEY, USGS_URL, EQ_TTL, eq_transform, request_timeout=15.0)

    async def refresh_volcanoes():
        return await refresh(
            VOLC_KEY,
            EONET_URL,
            VOLC_TTL,
            volc_transform,
            params={"category": "volcanoes", "status": "open", "limit": 365},
        )

    async def refresh_wildfires():
        return await refresh(FIRE_KEY, FIRMS_URL, FIRE_TTL, fire_transform)

    async def refresh_buoys():
        return await refresh(BUOY_KEY, BUOY_URL, BUOY_TTL, buoy_transform)

    async def _safe_refresh_flights():
        try:
            return await refresh_flights()
        except Exception:
            logger.warning("Background refresh failed for flights")
            return None

    async def _safe_refresh_storms():
        try:
            return await refresh_storms()
        except Exception:
            logger.warning("Background refresh failed for storms")
            return None

    async def _safe_refresh_launches():
        try:
            return await refresh_launches()
        except Exception:
            logger.warning("Background refresh failed for launches")
            return None

    async def _safe_refresh_cables():
        try:
            return await refresh_cables()
        except Exception:
            logger.warning("Background refresh failed for cables")
            return None

    return [
        # (name, refresh_fn, interval_seconds, stagger_offset_seconds)
        ("flights", _safe_refresh_flights, 10, 0),
        ("earthquakes", refresh_earthquakes, 60, 5),
        ("storms", _safe_refresh_storms, 300, 10),
        ("wildfires", refresh_wildfires, 600, 15),
        ("volcanoes", refresh_volcanoes, 1800, 20),
        ("buoys", refresh_buoys, 600, 30),
        ("launches", _safe_refresh_launches, 600, 35),
        ("cables", _safe_refresh_cables, 86400, 40),
    ]


async def _refresh_loop(name: str, fn: Callable, interval: float, offset: float):
    """Run a single refresh loop with staggered start."""
    await asyncio.sleep(offset)
    logger.info("Scheduler: starting %s refresh (every %ds)", name, int(interval))

    while True:
        try:
            await fn()
            logger.debug("Scheduler: refreshed %s", name)
        except asyncio.CancelledError:
            return
        except Exception:
            logger.exception("Scheduler: unexpected error refreshing %s", name)
        await asyncio.sleep(interval)


def start():
    """Start all background refresh loops."""
    global _tasks
    schedule = _build_schedule()
    for name, fn, interval, offset in schedule:
        task = asyncio.create_task(_refresh_loop(name, fn, interval, offset))
        _tasks.append(task)
    logger.info("Scheduler: started %d refresh tasks", len(_tasks))


async def stop():
    """Cancel all background refresh loops and await completion."""
    global _tasks
    for task in _tasks:
        if not task.done():
            task.cancel()
    await asyncio.gather(*_tasks, return_exceptions=True)
    _tasks.clear()
    logger.info("Scheduler: stopped")
