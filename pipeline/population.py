from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from typing import Any


POPULATION_YEARS = tuple(range(2000, 2026))
_EXPECTED_IDS = (
    "om7102rr_vuc",
    "om7102rr_obd",
    "om7102rr_ukaz",
    "om7102rr_poh",
    "om7102rr_data",
)
_EXPECTED_ROLE = {
    "time": ["om7102rr_obd"],
    "geo": ["om7102rr_vuc"],
    "metric": ["om7102rr_data"],
}
_EXPECTED_SINGLETONS = {
    "om7102rr_vuc": ("SK0", "Slovak Republic"),
    "om7102rr_ukaz": ("IN010114", "Mid-year (Mean) population (Person)"),
    "om7102rr_poh": ("SPOLU", "Total"),
    "om7102rr_data": ("HODNOTA", "value"),
}


class PopulationDataError(ValueError):
    """Raised when the official population JSON-stat no longer matches its contract."""


def _object(value: object, description: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise PopulationDataError(f"Population {description} must be an object")
    return value


def _category(dimension: dict[str, Any], dimension_id: str) -> dict[str, Any]:
    item = _object(dimension.get(dimension_id), f"dimension {dimension_id!r}")
    return _object(item.get("category"), f"category {dimension_id!r}")


def load_population(path: Path) -> dict[int, int]:
    """Load official national mid-year population for each supported calendar year."""
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise PopulationDataError(f"Cannot read population source at {path}: {error}") from error
    payload = _object(payload, "source")

    if payload.get("version") != "2.0" or payload.get("class") != "dataset":
        raise PopulationDataError("Population source must be a JSON-stat 2.0 dataset")
    if payload.get("id") != list(_EXPECTED_IDS):
        raise PopulationDataError(
            f"Population dimensions changed: expected {_EXPECTED_IDS!r}, got {payload.get('id')!r}"
        )
    expected_size = [1, len(POPULATION_YEARS), 1, 1, 1]
    if payload.get("size") != expected_size:
        raise PopulationDataError(
            f"Population dimensions have unexpected sizes: expected {expected_size!r}, got {payload.get('size')!r}"
        )
    if payload.get("role") != _EXPECTED_ROLE:
        raise PopulationDataError("Population JSON-stat dimension roles changed")
    update = payload.get("update")
    if not isinstance(update, str):
        raise PopulationDataError("Population source requires an ISO update date")
    try:
        date.fromisoformat(update)
    except ValueError as error:
        raise PopulationDataError("Population source requires an ISO update date") from error

    dimension = _object(payload.get("dimension"), "dimensions")
    if set(dimension) != set(_EXPECTED_IDS):
        raise PopulationDataError("Population JSON-stat dimensions changed")
    for dimension_id, (code, label) in _EXPECTED_SINGLETONS.items():
        category = _category(dimension, dimension_id)
        if category.get("index") != {code: 0} or category.get("label") != {
            code: label
        }:
            raise PopulationDataError(
                f"Population selection for {dimension_id!r} changed"
            )

    year_category = _category(dimension, "om7102rr_obd")
    raw_year_positions = year_category.get("index")
    expected_year_codes = {str(year) for year in POPULATION_YEARS}
    if not isinstance(raw_year_positions, dict) or set(raw_year_positions) != expected_year_codes:
        raise PopulationDataError(
            "Population source must contain exactly the supported years 2000 through 2025"
        )
    positions = list(raw_year_positions.values())
    if (
        any(isinstance(position, bool) or not isinstance(position, int) for position in positions)
        or set(positions) != set(range(len(POPULATION_YEARS)))
    ):
        raise PopulationDataError("Population year positions must be a complete unique index")

    values = payload.get("value")
    if not isinstance(values, list) or len(values) != len(POPULATION_YEARS):
        raise PopulationDataError(
            f"Population values must contain {len(POPULATION_YEARS)} items"
        )
    if any(
        isinstance(value, bool) or not isinstance(value, int) or value <= 0
        for value in values
    ):
        raise PopulationDataError("Every population value must be a positive integer")

    return {
        year: values[raw_year_positions[str(year)]]
        for year in POPULATION_YEARS
    }
