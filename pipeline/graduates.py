from __future__ import annotations

import re
from collections import Counter, defaultdict
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from types import MappingProxyType
from typing import Any

import xlrd

from pipeline.models import Appointment
from pipeline.text import normalize_display, normalize_search


WORKBOOK_YEAR = 2025
SHEET_TITLES = {
    "Tab2v": "Absolventi vysokých škôl k 31. 12. 2025 - verejné",
    "Tab2s": "Absolventi vysokých škôl k 31. 12. 2025 - súkromné",
    "Tab2š": "Absolventi vysokých škôl k 31. 12. 2025 - štátne",
}
SHEET_NAMES = tuple(SHEET_TITLES)
TOTAL_COLUMNS = (2, 4, 6, 8, 10, 12, 14)
COLUMN_COUNT = 16
HEADER_ROWS = (
    (
        "Študijný odbor",
        "",
        "Diplom obdržali absolventi I. a II. stupňa ",
        "",
        "",
        "",
        "",
        "",
        "Diplom obdržali absolventi III. stupňa ",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
    ),
    (
        "",
        "",
        "denná forma",
        "",
        "",
        "",
        "externá\nforma ",
        "",
        "denná forma",
        "",
        "",
        "",
        "externá\nforma ",
        "",
        "externých",
        "",
    ),
    (
        "",
        "",
        "slovenského",
        "",
        "iného štát.",
        "",
        "",
        "",
        "slovenského",
        "",
        "iného štát.",
        "",
        "",
        "",
        "vzdelávacích",
        "",
    ),
    (
        "Študijný program",
        "",
        "štát. občian.",
        "",
        "občianstva",
        "",
        "",
        "",
        "štát. občian.",
        "",
        "občianstva",
        "",
        "",
        "",
        "inštitúcií",
        "",
    ),
    (
        "",
        "",
        "spolu",
        "z toho",
        "spolu",
        "z toho",
        "spolu",
        "z toho",
        "spolu",
        "z toho",
        "spolu",
        "z toho",
        "spolu",
        "z toho",
        "spolu",
        "z toho",
    ),
    (
        "",
        "",
        "",
        "ženy",
        "",
        "ženy",
        "",
        "ženy",
        "",
        "ženy",
        "",
        "ženy",
        "",
        "ženy",
        "",
        "ženy",
    ),
)
_PROGRAM_ROW = re.compile(r"^(\d{4}[A-Z]\d{2})/\s*(\S(?:.*\S)?)$")
_CODED_ROW_PREFIX = re.compile(r"^\d{4}[A-Z]\d{2}/")
_SHA256 = re.compile(r"^[0-9a-f]{64}$")


class GraduateWorkbookSchemaError(ValueError):
    """Raised when the pinned CVTI workbook no longer matches its contract."""


@dataclass(frozen=True, slots=True)
class GraduateFieldDataset:
    year: int
    program_row_count: int
    graduates_by_normalized_label: Mapping[str, int]

    def __post_init__(self) -> None:
        if self.year != WORKBOOK_YEAR:
            raise ValueError(f"Graduate field dataset year must be {WORKBOOK_YEAR}")
        if (
            isinstance(self.program_row_count, bool)
            or not isinstance(self.program_row_count, int)
            or self.program_row_count < 0
        ):
            raise ValueError("Program row count must be a non-negative integer")

        counts: dict[str, int] = {}
        for label, count in self.graduates_by_normalized_label.items():
            if not label or normalize_search(label) != label:
                raise ValueError(
                    "Graduate field labels must be non-empty normalized search labels"
                )
            if isinstance(count, bool) or not isinstance(count, int) or count < 0:
                raise ValueError(
                    f"Graduate count for {label!r} must be a non-negative integer"
                )
            counts[label] = count

        object.__setattr__(
            self,
            "graduates_by_normalized_label",
            MappingProxyType(dict(sorted(counts.items()))),
        )


def _validate_workbook(workbook: Any) -> None:
    sheet_names = workbook.sheet_names()
    if sheet_names != list(SHEET_NAMES):
        raise GraduateWorkbookSchemaError(
            f"Graduate workbook sheets must be exactly {list(SHEET_NAMES)!r}, got {sheet_names!r}"
        )

    for sheet_name, expected_title in SHEET_TITLES.items():
        sheet = workbook.sheet_by_name(sheet_name)
        if sheet.ncols != COLUMN_COUNT or sheet.nrows < len(HEADER_ROWS) + 1:
            raise GraduateWorkbookSchemaError(
                f"Graduate workbook sheet {sheet_name!r} must have {COLUMN_COUNT} columns and seven header rows"
            )
        actual_title = sheet.cell_value(0, 0)
        if actual_title != expected_title:
            raise GraduateWorkbookSchemaError(
                f"Graduate workbook {sheet_name!r} must identify calendar year 2025; got {actual_title!r}"
            )
        for row_offset, expected in enumerate(HEADER_ROWS, start=1):
            actual = tuple(sheet.row_values(row_offset, 0, COLUMN_COUNT))
            if actual != expected:
                raise GraduateWorkbookSchemaError(
                    f"Graduate workbook header mismatch in {sheet_name!r}, row {row_offset + 1}: "
                    f"expected {expected!r}, got {actual!r}"
                )


