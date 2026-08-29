from __future__ import annotations

from copy import deepcopy
from datetime import date
from pathlib import Path
from types import SimpleNamespace

import pytest

import pipeline.graduates as graduates_module
from pipeline.graduates import (
    GraduateFieldDataset,
    GraduateWorkbookSchemaError,
    build_field_graduate_comparison,
    load_graduates_by_field,
)
from pipeline.professors import load_appointments


PROJECT_ROOT = Path(__file__).resolve().parents[2]
GRADUATES_WORKBOOK = PROJECT_ROOT / "public/data/source/graduates-by-field-2025.xls"
PROFESSORS_WORKBOOK = PROJECT_ROOT / "public/data/source/professors.xls"
SHEET_TITLES = {
    "Tab2v": "Absolventi vysokých škôl k 31. 12. 2025 - verejné",
    "Tab2s": "Absolventi vysokých škôl k 31. 12. 2025 - súkromné",
    "Tab2š": "Absolventi vysokých škôl k 31. 12. 2025 - štátne",
}
COMMON_HEADER_ROWS = [
    [
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
    ],
    [
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
    ],
    [
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
    ],
    [
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
    ],
    [
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
    ],
    [
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
    ],
]


class FakeSheet:
    def __init__(self, rows: list[list[object]]) -> None:
        self.rows = rows
        self.nrows = len(rows)
        self.ncols = max(len(row) for row in rows)

    def row_values(
        self, rowx: int, start_colx: int = 0, end_colx: int | None = None
    ) -> list[object]:
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


def program_row(label: str, totals: tuple[int, int, int, int, int, int, int]) -> list[object]:
    row: list[object] = [f"1000R00/        {label}", ""]
    for total in totals:
        row.extend([float(total), 1_000.0])
    return row


def workbook_with_rows(rows_by_sheet: dict[str, list[list[object]]]) -> FakeWorkbook:
    sheets: dict[str, FakeSheet] = {}
    for sheet_name, title in SHEET_TITLES.items():
        title_row: list[object] = [title, *([""] * 15)]
        rows = [title_row, *deepcopy(COMMON_HEADER_ROWS), *rows_by_sheet[sheet_name]]
        sheets[sheet_name] = FakeSheet(rows)
    return FakeWorkbook(sheets)


def source_metadata() -> dict[str, str]:
    return {
        "url": "https://example.test/graduates.xls",
        "catalogUrl": "https://example.test/catalog",
        "sha256": "a" * 64,
        "retrievedOn": "2026-08-29",
    }


