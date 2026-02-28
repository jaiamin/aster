import logging

from pydantic import model_validator
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)

_OPTIONAL_KEYS = {
    "aisstream_api_key": "AIS ship tracking",
    "openaq_api_key": "Air quality data",
    "opensky_client_id": "OpenSky flight tracking (authenticated)",
    "opensky_client_secret": "OpenSky flight tracking (authenticated)",
}


class Settings(BaseSettings):
    model_config = {"env_file": ".env"}

    app_name: str = "Aster"
    debug: bool = False
    log_level: str = "INFO"
    cors_origins: list[str] = ["http://localhost:5173"]
    redis_url: str = "redis://localhost:6379/0"
    map_style_url: str = "https://tiles.openfreemap.org/styles/dark"
    map_initial_lat: float = 20.0
    map_initial_lng: float = 0.0
    map_initial_zoom: float = 2.5
    opensky_base_url: str = "https://opensky-network.org/api"
    opensky_token_url: str = (
        "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token"
    )
    opensky_client_id: str = ""
    opensky_client_secret: str = ""
    aisstream_api_key: str = ""
    openaq_api_key: str = ""

    @model_validator(mode="after")
    def _warn_missing_keys(self):
        missing = [desc for key, desc in _OPTIONAL_KEYS.items() if not getattr(self, key)]
        if missing:
            logger.warning(
                "Optional API keys not set — features disabled: %s",
                ", ".join(missing),
            )
        return self


settings = Settings()
