import json
from unittest.mock import AsyncMock, patch

import httpx
import pytest


@pytest.fixture
def mock_cache():
    """Mock cache that stores in a dict."""
    store = {}

    async def _get(key, default=None):
        return store.get(key, default)

    async def _set(key, value, ttl):
        store[key] = value

    with (
        patch("app.cache.get", side_effect=_get) as mock_get,
        patch("app.cache.set", side_effect=_set) as mock_set,
    ):
        yield {"store": store, "get": mock_get, "set": mock_set}


@pytest.fixture
def mock_http_client():
    """Mock httpx client with configurable responses."""

    def _make_response(data, status_code=200, text=None):
        resp = httpx.Response(
            status_code=status_code,
            request=httpx.Request("GET", "https://test.example.com"),
            content=text.encode() if text else json.dumps(data).encode(),
        )
        return resp

    client = AsyncMock(spec=httpx.AsyncClient)

    with patch("app.services.base.get_client", return_value=client):
        yield {"client": client, "make_response": _make_response}
