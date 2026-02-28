"""Example router test — pattern for testing standard routers."""

import httpx

from app.routers.earthquakes import _transform


class TestEarthquakeTransform:
    def _make_response(self, features):
        import json

        data = {"type": "FeatureCollection", "features": features}
        return httpx.Response(
            status_code=200,
            request=httpx.Request("GET", "https://test.example.com"),
            content=json.dumps(data).encode(),
        )

    def test_extracts_quake_data(self):
        features = [
            {
                "id": "us1234",
                "properties": {
                    "mag": 5.2,
                    "place": "10km NE of Tokyo",
                    "time": 1700000000000,
                    "tsunami": 0,
                    "alert": None,
                    "sig": 400,
                    "magType": "mww",
                    "status": "reviewed",
                    "felt": 100,
                    "url": "https://earthquake.usgs.gov/earthquakes/eventpage/us1234",
                },
                "geometry": {"coordinates": [139.7, 35.7, 10.5]},
            }
        ]
        result = _transform(self._make_response(features))
        assert len(result) == 1
        q = result[0]
        assert q["id"] == "us1234"
        assert q["magnitude"] == 5.2
        assert q["latitude"] == 35.7
        assert q["longitude"] == 139.7
        assert q["depth"] == 10.5
        assert q["tsunami"] is False

    def test_skips_entries_without_magnitude(self):
        features = [
            {
                "id": "us5678",
                "properties": {"mag": None, "place": "Unknown"},
                "geometry": {"coordinates": [0, 0, 0]},
            }
        ]
        result = _transform(self._make_response(features))
        assert len(result) == 0

    def test_skips_entries_with_insufficient_coords(self):
        features = [
            {
                "id": "us9999",
                "properties": {"mag": 3.0, "place": "Test"},
                "geometry": {"coordinates": [0, 0]},
            }
        ]
        result = _transform(self._make_response(features))
        assert len(result) == 0

    def test_handles_empty_features(self):
        result = _transform(self._make_response([]))
        assert result == []

    def test_handles_missing_features_key(self):
        import json

        resp = httpx.Response(
            status_code=200,
            request=httpx.Request("GET", "https://test.example.com"),
            content=json.dumps({"type": "FeatureCollection"}).encode(),
        )
        result = _transform(resp)
        assert result == []
