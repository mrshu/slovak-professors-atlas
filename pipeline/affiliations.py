from __future__ import annotations

import json
import math
from collections import Counter
from pathlib import Path
from typing import Any, Sequence

from pipeline.models import Affiliation, Appointment, City, Institution
from pipeline.text import normalize_display, normalize_search


_PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_AFFILIATION_LOCATIONS_PATH = (
    _PROJECT_ROOT / "data/config/affiliation-locations.json"
)
_ROOT_KEYS = {"cities", "rules"}
_CITY_KEYS = {"name", "latitude", "longitude"}
_RULE_KEYS = {
    "id",
    "institutionId",
    "facultyKeys",
    "status",
    "city",
    "sourceUrl",
    "sourceLabel",
    "note",
}


class AffiliationConfigurationError(ValueError):
    """Raised when reviewed workplace-location rules are incomplete or inconsistent."""


def _object(value: Any, keys: set[str], description: str) -> dict[str, Any]:
    if not isinstance(value, dict) or set(value) != keys:
        actual = sorted(value) if isinstance(value, dict) else type(value).__name__
        raise AffiliationConfigurationError(
            f"{description} must have exactly {sorted(keys)!r}; got {actual!r}"
        )
    return value


def _text(value: Any, description: str) -> str:
    if not isinstance(value, str) or not normalize_display(value):
        raise AffiliationConfigurationError(f"{description} must be a non-empty string")
    if value != normalize_display(value):
        raise AffiliationConfigurationError(f"{description} must be display-normalized")
    return value


def _optional_text(value: Any, description: str) -> str | None:
    if value is None:
        return None
    return _text(value, description)


def _load_configuration(path: Path) -> tuple[tuple[City, ...], tuple[Affiliation, ...]]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise AffiliationConfigurationError(
            f"Cannot read affiliation locations from {path}: {error}"
        ) from error
    root = _object(raw, _ROOT_KEYS, "affiliation location configuration")
    raw_cities = root["cities"]
    raw_rules = root["rules"]
    if not isinstance(raw_cities, list) or not raw_cities:
        raise AffiliationConfigurationError("cities must be a non-empty array")
    if not isinstance(raw_rules, list) or not raw_rules:
        raise AffiliationConfigurationError("rules must be a non-empty array")

    cities: list[City] = []
    city_names: set[str] = set()
    for index, raw_city in enumerate(raw_cities, start=1):
        item = _object(raw_city, _CITY_KEYS, f"city {index}")
        name = _text(item["name"], f"city {index} name")
        latitude = item["latitude"]
        longitude = item["longitude"]
        if (
            isinstance(latitude, bool)
            or not isinstance(latitude, (int, float))
            or not math.isfinite(latitude)
            or not -90 <= latitude <= 90
            or isinstance(longitude, bool)
            or not isinstance(longitude, (int, float))
            or not math.isfinite(longitude)
            or not -180 <= longitude <= 180
        ):
            raise AffiliationConfigurationError(f"city {name!r} has invalid coordinates")
        if name in city_names:
            raise AffiliationConfigurationError(f"duplicate city {name!r}")
        city_names.add(name)
        cities.append(City(name=name, latitude=float(latitude), longitude=float(longitude)))

    affiliations: list[Affiliation] = []
    affiliation_ids: set[str] = set()
    for index, raw_rule in enumerate(raw_rules, start=1):
        item = _object(raw_rule, _RULE_KEYS, f"affiliation rule {index}")
        affiliation_id = _text(item["id"], f"affiliation rule {index} id")
        institution_id = _text(
            item["institutionId"], f"affiliation {affiliation_id} institutionId"
        )
        raw_faculty_keys = item["facultyKeys"]
        if not isinstance(raw_faculty_keys, list):
            raise AffiliationConfigurationError(
                f"affiliation {affiliation_id} facultyKeys must be an array"
            )
        faculty_keys: list[str] = []
        for raw_key in raw_faculty_keys:
            key = _text(raw_key, f"affiliation {affiliation_id} faculty key")
            if key != normalize_search(key):
                raise AffiliationConfigurationError(
                    f"affiliation {affiliation_id} faculty key must be search-normalized"
                )
            if key in faculty_keys:
                raise AffiliationConfigurationError(
                    f"affiliation {affiliation_id} repeats faculty key {key!r}"
                )
            faculty_keys.append(key)

        status = item["status"]
        if status not in {"resolved", "unresolved"}:
            raise AffiliationConfigurationError(
                f"affiliation {affiliation_id} has invalid status {status!r}"
            )
        city = _optional_text(item["city"], f"affiliation {affiliation_id} city")
        source_url = _optional_text(
            item["sourceUrl"], f"affiliation {affiliation_id} sourceUrl"
        )
        source_label = _text(
            item["sourceLabel"], f"affiliation {affiliation_id} sourceLabel"
        )
        note = _optional_text(item["note"], f"affiliation {affiliation_id} note")
        if source_url is not None and not source_url.startswith(("https://", "http://")):
            raise AffiliationConfigurationError(
                f"affiliation {affiliation_id} sourceUrl must be HTTP(S)"
            )
        if status == "resolved" and (city not in city_names or source_url is None):
            raise AffiliationConfigurationError(
                f"resolved affiliation {affiliation_id} needs a configured city and source URL"
            )
        if status == "unresolved" and city is not None:
            raise AffiliationConfigurationError(
                f"unresolved affiliation {affiliation_id} cannot claim a city"
            )
        if affiliation_id in affiliation_ids:
            raise AffiliationConfigurationError(
                f"duplicate affiliation id {affiliation_id!r}"
            )
        affiliation_ids.add(affiliation_id)
        affiliations.append(
            Affiliation(
                id=affiliation_id,
                institution_id=institution_id,
                faculty_keys=tuple(faculty_keys),
                status=status,
                city=city,
                source_url=source_url,
                source_label=source_label,
                note=note,
            )
        )

    return tuple(cities), tuple(affiliations)