def test_parser_sums_only_seven_spolu_columns_and_aggregates_normalized_labels(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    workbook = workbook_with_rows(
        {
            "Tab2v": [
                program_row("Právo", (1, 2, 3, 4, 5, 6, 7)),
                program_row(" právo ", (1, 1, 1, 1, 1, 1, 1)),
            ],
            "Tab2s": [program_row("PRÁVO", (1, 1, 1, 1, 1, 1, 1))],
            "Tab2š": [program_row("Iný odbor", (1, 0, 0, 0, 0, 0, 0))],
        }
    )
    monkeypatch.setattr(graduates_module.xlrd, "open_workbook", lambda _: workbook)

    dataset = load_graduates_by_field(Path("synthetic.xls"))

    assert dataset.year == 2025
    assert dataset.program_row_count == 4
    assert dataset.graduates_by_normalized_label == {"iny odbor": 1, "pravo": 42}


@pytest.mark.parametrize(
    ("row", "column", "replacement", "message"),
    [
        (0, 0, "Absolventi vysokých škôl k 31. 12. 2024 - verejné", "2025"),
        (5, 2, "celkom", "header"),
    ],
)
def test_parser_rejects_changed_year_or_header(
    monkeypatch: pytest.MonkeyPatch,
    row: int,
    column: int,
    replacement: str,
    message: str,
) -> None:
    workbook = workbook_with_rows({name: [] for name in SHEET_TITLES})
    workbook.sheets["Tab2v"].rows[row][column] = replacement
    monkeypatch.setattr(graduates_module.xlrd, "open_workbook", lambda _: workbook)

    with pytest.raises(GraduateWorkbookSchemaError, match=message):
        load_graduates_by_field(Path("changed-schema.xls"))


def test_parser_rejects_changed_sheet_set(monkeypatch: pytest.MonkeyPatch) -> None:
    workbook = workbook_with_rows({name: [] for name in SHEET_TITLES})
    del workbook.sheets["Tab2š"]
    monkeypatch.setattr(graduates_module.xlrd, "open_workbook", lambda _: workbook)

    with pytest.raises(GraduateWorkbookSchemaError, match="sheets"):
        load_graduates_by_field(Path("changed-sheets.xls"))


def test_parser_ignores_slash_rows_without_an_official_programme_code(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    non_programme_row: list[object] = ["summary/ Právo", ""]
    non_programme_row.extend([999.0, 999.0] * 7)
    workbook = workbook_with_rows(
        {
            "Tab2v": [
                non_programme_row,
                program_row("Právo", (1, 2, 3, 4, 5, 6, 7)),
            ],
            "Tab2s": [],
            "Tab2š": [],
        }
    )
    monkeypatch.setattr(graduates_module.xlrd, "open_workbook", lambda _: workbook)

    dataset = load_graduates_by_field(Path("coded-rows-only.xls"))

    assert dataset.program_row_count == 1
    assert dataset.graduates_by_normalized_label == {"pravo": 28}


@pytest.mark.parametrize("replacement", ["unknown", -1.0, 1.5])
def test_parser_rejects_non_integer_or_negative_spolu_totals(
    monkeypatch: pytest.MonkeyPatch, replacement: object
) -> None:
    row = program_row("Právo", (1, 2, 3, 4, 5, 6, 7))
    row[2] = replacement
    workbook = workbook_with_rows(
        {"Tab2v": [row], "Tab2s": [], "Tab2š": []}
    )
    monkeypatch.setattr(graduates_module.xlrd, "open_workbook", lambda _: workbook)

    with pytest.raises(GraduateWorkbookSchemaError, match="graduate total"):
        load_graduates_by_field(Path("invalid-total.xls"))


def test_parser_rejects_coded_row_without_a_label(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    malformed_row: list[object] = ["1000R00/ ", ""]
    malformed_row.extend([0.0, 0.0] * 7)
    workbook = workbook_with_rows(
        {"Tab2v": [malformed_row], "Tab2s": [], "Tab2š": []}
    )
    monkeypatch.setattr(graduates_module.xlrd, "open_workbook", lambda _: workbook)

    with pytest.raises(GraduateWorkbookSchemaError, match="no label"):
        load_graduates_by_field(Path("missing-label.xls"))


def test_exact_normalized_equality_does_not_infer_taxonomy_or_match_substrings() -> None:
    appointments = (
        SimpleNamespace(field=" PRÁVO ", appointed_on=date(2025, 1, 1)),
        SimpleNamespace(field="Právo", appointed_on=date(2025, 1, 2)),
        SimpleNamespace(field="občianske právo", appointed_on=date(2025, 2, 1)),
        SimpleNamespace(field="Právo", appointed_on=date(2024, 1, 1)),
    )
    graduate_fields = GraduateFieldDataset(
        year=2025,
        program_row_count=1,
        graduates_by_normalized_label={"pravo": 12},
    )

    comparison = build_field_graduate_comparison(
        appointments, graduate_fields, source_metadata()
    )

    assert comparison["appointmentCount"] == 3
    assert comparison["matchedAppointmentCount"] == 2
    assert comparison["matchedAppointmentShare"] == 66.67
    assert comparison["distinctFieldCount"] == 2
    assert comparison["matchedDistinctFieldCount"] == 1
    assert comparison["rows"] == [
        {
            "field": "PRÁVO",
            "appointmentCount": 2,
            "graduateCount": 12,
            "graduatesPerAppointment": 6.0,
            "matchStatus": "exact",
        },
        {
            "field": "občianske právo",
            "appointmentCount": 1,
            "graduateCount": None,
            "graduatesPerAppointment": None,
            "matchStatus": "unmatched",
        },
    ]


def test_pinned_workbook_and_appointments_produce_reviewed_2025_coverage() -> None:
    graduate_fields = load_graduates_by_field(GRADUATES_WORKBOOK)
    appointments = load_appointments(PROFESSORS_WORKBOOK).appointments
    comparison = build_field_graduate_comparison(
        appointments, graduate_fields, source_metadata()
    )

    assert graduate_fields.year == 2025
    assert graduate_fields.program_row_count == 1_723
    assert len(graduate_fields.graduates_by_normalized_label) == 1_302
    assert sum(graduate_fields.graduates_by_normalized_label.values()) == 37_627
    assert graduate_fields.graduates_by_normalized_label["psychologia"] == 1_146
    assert (
        graduate_fields.graduates_by_normalized_label[
            "strojarske technologie a materialy"
        ]
        == 17
    )

    assert comparison["schemaVersion"] == 1
    assert comparison["year"] == 2025
    assert comparison["appointmentCount"] == 55
    assert comparison["matchedAppointmentCount"] == 47
    assert comparison["matchedAppointmentShare"] == 85.45
    assert comparison["distinctFieldCount"] == 46
    assert comparison["matchedDistinctFieldCount"] == 39
    assert len(comparison["rows"]) == 46

    rows = {row["field"]: row for row in comparison["rows"]}
    assert rows["strojárske technológie a materiály"] == {
        "field": "strojárske technológie a materiály",
        "appointmentCount": 4,
        "graduateCount": 17,
        "graduatesPerAppointment": 4.25,
        "matchStatus": "exact",
    }
    assert rows["psychológia"]["graduateCount"] == 1_146
    assert rows["získavanie a spracovanie zemských zdrojov"] == {
        "field": "získavanie a spracovanie zemských zdrojov",
        "appointmentCount": 2,
        "graduateCount": None,
        "graduatesPerAppointment": None,
        "matchStatus": "unmatched",
    }
    assert {
        row["field"]
        for row in comparison["rows"]
        if row["matchStatus"] == "unmatched"
    } == {
        "cudzie jazyky a kultúry",
        "doprava",
        "mikrobiológia",
        "otorinolaryngológia",
        "reštaurovanie",
        "slovanské jazyky a literatúry",
        "získavanie a spracovanie zemských zdrojov",
    }
