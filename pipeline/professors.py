from __future__ import annotations

import argparse
import hashlib
import json
from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

import xlrd
from xlrd.xldate import XLDateError

from pipeline.models import (
    Appointment,
    Institution,
    President,
    ProfessorDataset,
    SourceVariant,
)
from pipeline.text import normalize_display, normalize_search


APPOINTMENT_SHEET = "Zoznam vymenovaných profesorov"
INSTITUTION_SHEET = "Zoznam skratiek vysokých škôl"
EXPECTED_SHEETS = [APPOINTMENT_SHEET, INSTITUTION_SHEET]
APPOINTMENT_HEADERS = [
    "Titul pred menom",
    "Meno",
    "Priezvisko",
    "Titul za menom",
    "Nazov fakulty vymenovania",
    "Vysoká škola, ktorá navrhla vymenovanie",
    "Odbor",
    "Datum vymenovania",
]
INSTITUTION_HEADERS = ["Názov vysokej školy", "Skratka vysokej školy"]

_PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INSTITUTIONS_PATH = _PROJECT_ROOT / "data/config/institutions.json"
DEFAULT_PRESIDENTS_PATH = _PROJECT_ROOT / "data/config/presidents.json"
DEFAULT_DUPLICATE_RESOLUTIONS_PATH = (
    _PROJECT_ROOT / "data/config/duplicate-resolutions.json"
)


class AppointmentDataError(ValueError):
    """Base class for appointment input and reconciliation failures."""


class WorkbookSchemaError(AppointmentDataError):
    """Raised when workbook sheets or columns differ from the pinned schema."""


class WorkbookDataError(AppointmentDataError):
    """Raised when a source row contains an invalid required value."""


class ConfigurationError(AppointmentDataError):
    """Raised when committed reconciliation metadata is invalid."""


class InstitutionMappingError(AppointmentDataError):
    """Raised when a source institution has no explicit canonical mapping."""


class PresidentAssignmentError(AppointmentDataError):
    """Raised when an appointment does not belong to exactly one term."""


class DuplicateResolutionError(AppointmentDataError):
    """Raised when a reviewed duplicate no longer matches its source rows."""


class UnreviewedDuplicateError(AppointmentDataError):
    """Raised for a same-name/same-date collision absent from the review table."""


class AppointmentIdCollisionError(AppointmentDataError):
    """Raised when two distinct identities produce the same shortened ID."""


@dataclass(frozen=True, slots=True)
class _SourceRow:
    row_number: int
    first_name: str
    last_name: str
    appointed_on: date
    variant: SourceVariant

    @property
    def name(self) -> str:
        return f"{normalize_display(self.first_name)} {normalize_display(self.last_name)}"

    @property
    def normalized_name(self) -> str:
        return normalize_search(self.name)

    @property
    def identity(self) -> tuple[str, date]:
        return self.normalized_name, self.appointed_on


@dataclass(frozen=True, slots=True)
class _DuplicateResolution:
    primary_row: int
    secondary_row: int
    normalized_name: str
    appointed_on: date
    reason: str


_INSTITUTION_KEYS = {
    "id",
    "shortName",
    "fullName",
    "city",
    "latitude",
    "longitude",
    "sourceLabels",
    "citationUrl",
}
_PRESIDENT_KEYS = {"id", "name", "from", "to"}
_RESOLUTION_KEYS = {
    "primaryRow",
    "secondaryRow",
    "normalizedName",
    "date",
    "reason",
}