def resolve_affiliations(
    appointments: Sequence[Appointment],
    institutions: Sequence[Institution],
    path: Path = DEFAULT_AFFILIATION_LOCATIONS_PATH,
) -> tuple[dict[str, str], tuple[Affiliation, ...], tuple[City, ...]]:
    """Assign each appointment to one reviewed workplace-location rule."""
    cities, affiliations = _load_configuration(path)
    institution_ids = {institution.id for institution in institutions}
    defaults: dict[str, Affiliation] = {}
    exact_rules: dict[tuple[str, str], Affiliation] = {}

    for affiliation in affiliations:
        if affiliation.institution_id not in institution_ids:
            raise AffiliationConfigurationError(
                f"affiliation {affiliation.id} references unknown institution "
                f"{affiliation.institution_id!r}"
            )
        if not affiliation.faculty_keys:
            if affiliation.institution_id in defaults:
                raise AffiliationConfigurationError(
                    f"institution {affiliation.institution_id!r} has multiple default rules"
                )
            defaults[affiliation.institution_id] = affiliation
            continue
        for faculty_key in affiliation.faculty_keys:
            lookup = (affiliation.institution_id, faculty_key)
            if lookup in exact_rules:
                raise AffiliationConfigurationError(
                    f"faculty rule {lookup!r} is assigned more than once"
                )
            exact_rules[lookup] = affiliation

    missing_defaults = institution_ids - set(defaults)
    if missing_defaults:
        raise AffiliationConfigurationError(
            f"institutions without a default affiliation rule: {sorted(missing_defaults)!r}"
        )

    affiliation_by_appointment: dict[str, str] = {}
    usage: Counter[str] = Counter()
    for appointment in appointments:
        faculty_key = normalize_search(appointment.faculty)
        affiliation = exact_rules.get(
            (appointment.institution_id, faculty_key),
            defaults[appointment.institution_id],
        )
        affiliation_by_appointment[appointment.id] = affiliation.id
        usage[affiliation.id] += 1

    unused_rules = sorted(
        affiliation.id for affiliation in affiliations if not usage[affiliation.id]
    )
    if unused_rules:
        raise AffiliationConfigurationError(
            f"affiliation rules no longer match any appointment: {unused_rules!r}"
        )

    return (
        affiliation_by_appointment,
        tuple(sorted(affiliations, key=lambda item: item.id)),
        tuple(sorted(cities, key=lambda item: item.name)),
    )
