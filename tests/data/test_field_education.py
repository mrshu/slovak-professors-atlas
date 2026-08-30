from __future__ import annotations

from copy import deepcopy
from pathlib import Path
from types import SimpleNamespace

import pytest

import pipeline.field_education as field_education
from pipeline.context import load_context
from pipeline.field_education import (
    EducationWorkbookSchemaError,
    ProgramFieldDataset,
    build_field_education_comparison,
    graduate_program_label,
    load_current_student_fields,
    load_graduate_fields,
)
from pipeline.fields import build_field_catalog
from pipeline.professors import load_appointments
from pipeline.text import normalize_search


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SOURCE_ROOT = PROJECT_ROOT / "public/data/source"
GRADUATE_SHEETS = ("Tab2v", "Tab2s", "Tab2š")
STUDENT_SHEETS = (
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
STUDENT_PROGRAM_SHEETS = ("Tab5v", "Tab12v", "Tab5s", "Tab12s", "Tab5š", "Tab12š")

GRADUATE_HEADERS = [
    ["Študijný odbor", "", "Diplom obdržali absolventi I. a II. stupňa ", "", "", "", "", "", "Diplom obdržali absolventi III. stupňa ", "", "", "", "", "", "", ""],
    ["", "", "denná forma", "", "", "", "externá\nforma ", "", "denná forma", "", "", "", "externá\nforma ", "", "externých", ""],
    ["", "", "slovenského", "", "iného štát.", "", "", "", "slovenského", "", "iného štát.", "", "", "", "vzdelávacích", ""],
    ["Študijný program", "", "štát. občian.", "", "občianstva", "", "", "", "štát. občian.", "", "občianstva", "", "", "", "inštitúcií", ""],
    ["", "", "spolu", "z toho", "spolu", "z toho", "spolu", "z toho", "spolu", "z toho", "spolu", "z toho", "spolu", "z toho", "spolu", "z toho"],
    ["", "", "", "ženy", "", "ženy", "", "ženy", "", "ženy", "", "ženy", "", "ženy", "", "ženy"],
]
STUDENT_HEADERS = [
    ["Študijný odbor, študijný program", "", "Dĺžka", "Študujúci slovenského štátneho občianstva", "", "", "", "", "", "", "", "", "Študujúci", ""],
    ["", "", "", "spolu", "", "v akademickom roku", "", "", "", "", "", "", "iného štátneho", ""],
    ["", "", "", "", "z toho", "1.", "", "2.", "3.", "4.", "5.", "6. a", "občianstva", ""],
    ["", "", "", "", "ženy", "spolu", "novo-", "", "", "", "", "", "spolu", "z toho"],
    ["", "", "", "", "", "", "prijatí", "", "", "", "", "vyššom", "", "ženy"],
]


class FakeSheet:
    def __init__(self, rows: list[list[object]]) -> None:
        self.rows = rows
        self.nrows = len(rows)
        self.ncols = max(len(row) for row in rows)

    def row_values(self, rowx: int, start_colx: int = 0, end_colx: int | None = None) -> list[object]:
        return self.rows[rowx][start_colx:end_colx]

    def cell_value(self, rowx: int, colx: int) -> object:
        return self.rows[rowx][colx]


class FakeWorkbook:
    def __init__(self, sheets: dict[str, FakeSheet]) -> None:
        self.sheets = sheets

    def sheet_names(self) -> list[str]:
        return list(self.sheets)

    def sheet_by_name(self, name: str) -> FakeSheet:
        return self.sheets[name]


def catalog() -> SimpleNamespace:
    return SimpleNamespace(key_for=lambda label: normalize_search(label))


def graduate_row(cell: str, totals: tuple[object, ...]) -> list[object]:
    row: list[object] = [cell, ""]
    for total in totals:
        row.extend([total, 10_000.0])
    return row


def graduate_workbook(year: int, rows: dict[str, list[list[object]]]) -> FakeWorkbook:
    ownership = {"Tab2v": "verejné", "Tab2s": "súkromné", "Tab2š": "štátne"}
    return FakeWorkbook(
        {
            name: FakeSheet(
                [[f"Absolventi vysokých škôl k 31. 12. {year} - {ownership[name]}", *([""] * 15)], *deepcopy(GRADUATE_HEADERS), *rows[name]]
            )
            for name in GRADUATE_SHEETS
        }
    )


def student_workbook(program_row: list[object]) -> FakeWorkbook:
    ownership = {"v": "verejné", "s": "súkromné", "š": "štátne"}
    sheets: dict[str, FakeSheet] = {}
    for name in STUDENT_SHEETS:
        title = f"Vysoké školy k 31. 10. 2025 - {ownership[name[-1]]}"
        if name in STUDENT_PROGRAM_SHEETS:
            form = "Denná forma" if name.startswith("Tab5") else "Externá forma"
            title_row: list[object] = [title, *([""] * 10), form, "", ""]
            rows = [title_row, *deepcopy(STUDENT_HEADERS), deepcopy(program_row)]
        else:
            rows = [[title, *([""] * 12)]]
        sheets[name] = FakeSheet(rows)
    return FakeWorkbook(sheets)


@pytest.mark.parametrize(
    ("year", "cell", "expected"),
    [
        (2009, "1113700 matematika /Bc/", "matematika"),
        (2013, "1113R00 matematika", "matematika"),
        (2023, "1113R00/        matematika", "matematika"),
        (2009, "1113700 etika, právo a politika /Bc/", "etika, právo a politika"),
    ],
)
def test_graduate_program_row_eras(year: int, cell: str, expected: str) -> None:
    assert graduate_program_label(cell, year) == expected


def test_graduate_parser_sums_total_columns_once_across_sheets(monkeypatch: pytest.MonkeyPatch) -> None:
    rows = {
        "Tab2v": [graduate_row("1113R00 matematika", (1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0))],
        "Tab2s": [graduate_row("1113R01 Matematika", (1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0))],
        "Tab2š": [graduate_row("1113R02 matematika", (2.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0))],
    }
    monkeypatch.setattr(field_education.xlrd, "open_workbook", lambda _: graduate_workbook(2013, rows))

    dataset = load_graduate_fields(Path("synthetic.xls"), 2013, catalog())

    assert dataset.program_row_count == 3
    assert dataset.national_total == 37
    assert dataset.counts_by_field_key == {"matematika": 37}


@pytest.mark.parametrize("invalid", ["", -1.0, 1.5])
def test_graduate_parser_rejects_missing_negative_or_fractional_totals(
    monkeypatch: pytest.MonkeyPatch, invalid: object
) -> None:
    rows = {name: [] for name in GRADUATE_SHEETS}
    rows["Tab2v"] = [graduate_row("1113R00 matematika", (invalid, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0))]
    monkeypatch.setattr(field_education.xlrd, "open_workbook", lambda _: graduate_workbook(2013, rows))

    with pytest.raises(EducationWorkbookSchemaError, match="non-negative integer"):
        load_graduate_fields(Path("invalid.xls"), 2013, catalog())


def test_current_student_parser_sums_only_nationality_totals(monkeypatch: pytest.MonkeyPatch) -> None:
    row: list[object] = ["1113R00/        matematika", "", "", 48.0, 9_999.0, 8_888.0, 7_777.0, 6_666.0, 5_555.0, 4_444.0, 3_333.0, 2_222.0, 7.0, 1_111.0]
    monkeypatch.setattr(field_education.xlrd, "open_workbook", lambda _: student_workbook(row))

    dataset = load_current_student_fields(Path("students.xls"), catalog())

    assert dataset.program_row_count == 6
    assert dataset.national_total == 330
    assert dataset.counts_by_field_key == {"matematika": 330}


def test_comparison_preserves_observed_zeroes_and_missing_labels() -> None:
    graduate_datasets = [
        ProgramFieldDataset(
            year=year,
            program_row_count=1,
            national_total=0,
            counts_by_field_key={"observed": 0},
        )
        for year in range(2009, 2026)
    ]
    current_students = ProgramFieldDataset(
        year=2025,
        program_row_count=1,
        national_total=0,
        counts_by_field_key={"observed": 0},
    )
    sources = [{"year": year} for year in range(2009, 2026)]
    context = [
        SimpleNamespace(year=year, graduates=0, students=0)
        for year in range(2009, 2026)
    ]

    comparison = build_field_education_comparison(
        graduate_datasets,
        current_students,
        SimpleNamespace(labels={"missing": "Missing", "observed": "Observed"}),
        context,
        sources,
        {"year": 2025},
        catalog_url="https://example.test/catalog",
    )

    rows = {row["fieldKey"]: row for row in comparison["rows"]}
    assert rows["observed"]["graduateCounts"] == [0] * 17
    assert rows["observed"]["currentStudentCount"] == 0
    assert rows["missing"]["graduateCounts"] == [None] * 17
    assert rows["missing"]["currentStudentCount"] is None


def test_pinned_workbooks_reconcile_with_national_context() -> None:
    professor_dataset = load_appointments(SOURCE_ROOT / "professors.xls")
    reviewed_catalog = build_field_catalog(professor_dataset.appointments)
    context = {
        item.year: item
        for item in load_context(
            SOURCE_ROOT / "higher-education.xls",
            appointments=professor_dataset.appointments,
        )
    }

    graduates_by_year = {
        year: load_graduate_fields(
            SOURCE_ROOT / f"graduates-by-field/{year}.xls",
            year,
            reviewed_catalog,
        )
        for year in range(2009, 2026)
    }
    for year, dataset in graduates_by_year.items():
        assert dataset.national_total == context[year].graduates

    graduates_2025 = graduates_by_year[2025]
    assert graduates_2025.program_row_count == 1_723
    assert graduates_2025.national_total == 37_627
    assert graduates_2025.counts_by_field_key["psychologia"] == 1_146

    current_students = load_current_student_fields(
        SOURCE_ROOT / "current-students-by-field-2025.xls",
        reviewed_catalog,
    )
    assert current_students.national_total == context[2025].students == 148_189
    assert current_students.counts_by_field_key["socialna praca"] == 4_505
    assert current_students.counts_by_field_key["verejne zdravotnictvo"] == 785
