import pytest

from app.services.storms import _category_from_wind


class TestCategoryFromWind:
    @pytest.mark.parametrize(
        "wind,expected",
        [
            (None, 0),
            (30, 0),
            (63, 0),
            (64, 1),
            (82, 1),
            (83, 2),
            (95, 2),
            (96, 3),
            (112, 3),
            (113, 4),
            (136, 4),
            (137, 5),
            (200, 5),
        ],
    )
    def test_wind_to_category(self, wind, expected):
        assert _category_from_wind(wind) == expected
