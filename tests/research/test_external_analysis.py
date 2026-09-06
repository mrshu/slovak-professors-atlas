from __future__ import annotations

import pytest

from research.external_analysis import correlate_annual_series, extract_jsonstat_series


def test_extract_jsonstat_series_preserves_missing_years() -> None:
    payload = {
        "id": ["freq", "geo", "time"],
        "size": [1, 1, 4],
        "dimension": {
            "time": {
                "category": {
                    "index": {"2000": 0, "2001": 1, "2002": 2, "2003": 3}
                }
            }
        },
        "value": [1.5, None, -2.0, 0.0],
    }

    assert extract_jsonstat_series(payload) == {
        2000: 1.5,
        2001: None,
        2002: -2.0,
        2003: 0.0,
    }


def test_correlate_annual_series_reports_levels_changes_and_lags() -> None:
    appointments = {2000: 1, 2001: 2, 2002: 4, 2003: 8}
    external = {1999: 0.5, 2000: 1, 2001: 2, 2002: 4, 2003: 8}

    result = correlate_annual_series(appointments, external, lags=[0, 1])

    assert result["level"] == {"n": 4, "pearson": pytest.approx(1.0)}
    assert result["first_difference"] == {"n": 3, "pearson": pytest.approx(1.0)}
    assert result["lags"]["0"]["pearson"] == pytest.approx(1.0)
    assert result["lags"]["1"]["n"] == 4
    assert result["lags"]["1"]["pearson"] == pytest.approx(1.0)
    assert result["first_difference_lags"]["0"]["pearson"] == pytest.approx(1.0)
    assert result["first_difference_lags"]["1"]["n"] == 3
    assert result["first_difference_lags"]["1"]["pearson"] == pytest.approx(1.0)


def test_correlate_annual_series_does_not_turn_missing_values_into_zero() -> None:
    appointments = {2000: 1, 2001: 2, 2002: 3, 2003: 4}
    external = {2000: 1, 2001: None, 2002: 3, 2003: 4}

    result = correlate_annual_series(appointments, external, lags=[0])

    assert result["level"]["n"] == 3
    assert result["first_difference"]["n"] == 1
    assert result["first_difference"]["pearson"] is None
    assert result["first_difference_lags"]["0"]["n"] == 1