def _load_json_array(path: Path, description: str) -> list[Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ConfigurationError(f"Cannot read {description} from {path}: {error}") from error
    if not isinstance(value, list):
        raise ConfigurationError(f"{description} in {path} must be a JSON array")
    return value


def _require_object_keys(
    value: Any, expected_keys: set[str], description: str
) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ConfigurationError(f"{description} must be a JSON object")
    actual_keys = set(value)
    if actual_keys != expected_keys:
        raise ConfigurationError(
            f"{description} keys differ: expected {sorted(expected_keys)}, "
            f"got {sorted(actual_keys)}"
        )
    return value


def _nonempty_string(value: Any, description: str) -> str:
    if not isinstance(value, str) or not normalize_display(value):
        raise ConfigurationError(f"{description} must be a non-empty string")
    return value


def _iso_date(value: Any, description: str) -> date:
    if not isinstance(value, str):
        raise ConfigurationError(f"{description} must be an ISO date string")
    try:
        return date.fromisoformat(value)
    except ValueError as error:
        raise ConfigurationError(f"{description} is not a valid ISO date: {value!r}") from error


def _load_institutions(path: Path) -> tuple[Institution, ...]:
    items = _load_json_array(path, "institution metadata")
    institutions: list[Institution] = []
    seen_ids: set[str] = set()
    seen_labels: dict[str, str] = {}
    seen_full_names: set[str] = set()

    for index, raw_item in enumerate(items, start=1):
        item = _require_object_keys(
            raw_item, _INSTITUTION_KEYS, f"institution entry {index}"
        )
        institution_id = _nonempty_string(item["id"], f"institution {index} id")
        short_name = _nonempty_string(
            item["shortName"], f"institution {institution_id} shortName"
        )
        full_name = _nonempty_string(
            item["fullName"], f"institution {institution_id} fullName"
        )
        city = _nonempty_string(item["city"], f"institution {institution_id} city")
        citation_url = _nonempty_string(
            item["citationUrl"], f"institution {institution_id} citationUrl"
        )
        latitude = item["latitude"]
        longitude = item["longitude"]
        if (
            isinstance(latitude, bool)
            or not isinstance(latitude, (int, float))
            or not -90 <= latitude <= 90
        ):
            raise ConfigurationError(
                f"institution {institution_id} latitude must be between -90 and 90"
            )
        if (
            isinstance(longitude, bool)
            or not isinstance(longitude, (int, float))
            or not -180 <= longitude <= 180
        ):
            raise ConfigurationError(
                f"institution {institution_id} longitude must be between -180 and 180"
            )
        raw_labels = item["sourceLabels"]
        if not isinstance(raw_labels, list) or not raw_labels:
            raise ConfigurationError(
                f"institution {institution_id} sourceLabels must be a non-empty array"
            )
        labels: list[str] = []
        for raw_label in raw_labels:
            label = _nonempty_string(
                raw_label, f"institution {institution_id} source label"
            )
            if label != normalize_display(label):
                raise ConfigurationError(
                    f"institution {institution_id} source label is not display-normalized: "
                    f"{label!r}"
                )
            other_id = seen_labels.get(label)
            if other_id is not None:
                raise ConfigurationError(
                    f"institution source label {label!r} maps to both "
                    f"{other_id!r} and {institution_id!r}"
                )
            seen_labels[label] = institution_id
            labels.append(label)

        if institution_id in seen_ids:
            raise ConfigurationError(f"duplicate institution id {institution_id!r}")
        if full_name in seen_full_names:
            raise ConfigurationError(f"duplicate institution fullName {full_name!r}")
        seen_ids.add(institution_id)
        seen_full_names.add(full_name)
        institutions.append(
            Institution(
                id=institution_id,
                short_name=short_name,
                full_name=full_name,
                city=city,
                latitude=float(latitude),
                longitude=float(longitude),
                source_labels=tuple(labels),
                citation_url=citation_url,
            )
        )

    if len(institutions) != 22:
        raise ConfigurationError(
            f"institution metadata must contain 22 canonical institutions, got {len(institutions)}"
        )
    return tuple(institutions)


def _load_presidents(path: Path) -> tuple[President, ...]:
    items = _load_json_array(path, "presidential term metadata")
    presidents: list[President] = []
    seen_ids: set[str] = set()
    for index, raw_item in enumerate(items, start=1):
        item = _require_object_keys(raw_item, _PRESIDENT_KEYS, f"president entry {index}")
        president_id = _nonempty_string(item["id"], f"president {index} id")
        name = _nonempty_string(item["name"], f"president {president_id} name")
        from_date = _iso_date(item["from"], f"president {president_id} from")
        to_value = item["to"]
        to_date = (
            None
            if to_value is None
            else _iso_date(to_value, f"president {president_id} to")
        )
        if to_date is not None and from_date >= to_date:
            raise ConfigurationError(
                f"president {president_id} term must end after it starts"
            )
        if president_id in seen_ids:
            raise ConfigurationError(f"duplicate president id {president_id!r}")
        seen_ids.add(president_id)
        presidents.append(
            President(
                id=president_id,
                name=name,
                from_date=from_date,
                to_date=to_date,
            )
        )
    if not presidents:
        raise ConfigurationError("presidential term metadata must not be empty")
    for president in presidents[:-1]:
        if president.to_date is None:
            raise ConfigurationError(
                "only the final presidential term may be open-ended"
            )
    if presidents[-1].to_date is not None:
        raise ConfigurationError("the final presidential term must be open-ended")
    for index in range(len(presidents) - 1):
        previous = presidents[index]
        current = presidents[index + 1]
        assert previous.to_date is not None
        if current.from_date > previous.to_date:
            raise ConfigurationError(
                f"presidential terms have a gap between {previous.id!r} and "
                f"{current.id!r}"
            )
        if current.from_date < previous.to_date:
            raise ConfigurationError(
                f"presidential terms overlap between {previous.id!r} and "
                f"{current.id!r}"
            )
    return tuple(presidents)


def _load_duplicate_resolutions(path: Path) -> tuple[_DuplicateResolution, ...]:
    items = _load_json_array(path, "duplicate resolutions")
    resolutions: list[_DuplicateResolution] = []
    seen_secondaries: set[int] = set()
    seen_pairs: set[tuple[int, int]] = set()

    for index, raw_item in enumerate(items, start=1):
        item = _require_object_keys(
            raw_item, _RESOLUTION_KEYS, f"duplicate resolution {index}"
        )
        primary_row = item["primaryRow"]
        secondary_row = item["secondaryRow"]
        if (
            isinstance(primary_row, bool)
            or not isinstance(primary_row, int)
            or primary_row < 2
        ):
            raise ConfigurationError(
                f"duplicate resolution {index} primaryRow must be a source row number"
            )
        if (
            isinstance(secondary_row, bool)
            or not isinstance(secondary_row, int)
            or secondary_row < 2
        ):
            raise ConfigurationError(
                f"duplicate resolution {index} secondaryRow must be a source row number"
            )
        if primary_row == secondary_row:
            raise ConfigurationError(
                f"duplicate resolution {index} cannot resolve a row against itself"
            )
        pair = (primary_row, secondary_row)
        if pair in seen_pairs:
            raise ConfigurationError(f"duplicate resolution pair {pair}")
        if secondary_row in seen_secondaries:
            raise ConfigurationError(
                f"source row {secondary_row} is secondary in multiple resolutions"
            )
        normalized_name = _nonempty_string(
            item["normalizedName"], f"duplicate resolution {index} normalizedName"
        )
        if normalized_name != normalize_search(normalized_name):
            raise ConfigurationError(
                f"duplicate resolution {index} normalizedName is not search-normalized"
            )
        appointed_on = _iso_date(item["date"], f"duplicate resolution {index} date")
        reason = _nonempty_string(item["reason"], f"duplicate resolution {index} reason")
        seen_pairs.add(pair)
        seen_secondaries.add(secondary_row)
        resolutions.append(
            _DuplicateResolution(
                primary_row=primary_row,
                secondary_row=secondary_row,
                normalized_name=normalized_name,
                appointed_on=appointed_on,
                reason=reason,
            )
        )
    return tuple(resolutions)


def _validate_workbook_schema(workbook: Any) -> tuple[Any, Any]:
    actual_sheets = workbook.sheet_names()
    if actual_sheets != EXPECTED_SHEETS:
        raise WorkbookSchemaError(
            f"Workbook sheet names differ: expected {EXPECTED_SHEETS!r}, "
            f"got {actual_sheets!r}"
        )
    appointment_sheet = workbook.sheet_by_name(APPOINTMENT_SHEET)
    institution_sheet = workbook.sheet_by_name(INSTITUTION_SHEET)
    _validate_headers(appointment_sheet, APPOINTMENT_HEADERS, APPOINTMENT_SHEET)
    _validate_headers(institution_sheet, INSTITUTION_HEADERS, INSTITUTION_SHEET)
    return appointment_sheet, institution_sheet


def _validate_headers(sheet: Any, expected: list[str], sheet_name: str) -> None:
    actual = sheet.row_values(0) if sheet.nrows else []
    if sheet.ncols != len(expected) or actual != expected:
        raise WorkbookSchemaError(
            f"Workbook headers differ on {sheet_name!r}: expected {expected!r}, "
            f"got {actual!r}"
        )


def _validate_institution_sheet(
    sheet: Any, institutions: tuple[Institution, ...]
) -> None:
    configured_pairs = {
        (institution.full_name, institution.short_name): institution.id
        for institution in institutions
    }
    seen_ids: set[str] = set()
    for row_index in range(1, sheet.nrows):
        row_number = row_index + 1
        raw_full_name, raw_short_name = sheet.row_values(row_index)
        if not isinstance(raw_full_name, str) or not isinstance(raw_short_name, str):
            raise WorkbookDataError(
                f"Institution abbreviation row {row_number} must contain text"
            )
        pair = (normalize_display(raw_full_name), normalize_display(raw_short_name))
        institution_id = configured_pairs.get(pair)
        if institution_id is None:
            raise InstitutionMappingError(
                f"Institution abbreviation row {row_number} is not represented by "
                f"canonical metadata: {pair!r}"
            )
        if institution_id in seen_ids:
            raise WorkbookDataError(
                f"Institution abbreviation row {row_number} repeats {institution_id!r}"
            )
        seen_ids.add(institution_id)

    expected_ids = {institution.id for institution in institutions} - {"dti"}
    if seen_ids != expected_ids:
        missing = sorted(expected_ids - seen_ids)
        unexpected = sorted(seen_ids - expected_ids)
        raise InstitutionMappingError(
            "Institution abbreviation sheet differs from canonical metadata: "
            f"missing={missing}, unexpected={unexpected}"
        )


def _source_text(
    value: object, *, row_number: int, field_name: str, required: bool
) -> str:
    if not isinstance(value, str):
        raise WorkbookDataError(
            f"Source row {row_number} field {field_name!r} must contain text"
        )
    if required and not normalize_display(value):
        raise WorkbookDataError(
            f"Source row {row_number} field {field_name!r} is required"
        )
    return value


def _appointment_date(value: object, *, row_number: int, datemode: int) -> date:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise WorkbookDataError(
            f"Source row {row_number} appointment date must be an Excel serial date"
        )
    try:
        converted = xlrd.xldate_as_datetime(value, datemode)
    except (XLDateError, OverflowError, ValueError) as error:
        raise WorkbookDataError(
            f"Source row {row_number} appointment date cannot be converted: {value!r}"
        ) from error
    if converted.time().isoformat() != "00:00:00":
        raise WorkbookDataError(
            f"Source row {row_number} appointment date contains a time: {value!r}"
        )
    appointed_on = converted.date()
    if appointed_on.year < 2000:
        raise WorkbookDataError(
            f"Source row {row_number} appointment date is earlier than 2000: "
            f"{appointed_on.isoformat()}"
        )
    return appointed_on


def _read_source_rows(sheet: Any, datemode: int) -> tuple[_SourceRow, ...]:
    rows: list[_SourceRow] = []
    for row_index in range(1, sheet.nrows):
        row_number = row_index + 1
        values = sheet.row_values(row_index)
        if len(values) != len(APPOINTMENT_HEADERS):
            raise WorkbookSchemaError(
                f"Source row {row_number} has {len(values)} columns; "
                f"expected {len(APPOINTMENT_HEADERS)}"
            )
        (
            titles_before,
            first_name,
            last_name,
            titles_after,
            faculty,
            institution,
            field,
            raw_date,
        ) = values
        titles_before = _source_text(
            titles_before,
            row_number=row_number,
            field_name="Titul pred menom",
            required=False,
        )
        first_name = _source_text(
            first_name, row_number=row_number, field_name="Meno", required=True
        )
        last_name = _source_text(
            last_name, row_number=row_number, field_name="Priezvisko", required=True
        )
        titles_after = _source_text(
            titles_after,
            row_number=row_number,
            field_name="Titul za menom",
            required=False,
        )
        faculty = _source_text(
            faculty,
            row_number=row_number,
            field_name="Nazov fakulty vymenovania",
            required=False,
        )
        institution = _source_text(
            institution,
            row_number=row_number,
            field_name="Vysoká škola, ktorá navrhla vymenovanie",
            required=True,
        )
        field = _source_text(
            field, row_number=row_number, field_name="Odbor", required=True
        )
        appointed_on = _appointment_date(
            raw_date, row_number=row_number, datemode=datemode
        )
        rows.append(
            _SourceRow(
                row_number=row_number,
                first_name=first_name,
                last_name=last_name,
                appointed_on=appointed_on,
                variant=SourceVariant(
                    row_number=row_number,
                    titles_before=titles_before,
                    titles_after=titles_after,
                    faculty=faculty,
                    institution=institution,
                    field=field,
                ),
            )
        )
    if not rows:
        raise WorkbookDataError("Appointment sheet contains no source rows")
    return tuple(rows)


def _institution_label_map(
    institutions: tuple[Institution, ...]
) -> dict[str, Institution]:
    return {
        label: institution
        for institution in institutions
        for label in institution.source_labels
    }


def _validate_source_institutions(
    rows: tuple[_SourceRow, ...], label_map: dict[str, Institution]
) -> None:
    for row in rows:
        source_label = normalize_display(row.variant.institution)
        if source_label not in label_map:
            raise InstitutionMappingError(
                f"Source row {row.row_number} institution label has no explicit "
                f"canonical mapping: {source_label!r}"
            )


def _resolve_duplicates(
    rows: tuple[_SourceRow, ...],
    resolutions: tuple[_DuplicateResolution, ...],
) -> tuple[dict[int, tuple[SourceVariant, ...]], set[int]]:
    rows_by_number = {row.row_number: row for row in rows}
    secondary_to_primary: dict[int, int] = {}

    for resolution in resolutions:
        primary = rows_by_number.get(resolution.primary_row)
        secondary = rows_by_number.get(resolution.secondary_row)
        if primary is None or secondary is None:
            missing = [
                row_number
                for row_number, row in (
                    (resolution.primary_row, primary),
                    (resolution.secondary_row, secondary),
                )
                if row is None
            ]
            raise DuplicateResolutionError(
                f"Reviewed duplicate resolution references missing source rows {missing}"
            )
        expected_identity = (resolution.normalized_name, resolution.appointed_on)
        if primary.identity != expected_identity or secondary.identity != expected_identity:
            raise DuplicateResolutionError(
                "Reviewed duplicate resolution no longer matches source rows "
                f"{resolution.primary_row}/{resolution.secondary_row}: expected "
                f"{resolution.normalized_name!r} on {resolution.appointed_on.isoformat()}, "
                f"got {primary.identity!r} and {secondary.identity!r}"
            )
        if resolution.primary_row in secondary_to_primary:
            raise DuplicateResolutionError(
                f"Reviewed primary row {resolution.primary_row} is also a secondary row"
            )
        secondary_to_primary[resolution.secondary_row] = resolution.primary_row

    collision_groups: dict[tuple[str, date], list[_SourceRow]] = defaultdict(list)
    for row in rows:
        collision_groups[row.identity].append(row)

    for identity, group in collision_groups.items():
        if len(group) == 1:
            continue
        group_numbers = {row.row_number for row in group}
        primary_numbers = group_numbers - set(secondary_to_primary)
        reviewed = (
            len(primary_numbers) == 1
            and all(
                secondary_to_primary.get(row_number) in primary_numbers
                for row_number in group_numbers - primary_numbers
            )
        )
        if not reviewed:
            normalized_name, appointed_on = identity
            raise UnreviewedDuplicateError(
                f"Unreviewed duplicate collision for {normalized_name!r} on "
                f"{appointed_on.isoformat()} at source rows {sorted(group_numbers)}"
            )

    secondaries_by_primary: dict[int, list[int]] = defaultdict(list)
    for secondary_row, primary_row in secondary_to_primary.items():
        secondaries_by_primary[primary_row].append(secondary_row)

    variants_by_primary: dict[int, tuple[SourceVariant, ...]] = {}
    for primary_row, secondary_rows in secondaries_by_primary.items():
        variants_by_primary[primary_row] = (
            rows_by_number[primary_row].variant,
            *(rows_by_number[row_number].variant for row_number in sorted(secondary_rows)),
        )
    return variants_by_primary, set(secondary_to_primary)


def _assign_president(appointed_on: date, presidents: tuple[President, ...]) -> str:
    matches = [
        president
        for president in presidents
        if president.from_date <= appointed_on
        and (president.to_date is None or appointed_on < president.to_date)
    ]
    if len(matches) != 1:
        raise PresidentAssignmentError(
            f"Appointment on {appointed_on.isoformat()} must map to exactly one "
            f"presidential term; matched {[president.id for president in matches]}"
        )
    return matches[0].id


def _appointment_id(normalized_name: str, appointed_on: date) -> str:
    identity = f"{normalized_name}|{appointed_on.isoformat()}"
    return hashlib.sha256(identity.encode("utf-8")).hexdigest()[:12]


def load_appointments(
    workbook_path: Path | str,
    *,
    institutions_path: Path | str = DEFAULT_INSTITUTIONS_PATH,
    presidents_path: Path | str = DEFAULT_PRESIDENTS_PATH,
    duplicate_resolutions_path: Path | str = DEFAULT_DUPLICATE_RESOLUTIONS_PATH,
) -> ProfessorDataset:
    """Load, strictly validate, and reconcile the ministry appointment workbook."""
    institutions = _load_institutions(Path(institutions_path))
    presidents = _load_presidents(Path(presidents_path))
    resolutions = _load_duplicate_resolutions(Path(duplicate_resolutions_path))

    workbook = xlrd.open_workbook(str(workbook_path))
    appointment_sheet, institution_sheet = _validate_workbook_schema(workbook)
    _validate_institution_sheet(institution_sheet, institutions)
    source_rows = _read_source_rows(appointment_sheet, workbook.datemode)
    institution_labels = _institution_label_map(institutions)
    _validate_source_institutions(source_rows, institution_labels)
    variants_by_primary, secondary_rows = _resolve_duplicates(source_rows, resolutions)

    appointments: list[Appointment] = []
    id_identities: dict[str, tuple[str, date]] = {}
    for row in source_rows:
        if row.row_number in secondary_rows:
            continue
        normalized_name = row.normalized_name
        appointment_id = _appointment_id(normalized_name, row.appointed_on)
        previous_identity = id_identities.get(appointment_id)
        if previous_identity is not None and previous_identity != row.identity:
            raise AppointmentIdCollisionError(
                f"Appointment ID {appointment_id!r} collides for "
                f"{previous_identity!r} and {row.identity!r}"
            )
        if previous_identity is not None:
            raise UnreviewedDuplicateError(
                f"Unreviewed duplicate collision for {normalized_name!r} on "
                f"{row.appointed_on.isoformat()}"
            )
        id_identities[appointment_id] = row.identity
        source_label = normalize_display(row.variant.institution)
        institution = institution_labels[source_label]
        appointments.append(
            Appointment(
                id=appointment_id,
                name=row.name,
                titles_before=normalize_display(row.variant.titles_before),
                titles_after=normalize_display(row.variant.titles_after),
                faculty=normalize_display(row.variant.faculty),
                institution_id=institution.id,
                institution_source=source_label,
                field=normalize_display(row.variant.field),
                appointed_on=row.appointed_on,
                president_id=_assign_president(row.appointed_on, presidents),
                source_variants=variants_by_primary.get(
                    row.row_number, (row.variant,)
                ),
            )
        )

    appointed_dates = [appointment.appointed_on for appointment in appointments]
    return ProfessorDataset(
        appointments=tuple(appointments),
        institutions=institutions,
        presidents=presidents,
        source_row_count=len(source_rows),
        duplicate_source_row_count=len(secondary_rows),
        date_min=min(appointed_dates),
        date_max=max(appointed_dates),
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Validate and reconcile the ministry professor appointment workbook."
    )
    parser.add_argument("workbook", type=Path)
    args = parser.parse_args(argv)
    dataset = load_appointments(args.workbook)
    print(
        f"{dataset.source_row_count} source rows -> "
        f"{len(dataset.appointments)} appointments; "
        f"{dataset.duplicate_source_row_count} reviewed duplicate rows; "
        f"{len(dataset.institutions)} institutions; "
        f"{len({item.appointed_on for item in dataset.appointments})} appointment dates"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
