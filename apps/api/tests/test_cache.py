import time as _time

import pytest

from app import cache


class TestInMemoryFallback:
    """Test cache with Redis unavailable (in-memory fallback)."""

    @pytest.fixture(autouse=True)
    def _reset_cache(self):
        cache._redis = None
        cache._fallback.clear()
        yield
        cache._fallback.clear()

    @pytest.mark.asyncio
    async def test_set_and_get(self):
        await cache.set("test_key", {"data": 123}, 60)
        result = await cache.get("test_key")
        assert result == {"data": 123}

    @pytest.mark.asyncio
    async def test_get_missing_key_returns_default(self):
        result = await cache.get("nonexistent")
        assert result is None

    @pytest.mark.asyncio
    async def test_get_missing_key_returns_custom_default(self):
        result = await cache.get("nonexistent", default="fallback")
        assert result == "fallback"

    @pytest.mark.asyncio
    async def test_ttl_expiry(self):
        await cache.set("expiring", "value", 1)

        result = await cache.get("expiring")
        assert result == "value"

        # Simulate time passing beyond TTL
        key = cache.PREFIX + "expiring"
        exp, raw = cache._fallback[key]
        cache._fallback[key] = (_time.monotonic() - 1, raw)

        result = await cache.get("expiring")
        assert result is None

    @pytest.mark.asyncio
    async def test_get_with_ttl(self):
        await cache.set("ttl_test", [1, 2, 3], 300)

        result = await cache.get_with_ttl("ttl_test")
        assert result is not None
        value, remaining = result
        assert value == [1, 2, 3]
        assert remaining > 0
        assert remaining <= 300

    @pytest.mark.asyncio
    async def test_get_with_ttl_missing(self):
        result = await cache.get_with_ttl("nonexistent")
        assert result is None

    @pytest.mark.asyncio
    async def test_overwrite_existing_key(self):
        await cache.set("key", "first", 60)
        await cache.set("key", "second", 60)
        result = await cache.get("key")
        assert result == "second"
