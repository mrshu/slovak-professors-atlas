from __future__ import annotations

import re
from collections import defaultdict
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from types import MappingProxyType
from typing import Any

import xlrd

from pipeline.fields import FieldCatalog
from pipeline.text import normalize_display, normalize_search


GRADUATE_SHEET_NAMES = ("Tab2v", "Tab2s", "Tab2š")
GRADUATE_TOTAL_COLUMNS = (2, 4, 6, 8, 10, 12, 14)
GRADUATE_COLUMN_COUNT = 16
GRADUATE_HEADER_ROWS = (
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

STUDENT_SHEET_NAMES = (
    "Tab4v",
    "Tab5v",
    "Tab11v",
    "Tab12v",
    "Tab4s",
    "Tab5s",
    "Tab11s",
    "Tab12s",
    "Tab4š",
    "Tab5š",
    "Tab11š",
    "Tab12š",
)
STUDENT_PROGRAM_SHEETS = (
    "Tab5v",
    "Tab12v",
    "Tab5s",
    "Tab12s",
    "Tab5š",
    "Tab12š",
)
STUDENT_COLUMN_COUNT = 14
STUDENT_HEADER_ROWS = (
    (
        "Študijný odbor, študijný program",
        "",
        "Dĺžka",
        "Študujúci slovenského štátneho občianstva",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Študujúci",
        "",
    ),
    (
        "",
        "",
        "",
        "spolu",
        "",
        "v akademickom roku",
        "",
        "",
        "",
        "",
        "",
        "",
        "iného štátneho",
        "",
    ),
    (
        "",
        "",
        "",
        "",
        "z toho",
        "1.",
        "",
        "2.",
        "3.",
        "4.",
        "5.",
        "6. a",
        "občianstva",
        "",
    ),
    (
        "",
        "",
        "",
        "",
        "ženy",
        "spolu",
        "novo-",
        "",
        "",
        "",
        "",
        "",
        "spolu",
        "z toho",
    ),
    (
        "",
        "",
        "",
        "",
        "",
        "",
        "prijatí",
        "",
        "",
        "",
        "",
        "vyššom",
        "",
        "ženy",
    ),
)

LEGACY_PROGRAM_ROW = re.compile(r"^(\d{7})\s+(\S(?:.*?\S)?)(?:\s+/Bc/)?$")
MIDDLE_PROGRAM_ROW = re.compile(r"^(\d{4}[A-Z]\d{2})\s+(\S(?:.*\S)?)$")
CURRENT_PROGRAM_ROW = re.compile(r"^(\d{4}[A-Z]\d{2})/\s*(\S(?:.*\S)?)$")
LEGACY_CODED_ROW = re.compile(r"^\d{7}(?:\s|$)")
MIDDLE_CODED_ROW = re.compile(r"^\d{4}[A-Z]\d{2}(?:\s|$)")
CURRENT_CODED_ROW = re.compile(r"^\d{4}[A-Z]\d{2}/")
_OWNERSHIP_LABELS = {"v": "verejné", "s": "súkromné", "š": "štátne"}


class EducationWorkbookSchemaError(ValueError):
    """Raised when a pinned CVTI education workbook changes shape or arithmetic."""


@dataclass(frozen=True, slots=True)
class ProgramFieldDataset:
    year: int
    program_row_count: int
    national_total: int
    counts_by_field_key: Mapping[str, int]

    def __post_init__(self) -> None:
        if isinstance(self.year, bool) or not isinstance(self.year, int):
            raise ValueError("Program field dataset year must be an integer")
        if (
            isinstance(self.program_row_count, bool)
            or not isinstance(self.program_row_count, int)
            or self.program_row_count < 0
        ):
            raise ValueError("Program row count must be a non-negative integer")
        if (
            isinstance(self.national_total, bool)
            or not isinstance(self.national_total, int)
            or self.national_total < 0
        ):
            raise ValueError("National total must be a non-negative integer")

        counts: dict[str, int] = {}
        for field_key, count in self.counts_by_field_key.items():
            if not field_key or normalize_search(field_key) != field_key:
                raise ValueError("Field keys must be non-empty normalized search labels")
            if isinstance(count, bool) or not isinstance(count, int) or count < 0:
                raise ValueError(
                    f"Program count for {field_key!r} must be a non-negative integer"
                )
            counts[field_key] = count
        if sum(counts.values()) != self.national_total:
            raise ValueError("National total must equal the sum of field counts")
        object.__setattr__(
            self,
            "counts_by_field_key",
            MappingProxyType(dict(sorted(counts.items()))),
        )


def _graduate_row_contract(year: int) -> tuple[re.Pattern[str], re.Pattern[str]]:
    if 2009 <= year <= 2012:
        return LEGACY_PROGRAM_ROW, LEGACY_CODED_ROW
    if 2013 <= year <= 2022:
        return MIDDLE_PROGRAM_ROW, MIDDLE_CODED_ROW
    if 2023 <= year <= 2025:
        return CURRENT_PROGRAM_ROW, CURRENT_CODED_ROW
    raise ValueError("Graduate workbook year must be between 2009 and 2025")


def graduate_program_label(cell: object, year: int) -> str | None:
    pattern, _ = _graduate_row_contract(year)
    text = normalize_display(cell)
    match = pattern.fullmatch(text)
    return normalize_display(match.group(2)) if match is not None else None


def source_integer(
    value: object,
    *,
    sheet_name: str,
    row_number: int,
    column: int,
) -> int:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise EducationWorkbookSchemaError(
            f"Expected a non-negative integer in {sheet_name} row {row_number}, "
            f"column {column + 1}; got {value!r}"
        )
    integer = int(value)
    if value != integer or integer < 0:
        raise EducationWorkbookSchemaError(
            f"Expected a non-negative integer in {sheet_name} row {row_number}, "
            f"column {column + 1}; got {value!r}"
        )
    return integer


def _validate_graduate_workbook(workbook: Any, year: int) -> None:
    missing = [name for name in GRADUATE_SHEET_NAMES if name not in workbook.sheet_names()]
    if missing:
        raise EducationWorkbookSchemaError(
            f"Graduate workbook is missing required sheets {missing!r}"
        )
    for sheet_name in GRADUATE_SHEET_NAMES:
        sheet = workbook.sheet_by_name(sheet_name)
        if sheet.ncols != GRADUATE_COLUMN_COUNT or sheet.nrows < len(GRADUATE_HEADER_ROWS) + 1:
            raise EducationWorkbookSchemaError(
                f"Graduate sheet {sheet_name!r} must have 16 columns and seven header rows"
            )
        expected_title = (
            f"Absolventi vysokých škôl k 31. 12. {year} - "
            f"{_OWNERSHIP_LABELS[sheet_name[-1]]}"
        )
        if sheet.cell_value(0, 0) != expected_title:
            raise EducationWorkbookSchemaError(
                f"Graduate sheet {sheet_name!r} must identify year {year}"
            )
        for row_index, expected in enumerate(GRADUATE_HEADER_ROWS, start=1):
            actual = tuple(sheet.row_values(row_index, 0, GRADUATE_COLUMN_COUNT))
            if actual != expected:
                raise EducationWorkbookSchemaError(
                    f"Graduate workbook header mismatch in {sheet_name!r}, "
                    f"row {row_index + 1}"
                )


def load_graduate_fields(
    path: Path,
    year: int,
    catalog: FieldCatalog,
) -> ProgramFieldDataset:
    workbook = xlrd.open_workbook(str(path))
    pattern, coded_row = _graduate_row_contract(year)
    _validate_graduate_workbook(workbook, year)
    counts: defaultdict[str, int] = defaultdict(int)
    program_row_count = 0
    for sheet_name in GRADUATE_SHEET_NAMES:
        sheet = workbook.sheet_by_name(sheet_name)
        for row_index in range(len(GRADUATE_HEADER_ROWS) + 1, sheet.nrows):
            cell = normalize_display(sheet.cell_value(row_index, 0))
            match = pattern.fullmatch(cell)
            if match is None:
                if coded_row.match(cell):
                    raise EducationWorkbookSchemaError(
                        f"Study-program row {row_index + 1} in {sheet_name} has no label"
                    )
                continue
            label = normalize_display(match.group(2))
            total = sum(
                source_integer(
                    sheet.cell_value(row_index, column),
                    sheet_name=sheet_name,
                    row_number=row_index + 1,
                    column=column,
                )
                for column in GRADUATE_TOTAL_COLUMNS
            )
            counts[catalog.key_for(label)] += total
            program_row_count += 1
    if program_row_count == 0:
        raise EducationWorkbookSchemaError("Graduate workbook contains no program rows")
    return ProgramFieldDataset(
        year=year,
        program_row_count=program_row_count,
        national_total=sum(counts.values()),
        counts_by_field_key=counts,
    )


def _validate_student_workbook(workbook: Any) -> None:
    if workbook.sheet_names() != list(STUDENT_SHEET_NAMES):
        raise EducationWorkbookSchemaError(
            "Current-student workbook sheet set or order changed"
        )
    for sheet_name in STUDENT_PROGRAM_SHEETS:
        sheet = workbook.sheet_by_name(sheet_name)
        if sheet.ncols != STUDENT_COLUMN_COUNT or sheet.nrows < len(STUDENT_HEADER_ROWS) + 1:
            raise EducationWorkbookSchemaError(
                f"Current-student sheet {sheet_name!r} must have 14 columns and six header rows"
            )
        expected_title = (
            "Vysoké školy k 31. 10. 2025 - "
            f"{_OWNERSHIP_LABELS[sheet_name[-1]]}"
        )
        if sheet.cell_value(0, 0) != expected_title:
            raise EducationWorkbookSchemaError(
                f"Current-student sheet {sheet_name!r} must identify year 2025"
            )
        expected_form = "Denná forma" if sheet_name.startswith("Tab5") else "Externá forma"
        if sheet.cell_value(0, 11) != expected_form:
            raise EducationWorkbookSchemaError(
                f"Current-student sheet {sheet_name!r} form header changed"
            )
        for row_index, expected in enumerate(STUDENT_HEADER_ROWS, start=1):
            actual = tuple(sheet.row_values(row_index, 0, STUDENT_COLUMN_COUNT))
            if actual != expected:
                raise EducationWorkbookSchemaError(
                    f"Current-student workbook header mismatch in {sheet_name!r}, "
                    f"row {row_index + 1}"
                )


def load_current_student_fields(
    path: Path,
    catalog: FieldCatalog,
) -> ProgramFieldDataset:
    workbook = xlrd.open_workbook(str(path))
    _validate_student_workbook(workbook)
    counts: defaultdict[str, int] = defaultdict(int)
    program_row_count = 0
    for sheet_name in STUDENT_PROGRAM_SHEETS:
        sheet = workbook.sheet_by_name(sheet_name)
        for row_index in range(len(STUDENT_HEADER_ROWS) + 1, sheet.nrows):
            cell = normalize_display(sheet.cell_value(row_index, 0))
            match = CURRENT_PROGRAM_ROW.fullmatch(cell)
            if match is None:
                if CURRENT_CODED_ROW.match(cell):
                    raise EducationWorkbookSchemaError(
                        f"Study-program row {row_index + 1} in {sheet_name} has no label"
                    )
                continue
            label = normalize_display(match.group(2))
            total = source_integer(
                sheet.cell_value(row_index, 3),
                sheet_name=sheet_name,
                row_number=row_index + 1,
                column=3,
            ) + source_integer(
                sheet.cell_value(row_index, 12),
                sheet_name=sheet_name,
                row_number=row_index + 1,
                column=12,
            )
            counts[catalog.key_for(label)] += total
            program_row_count += 1
    if program_row_count == 0:
        raise EducationWorkbookSchemaError(
            "Current-student workbook contains no program rows"
        )
    return ProgramFieldDataset(
        year=2025,
        program_row_count=program_row_count,
        national_total=sum(counts.values()),
        counts_by_field_key=counts,
    )
