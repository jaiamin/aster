import json as _json
import logging
from contextlib import asynccontextmanager
from datetime import UTC, datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware

from app import cache, scheduler
from app.config import settings
from app.http_client import close_client, init_client
from app.routers import (
    air_quality,
    airports,
    buoys,
    cables,
    earthquakes,
    flights,
    health,
    launches,
    map_config,
    ports,
    power_plants,
    satellites,
    ships,
    storms,
    volcanoes,
    wildfires,
)


class _JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        return _json.dumps(
            {
                "ts": datetime.fromtimestamp(record.created, tz=UTC).isoformat(),
                "level": record.levelname,
                "logger": record.name,
                "msg": record.getMessage(),
            }
        )


def _setup_logging() -> None:
    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    handler = logging.StreamHandler()
    if settings.debug:
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)-8s %(name)s: %(message)s"))
    else:
        handler.setFormatter(_JSONFormatter())
    root = logging.getLogger()
    root.setLevel(level)
    root.addHandler(handler)


_setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_client()
    await cache.connect(settings.redis_url)
    ships.start_ws()
    scheduler.start()
    yield
    await scheduler.stop()
    ships.stop_ws()
    await close_client()
    await cache.disconnect()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(health.router, prefix="/api")
app.include_router(map_config.router, prefix="/api")
app.include_router(flights.router, prefix="/api")
app.include_router(satellites.router, prefix="/api")
app.include_router(ships.router, prefix="/api")
app.include_router(earthquakes.router, prefix="/api")
app.include_router(wildfires.router, prefix="/api")
app.include_router(volcanoes.router, prefix="/api")
app.include_router(air_quality.router, prefix="/api")
app.include_router(cables.router, prefix="/api")
app.include_router(airports.router, prefix="/api")
app.include_router(ports.router, prefix="/api")
app.include_router(buoys.router, prefix="/api")
app.include_router(launches.router, prefix="/api")
app.include_router(storms.router, prefix="/api")
app.include_router(power_plants.router, prefix="/api")
