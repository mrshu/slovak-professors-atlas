from __future__ import annotations

import pytest

from research.robustness_analysis import (
    analyze_context_correlations,
    term_end_batch_permutation,
)


def test_context_correlations_report_levels_changes_and_detrended_values() -> None:
    context = [
        {"year": 2000, "appointments": 1, "graduates": 2},
        {"year": 2001, "appointments": 2, "graduates": 4},
        {"year": 2002, "appointments": 4, "graduates": 8},
        {"year": 2003, "appointments": 3, "graduates": 6},
    ]

    result = analyze_context_correlations(context, ["graduates"])

    assert result["graduates"]["level"] == pytest.approx(1.0)
    assert result["graduates"]["first_difference"] == pytest.approx(1.0)
    assert result["graduates"]["detrended"] == pytest.approx(1.0)


def test_term_end_null_permutes_whole_ceremony_batches() -> None:
    records = [
        *[{"appointedOn": "2000-01-02", "presidentId": "p"}] * 1,
        *[{"appointedOn": "2000-01-09", "presidentId": "p"}] * 5,
    ]
    presidents = [
        {"id": "p", "from": "2000-01-01", "to": "2000-01-11"},
    ]

    result = term_end_batch_permutation(
        records, presidents, window_days=3, randomizations=100, seed=7
    )

    assert result["observed_events"] == 5
    assert result["term_end_ceremonies"] == 1
    assert result["eligible_ceremonies"] == 2
    assert result["null_mean_events"] == pytest.approx(3.0)
    assert result["one_sided_p"] == pytest.approx(0.5)
