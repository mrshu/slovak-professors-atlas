from __future__ import annotations

import pytest

from research.internal_analysis import analyze_atlas


def test_analyze_atlas_separates_event_volume_from_ceremony_batching() -> None:
    atlas = {
        "records": [
            {"appointedOn": "2000-01-10", "titlesAfter": "CSc.", "institutionId": "a", "affiliationId": "a"},
            {"appointedOn": "2000-01-10", "titlesAfter": "CSc.", "institutionId": "a", "affiliationId": "a"},
            {"appointedOn": "2000-01-10", "titlesAfter": "PhD.", "institutionId": "a", "affiliationId": "a"},
            {"appointedOn": "2000-11-20", "titlesAfter": "PhD.", "institutionId": "b", "affiliationId": "b"},
            {"appointedOn": "2001-11-12", "titlesAfter": "PhD.", "institutionId": "b", "affiliationId": "b"},
            {"appointedOn": "2001-11-12", "titlesAfter": "PhD.", "institutionId": "b", "affiliationId": "b"},
        ],
        "context": [
            {"year": 2000, "graduates": 100, "students": 1000, "internalProfessors": 10},
            {"year": 2001, "graduates": 120, "students": 1100, "internalProfessors": 12},
        ],
        "affiliations": [
            {"id": "a", "city": "Bratislava", "status": "resolved"},
            {"id": "b", "city": "Košice", "status": "resolved"},
        ],
        "fieldEducationComparison": {
            "years": [{"year": 2000}, {"year": 2001}],
            "rows": [
                {"fieldKey": "x", "graduateCounts": [25, 30], "currentStudentCount": 50},
                {"fieldKey": "y", "graduateCounts": [25, None], "currentStudentCount": None},
            ],
        },
    }

    result = analyze_atlas(atlas)

    assert result["coverage"] == {"start_year": 2000, "end_year": 2001, "events": 6, "ceremonies": 3}
    assert result["ceremony_bundling"]["peak_year"] == 2000
    assert result["ceremony_bundling"]["peak_events"] == 4
    assert result["ceremony_bundling"]["largest_ceremony_events"] == 3
    assert result["ceremony_bundling"]["peak_events_without_largest_ceremony"] == 1
    assert result["ceremony_bundling"]["november_event_share"] == pytest.approx(0.5)
    assert result["ceremony_bundling"]["november_ceremony_share"] == pytest.approx(2 / 3)


def test_analyze_atlas_quantifies_titles_fields_geography_and_stock_flow() -> None:
    atlas = {
        "records": [
            {"appointedOn": "2000-01-10", "titlesAfter": "CSc.", "institutionId": "a", "affiliationId": "a"},
            {"appointedOn": "2000-02-10", "titlesAfter": "CSc., PhD.", "institutionId": "a", "affiliationId": "a"},
            {"appointedOn": "2001-01-10", "titlesAfter": "PhD.", "institutionId": "a", "affiliationId": "b"},
            {"appointedOn": "2001-02-10", "titlesAfter": "PhD.", "institutionId": "b", "affiliationId": "b"},
        ],
        "context": [
            {"year": 2000, "graduates": 100, "students": 1000, "internalProfessors": 10},
            {"year": 2001, "graduates": 120, "students": 1100, "internalProfessors": 12},
        ],
        "affiliations": [
            {"id": "a", "city": "Bratislava", "status": "resolved"},
            {"id": "b", "city": "Košice", "status": "resolved"},
        ],
        "fieldEducationComparison": {
            "years": [{"year": 2000}, {"year": 2001}],
            "rows": [
                {"fieldKey": "x", "graduateCounts": [25, 30], "currentStudentCount": 50},
                {"fieldKey": "y", "graduateCounts": [25, None], "currentStudentCount": None},
            ],
        },
    }

    result = analyze_atlas(atlas)

    assert result["title_notation"]["by_year"]["2000"] == {"phd": 1, "csc": 2}
    assert result["title_notation"]["first_phd_plurality_year"] == 2001
    assert result["field_coverage"]["graduates"]["2000"] == pytest.approx(0.5)
    assert result["field_coverage"]["graduates"]["2001"] == pytest.approx(0.25)
    assert result["field_coverage"]["current_students"] == pytest.approx(50 / 1100)
    assert result["stock_flow"]["appointment_events"] == 4
    assert result["stock_flow"]["professor_stock_change"] == 2
    assert result["stock_flow"]["events_per_net_stock_increase"] == 2
    assert result["geography"]["resolved_events"] == 4
    assert result["geography"]["institution_dominant_city_share"] == pytest.approx(0.75)