def _non_negative_integer(value: object, *, sheet_name: str, row_number: int, column: int) -> int:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise GraduateWorkbookSchemaError(
            f"Expected a numeric graduate total in {sheet_name} row {row_number}, column {column + 1}"
        )
    integer = int(value)
    if value != integer or integer < 0:
        raise GraduateWorkbookSchemaError(
            f"Expected a non-negative integer graduate total in {sheet_name} row {row_number}, "
            f"column {column + 1}; got {value!r}"
        )
    return integer


def load_graduates_by_field(path: Path) -> GraduateFieldDataset:
    """Parse and aggregate 2025 CVTI study-program graduate totals by exact normalized label."""
    workbook = xlrd.open_workbook(str(path))
    _validate_workbook(workbook)

    graduate_counts: defaultdict[str, int] = defaultdict(int)
    program_row_count = 0
    for sheet_name in SHEET_NAMES:
        sheet = workbook.sheet_by_name(sheet_name)
        for row_index in range(len(HEADER_ROWS) + 1, sheet.nrows):
            first_cell = normalize_display(sheet.cell_value(row_index, 0))
            match = _PROGRAM_ROW.fullmatch(first_cell)
            if match is None:
                if _CODED_ROW_PREFIX.match(first_cell):
                    raise GraduateWorkbookSchemaError(
                        f"Study-program row {row_index + 1} in {sheet_name} has no label"
                    )
                continue
            label = normalize_display(match.group(2))
            normalized_label = normalize_search(label)
            graduate_counts[normalized_label] += sum(
                _non_negative_integer(
                    sheet.cell_value(row_index, column),
                    sheet_name=sheet_name,
                    row_number=row_index + 1,
                    column=column,
                )
                for column in TOTAL_COLUMNS
            )
            program_row_count += 1

    if program_row_count == 0:
        raise GraduateWorkbookSchemaError("Graduate workbook contains no study-program rows")

    return GraduateFieldDataset(
        year=WORKBOOK_YEAR,
        program_row_count=program_row_count,
        graduates_by_normalized_label=graduate_counts,
    )


def _validated_source(source: Mapping[str, object]) -> dict[str, str]:
    required = ("url", "catalogUrl", "sha256", "retrievedOn")
    result: dict[str, str] = {}
    for key in required:
        value = source.get(key)
        if not isinstance(value, str) or not value:
            raise ValueError(f"Graduate source metadata requires non-empty {key}")
        result[key] = value

    if _SHA256.fullmatch(result["sha256"]) is None:
        raise ValueError("Graduate source metadata requires a lowercase SHA-256")
    try:
        retrieved_on = date.fromisoformat(result["retrievedOn"])
    except ValueError as error:
        raise ValueError(
            "Graduate source metadata requires an ISO retrievedOn date"
        ) from error
    if retrieved_on.isoformat() != result["retrievedOn"]:
        raise ValueError("Graduate source metadata requires an ISO retrievedOn date")
    return result


def build_field_graduate_comparison(
    appointments: Sequence[Appointment],
    graduates: GraduateFieldDataset,
    source: Mapping[str, object],
) -> dict[str, object]:
    """Compare one calendar year's raw appointment fields by exact normalized equality only."""
    field_variants: defaultdict[str, Counter[str]] = defaultdict(Counter)
    for appointment in appointments:
        if appointment.appointed_on.year != graduates.year:
            continue
        field = normalize_display(appointment.field)
        field_variants[normalize_search(field)][field] += 1

    rows: list[dict[str, object]] = []
    matched_appointment_count = 0
    matched_distinct_field_count = 0

    for normalized_field, variants in field_variants.items():
        appointment_count = variants.total()
        field = min(
            variants,
            key=lambda variant: (-variants[variant], variant.casefold(), variant),
        )
        if normalized_field in graduates.graduates_by_normalized_label:
            graduate_count = graduates.graduates_by_normalized_label[normalized_field]
            matched_appointment_count += appointment_count
            matched_distinct_field_count += 1
            row = {
                "field": field,
                "appointmentCount": appointment_count,
                "graduateCount": graduate_count,
                "graduatesPerAppointment": round(
                    graduate_count / appointment_count, 2
                ),
                "matchStatus": "exact",
            }
        else:
            row = {
                "field": field,
                "appointmentCount": appointment_count,
                "graduateCount": None,
                "graduatesPerAppointment": None,
                "matchStatus": "unmatched",
            }
        rows.append(row)

    rows.sort(
        key=lambda row: (
            -int(row["appointmentCount"]),
            normalize_search(str(row["field"])),
            str(row["field"]),
        )
    )
    appointment_count = sum(variants.total() for variants in field_variants.values())

    return {
        "schemaVersion": 1,
        "year": graduates.year,
        "source": _validated_source(source),
        "appointmentCount": appointment_count,
        "matchedAppointmentCount": matched_appointment_count,
        "matchedAppointmentShare": (
            round(matched_appointment_count * 100 / appointment_count, 2)
            if appointment_count
            else 0.0
        ),
        "distinctFieldCount": len(field_variants),
        "matchedDistinctFieldCount": matched_distinct_field_count,
        "rows": rows,
    }
