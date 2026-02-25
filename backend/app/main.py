from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import air_quality, earthquakes, flights, health, map_config, satellites, ships, volcanoes, wildfires


@asynccontextmanager
async def lifespan(app: FastAPI):
    ships.start_ws()
    yield
    ships.stop_ws()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
