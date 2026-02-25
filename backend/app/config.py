from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Saka"
    debug: bool = False
    cors_origins: list[str] = ["http://localhost:5173"]
    map_style_url: str = "https://tiles.openfreemap.org/styles/dark"
    map_initial_lat: float = 20.0
    map_initial_lng: float = 0.0
    map_initial_zoom: float = 2.5


settings = Settings()
