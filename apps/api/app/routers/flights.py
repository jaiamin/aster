from fastapi import APIRouter

from app.services.flights import get_flight_detail, get_flight_track, get_flights

router = APIRouter()


@router.get("/flights")
async def flights():
    return await get_flights()


@router.get("/flights/{icao24}/track")
async def flight_track(icao24: str):
    return await get_flight_track(icao24)


@router.get("/flights/{icao24}/detail")
async def flight_detail(icao24: str, callsign: str = ""):
    return await get_flight_detail(icao24, callsign)
