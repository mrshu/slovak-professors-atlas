from __future__ import annotations

from collections import Counter
from collections.abc import Iterable
from decimal import Decimal, ROUND_HALF_UP
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import xlrd

from pipeline.models import Appointment
from pipeline.professors import load_appointments
from pipeline.population import load_population
from pipeline.text import normalize_display


TEACHERS_SHEET = "Učitelia VŠ"
STUDENTS_SHEET = "Študujúci, absolventi VŠ"
EXPECTED_SHEETS = [TEACHERS_SHEET, STUDENTS_SHEET]
CONTEXT_YEARS = tuple(range(2000, 2026))

_PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PROFESSORS_PATH = _PROJECT_ROOT / "public/data/source/professors.xls"
DEFAULT_POPULATION_PATH = _PROJECT_ROOT / "public/data/source/population.json"

_TEACHERS_HEADERS = (
    ("Vysoké školy", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""),
    ("", "", "", "", "Učitelia interní 5/", "", "", "", "", "", "", "", "", "", "Učitelia", ""),
    ("Rok", "", "Počet", "Počet", "", "", "v tom", "", "", "", "", "", "", "", "externí 5/", ""),
    ("", "", "škôl", "fakúlt", "spolu", "z toho", "profesori", "", "docenti", "", "odborní asistenti", "", "ostatní", "", "spolu", "z toho"),
    ("", "", "4/", "", "", "ženy", "spolu", "ženy", "spolu", "ženy", "spolu", "ženy", "spolu", "ženy", "", "ženy"),
)
_STUDENTS_HEADERS = (
    ("Vysoké školy", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""),
    ("", "", "Počet študujúcich v štúdiu", "", "", "", "", "", "", "", "Počet absolventov za kalendárny rok v štúdiu", "", "", "", "", "", "", ""),
    ("Rok", "", "dennom", "", "popri zamestnaní", "", "cudzinci", "", "doktorandskom 3/", "", "dennom", "", "popri zamestnaní", "", "cudzinci", "", "doktorandskom 3/", ""),
    ("", "", "", "", "(externé)", "", "(v dennom štúdiu)", "", " (postgraduálnom)", "", "", "", "(externé)", "", "(v dennom štúdiu)", "", " (postgraduálnom)", ""),
    ("", "", "spolu", "ženy", "spolu", "ženy", "spolu", "ženy", "spolu", "ženy", "spolu", "ženy", "spolu", "ženy", "spolu", "ženy", "spolu", "ženy"),
)
_STUDENT_TOTAL_COLUMNS = (2, 4, 6, 8)
_GRADUATE_TOTAL_COLUMNS = (10, 12, 14, 16)


class ContextDataError(ValueError):
    """Raised when the official context workbook no longer matches its contract."""


@dataclass(frozen=True, slots=True)
class ContextYear:
    year: int
    academic_year: str
    students: int
    graduates: int
    internal_teachers: int
    internal_professors: int
    appointments: int
    population: int
    appointments_per_million_residents: float
    professors_per_100k_residents: float
    appointments_per_1k_graduates: float
    graduates_per_appointment: float | None
    appointments_per_10k_students: float
    appointments_per_1k_teachers: float
    appointments_per_100_professors: float
    professor_share: float


def _validate_workbook(workbook: Any) -> tuple[Any, Any]:
    actual_sheets = workbook.sheet_names()
    if actual_sheets != EXPECTED_SHEETS:
        raise ContextDataError(
            f"Context workbook sheets changed: expected {EXPECTED_SHEETS!r}, "
            f"got {actual_sheets!r}"
        )
    teachers = workbook.sheet_by_name(TEACHERS_SHEET)
    students = workbook.sheet_by_name(STUDENTS_SHEET)
    _validate_headers(teachers, _TEACHERS_HEADERS)
    _validate_headers(students, _STUDENTS_HEADERS)
    return teachers, students


def _validate_headers(sheet: Any, expected: tuple[tuple[object, ...], ...]) -> None:
    if sheet.nrows < len(expected):
        raise ContextDataError(
            f"Sheet {sheet.name!r} has {sheet.nrows} rows; expected header rows"
        )
    for row_index, expected_row in enumerate(expected):
        actual_row = tuple(sheet.row_values(row_index))
        if actual_row != expected_row:
            raise ContextDataError(
                f"Sheet {sheet.name!r} header row {row_index + 1} changed: "
                f"expected {expected_row!r}, got {actual_row!r}"
            )


