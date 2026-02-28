import httpx
import pytest
from fastapi import HTTPException

from app.services.base import fetch_and_cache, refresh


class TestFetchAndCache:
    @pytest.mark.asyncio
    async def test_returns_cached_data(self, mock_cache, mock_http_client):
        mock_cache["store"]["test_key"] = {"cached": True}

        result = await fetch_and_cache("test_key", "https://api.example.com/data", 60, lambda r: r.json())
        assert result == {"cached": True}
        mock_http_client["client"].get.assert_not_called()

    @pytest.mark.asyncio
    async def test_fetches_and_caches_on_miss(self, mock_cache, mock_http_client):
        response_data = {"fresh": True}
        mock_http_client["client"].get.return_value = mock_http_client["make_response"](response_data)

        result = await fetch_and_cache("test_key", "https://api.example.com/data", 60, lambda r: r.json())
        assert result == {"fresh": True}
        assert mock_cache["store"]["test_key"] == {"fresh": True}

    @pytest.mark.asyncio
    async def test_applies_transform(self, mock_cache, mock_http_client):
        raw = {"items": [1, 2, 3]}
        mock_http_client["client"].get.return_value = mock_http_client["make_response"](raw)

        result = await fetch_and_cache(
            "test_key",
            "https://api.example.com/data",
            60,
            lambda r: len(r.json()["items"]),
        )
        assert result == 3

    @pytest.mark.asyncio
    async def test_raises_on_http_error(self, mock_cache, mock_http_client):
        mock_http_client["client"].get.return_value = mock_http_client["make_response"]({}, status_code=500)

        with pytest.raises(HTTPException) as exc_info:
            await fetch_and_cache("test_key", "https://api.example.com", 60, lambda r: r.json(), error_source="TestAPI")
        assert exc_info.value.status_code == 500
        assert "TestAPI" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_raises_502_on_connection_error(self, mock_cache, mock_http_client):
        mock_http_client["client"].get.side_effect = httpx.ConnectError("connection refused")

        with pytest.raises(HTTPException) as exc_info:
            await fetch_and_cache("test_key", "https://api.example.com", 60, lambda r: r.json(), error_source="TestAPI")
        assert exc_info.value.status_code == 502

    @pytest.mark.asyncio
    async def test_passes_params_and_headers(self, mock_cache, mock_http_client):
        mock_http_client["client"].get.return_value = mock_http_client["make_response"]({"ok": True})

        await fetch_and_cache(
            "test_key",
            "https://api.example.com",
            60,
            lambda r: r.json(),
            params={"limit": 100},
            headers={"X-API-Key": "test"},
        )

        mock_http_client["client"].get.assert_called_once()
        call_kwargs = mock_http_client["client"].get.call_args
        assert call_kwargs.kwargs["params"] == {"limit": 100}
        assert call_kwargs.kwargs["headers"] == {"X-API-Key": "test"}


class TestRefresh:
    @pytest.mark.asyncio
    async def test_always_fetches_even_with_cache(self, mock_cache, mock_http_client):
        mock_cache["store"]["test_key"] = {"stale": True}
        mock_http_client["client"].get.return_value = mock_http_client["make_response"]({"fresh": True})

        result = await refresh("test_key", "https://api.example.com", 60, lambda r: r.json())
        assert result == {"fresh": True}
        assert mock_cache["store"]["test_key"] == {"fresh": True}

    @pytest.mark.asyncio
    async def test_returns_none_on_failure(self, mock_cache, mock_http_client):
        mock_cache["store"]["test_key"] = {"stale": True}
        mock_http_client["client"].get.side_effect = httpx.ConnectError("connection refused")

        result = await refresh("test_key", "https://api.example.com", 60, lambda r: r.json())
        assert result is None
        # Stale cache preserved
        assert mock_cache["store"]["test_key"] == {"stale": True}
