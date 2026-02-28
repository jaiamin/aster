from fastapi import APIRouter

from app import cache, scheduler

router = APIRouter()


@router.get("/health")
async def health_check():
    redis_up = await cache.ping()
    return {
        "status": "ok" if redis_up else "degraded",
        "redis": "connected" if redis_up else "fallback",
        "scheduler": scheduler.task_count(),
    }
