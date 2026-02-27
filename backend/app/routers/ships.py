import asyncio
import json
import logging
import time as _time

import websockets
from fastapi import APIRouter

from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

_ships: dict[int, dict] = {}
_ws_task: asyncio.Task | None = None

PRUNE_INTERVAL = 50  # prune every N messages
STALE_SECONDS = 600  # 10 minutes


async def _connect_aisstream():
    backoff = 5
    counter = 0

    while True:
        if not settings.aisstream_api_key:
            logger.warning("AISSTREAM_API_KEY not set — ships WebSocket disabled")
            return

        try:
            async with websockets.connect(
                "wss://stream.aisstream.io/v0/stream",
                ping_interval=20,
                ping_timeout=20,
            ) as ws:
                subscribe = {
                    "APIKey": settings.aisstream_api_key,
                    "BoundingBoxes": [[[-90, -180], [90, 180]]],
                }
                await ws.send(json.dumps(subscribe))
                logger.info("aisstream.io WebSocket connected")
                backoff = 5

                async for raw in ws:
                    msg = json.loads(raw)
                    msg_type = msg.get("MessageType")
                    meta = msg.get("MetaData", {})
                    mmsi = meta.get("MMSI")
                    if not mmsi:
                        continue

                    if msg_type == "PositionReport":
                        report = msg.get("Message", {}).get("PositionReport", {})
                        if not report:
                            continue

                        lat = report.get("Latitude")
                        lng = report.get("Longitude")
                        if lat is None or lng is None:
                            continue

                        sog = report.get("Sog")
                        cog = report.get("Cog")
                        heading = report.get("TrueHeading")
                        nav_status = report.get("NavigationalStatus")

                        existing = _ships.get(mmsi, {})
                        _ships[mmsi] = {
                            **existing,
                            "mmsi": mmsi,
                            "name": (meta.get("ShipName") or "").strip() or existing.get("name", ""),
                            "latitude": lat,
                            "longitude": lng,
                            "speed": sog if sog is not None and sog < 102.3 else None,
                            "course": cog if cog is not None and cog < 360 else None,
                            "heading": heading if heading is not None and heading < 511 else None,
                            "shipType": meta.get("ShipType") or existing.get("shipType"),
                            "navStatus": nav_status if nav_status is not None and nav_status != 15 else existing.get("navStatus"),
                            "timestamp": _time.monotonic(),
                        }

                    elif msg_type == "ShipStaticData":
                        static = msg.get("Message", {}).get("ShipStaticData", {})
                        if not static:
                            continue

                        dim = static.get("Dimension", {})
                        dim_a = dim.get("A", 0) or 0
                        dim_b = dim.get("B", 0) or 0
                        dim_c = dim.get("C", 0) or 0
                        dim_d = dim.get("D", 0) or 0
                        length = dim_a + dim_b if (dim_a + dim_b) > 0 else None
                        beam = dim_c + dim_d if (dim_c + dim_d) > 0 else None

                        imo = static.get("ImoNumber")
                        draught = static.get("MaximumStaticDraught")

                        # ETA comes as {Month, Day, Hour, Minute}
                        eta_raw = static.get("Eta", {})
                        eta = None
                        if eta_raw and eta_raw.get("Month") and eta_raw.get("Day"):
                            eta = f"{eta_raw['Month']:02d}-{eta_raw['Day']:02d} {eta_raw.get('Hour', 0):02d}:{eta_raw.get('Minute', 0):02d}"

                        existing = _ships.get(mmsi, {})
                        static_name = (static.get("Name") or "").strip()
                        dest = (static.get("Destination") or "").strip()

                        _ships[mmsi] = {
                            **existing,
                            "mmsi": mmsi,
                            "name": static_name or existing.get("name", (meta.get("ShipName") or "").strip()),
                            "shipType": meta.get("ShipType") or existing.get("shipType"),
                            "imo": imo if imo and imo > 0 else existing.get("imo"),
                            "callSign": (static.get("CallSign") or "").strip() or existing.get("callSign"),
                            "destination": dest or existing.get("destination"),
                            "eta": eta or existing.get("eta"),
                            "draught": draught if draught and draught > 0 else existing.get("draught"),
                            "length": length or existing.get("length"),
                            "beam": beam or existing.get("beam"),
                            "timestamp": existing.get("timestamp", _time.monotonic()),
                        }

                    else:
                        continue

                    counter += 1
                    if counter % PRUNE_INTERVAL == 0:
                        now = _time.monotonic()
                        stale = [
                            k
                            for k, v in _ships.items()
                            if now - v["timestamp"] > STALE_SECONDS
                        ]
                        for k in stale:
                            del _ships[k]

        except asyncio.CancelledError:
            return
        except Exception:
            logger.exception("aisstream.io WebSocket error — reconnecting in %ds", backoff)
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, 60)


def start_ws():
    global _ws_task
    if _ws_task is None or _ws_task.done():
        _ws_task = asyncio.create_task(_connect_aisstream())


def stop_ws():
    global _ws_task
    if _ws_task and not _ws_task.done():
        _ws_task.cancel()
    _ws_task = None


@router.get("/ships")
async def get_ships():
    return [
        {k: v for k, v in ship.items() if k != "timestamp"}
        for ship in _ships.values()
    ]