def _source_year(value: object, *, sheet_name: str, row_number: int) -> int | None:
    if value == "":
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        if normalize_display(value) == "Poznámka":
            return None
        raise ContextDataError(
            f"Sheet {sheet_name!r} row {row_number} has invalid year {value!r}"
        )
    year = int(value)
    if value != year:
        raise ContextDataError(
            f"Sheet {sheet_name!r} row {row_number} has non-integral year {value!r}"
        )
    return year


def _source_integer(
    value: object, *, sheet_name: str, row_number: int, column_number: int
) -> int:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ContextDataError(
            f"Sheet {sheet_name!r} row {row_number}, column {column_number} "
            f"must be numeric, got {value!r}"
        )
    result = int(value)
    if value != result or result < 0:
        raise ContextDataError(
            f"Sheet {sheet_name!r} row {row_number}, column {column_number} "
            f"must be a non-negative integer, got {value!r}"
        )
    return result


def _read_total_rows(
    sheet: Any, value_columns: tuple[int, ...]
) -> dict[int, tuple[int, ...]]:
    totals: dict[int, tuple[int, ...]] = {}
    current_year: int | None = None
    for row_index in range(len(_TEACHERS_HEADERS), sheet.nrows):
        row_number = row_index + 1
        row = sheet.row_values(row_index)
        parsed_year = _source_year(
            row[0], sheet_name=sheet.name, row_number=row_number
        )
        if parsed_year is not None:
            current_year = parsed_year
        if normalize_display(row[1]) != "spolu":
            continue
        if current_year is None:
            raise ContextDataError(
                f"Sheet {sheet.name!r} row {row_number} has a total without a year"
            )
        if current_year not in CONTEXT_YEARS:
            continue
        if current_year in totals:
            raise ContextDataError(
                f"Sheet {sheet.name!r} repeats the total for {current_year}"
            )
        totals[current_year] = tuple(
            _source_integer(
                row[column],
                sheet_name=sheet.name,
                row_number=row_number,
                column_number=column + 1,
            )
            for column in value_columns
        )

    missing = sorted(set(CONTEXT_YEARS) - totals.keys())
    if missing:
        raise ContextDataError(
            f"Sheet {sheet.name!r} is missing total rows for years {missing!r}"
        )
    return totals

def _rounded_rate(numerator: int, scale: int, denominator: int) -> float:
    value = Decimal(numerator * scale) / Decimal(denominator)
    return float(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))



def load_context(
    path: Path,
    *,
    population_path: Path = DEFAULT_POPULATION_PATH,
    appointments: Iterable[Appointment] | None = None,
) -> tuple[ContextYear, ...]:
    """Load national CVTI stocks and annual graduate/appointment flows."""
    workbook = xlrd.open_workbook(str(path))
    teachers_sheet, students_sheet = _validate_workbook(workbook)
    teacher_totals = _read_total_rows(teachers_sheet, (4, 6))
    student_and_graduate_components = _read_total_rows(
        students_sheet, _STUDENT_TOTAL_COLUMNS + _GRADUATE_TOTAL_COLUMNS
    )
    population_by_year = load_population(population_path)

    if appointments is None:
        appointments = load_appointments(DEFAULT_PROFESSORS_PATH).appointments
    appointments_by_year = Counter(item.appointed_on.year for item in appointments)

    context: list[ContextYear] = []
    for year in CONTEXT_YEARS:
        internal_teachers, internal_professors = teacher_totals[year]
        components = student_and_graduate_components[year]
        students = sum(components[: len(_STUDENT_TOTAL_COLUMNS)])
        graduates = sum(components[len(_STUDENT_TOTAL_COLUMNS) :])
        appointment_count = appointments_by_year[year]
        population = population_by_year[year]
        context.append(
            ContextYear(
                year=year,
                academic_year=f"{year}/{year + 1}",
                students=students,
                graduates=graduates,
                internal_teachers=internal_teachers,
                internal_professors=internal_professors,
                appointments=appointment_count,
                population=population,
                appointments_per_million_residents=_rounded_rate(
                    appointment_count, 1_000_000, population
                ),
                professors_per_100k_residents=_rounded_rate(
                    internal_professors, 100_000, population
                ),
                appointments_per_1k_graduates=round(
                    appointment_count * 1_000 / graduates, 2
                ),
                graduates_per_appointment=(
                    round(graduates / appointment_count, 2)
                    if appointment_count
                    else None
                ),
                appointments_per_10k_students=round(
                    appointment_count * 10_000 / students, 2
                ),
                appointments_per_1k_teachers=round(
                    appointment_count * 1_000 / internal_teachers, 2
                ),
                appointments_per_100_professors=round(
                    appointment_count * 100 / internal_professors, 2
                ),
                professor_share=round(
                    internal_professors * 100 / internal_teachers, 1
                ),
            )
        )
    return tuple(context)
