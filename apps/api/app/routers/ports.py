from fastapi import APIRouter

from app.services.ports import get_ports, lookup_port

router = APIRouter()


@router.get("/ports")
async def ports():
    return await get_ports()


@router.get("/ports/lookup")
async def port_lookup(q: str = ""):
    return await lookup_port(q)
