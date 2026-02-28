from fastapi import APIRouter

from app.services.storms import get_storms

router = APIRouter()


@router.get("/storms")
async def storms():
    return await get_storms()
