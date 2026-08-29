import hashlib
import json
from pathlib import Path

import pytest
import xlrd
from xlrd.xldate import xldate_from_date_tuple

from pipeline.professors import (
    PresidentAssignmentError,
    UnreviewedDuplicateError,
    WorkbookSchemaError,
    load_appointments,
)
from pipeline.text import normalize_display, normalize_search


WORKBOOK_PATH = Path("public/data/source/professors.xls")
APPOINTMENT_SHEET = "Zoznam vymenovaných profesorov"
INSTITUTION_SHEET = "Zoznam skratiek vysokých škôl"
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


class FakeSheet:
    def __init__(self, rows: list[list[object]]) -> None:
        self._rows = rows
        self.nrows = len(rows)
        self.ncols = len(rows[0]) if rows else 0

    def row_values(self, index: int) -> list[object]:
        return self._rows[index]


class FakeBook:
    datemode = 0

    def __init__(self, sheets: list[tuple[str, FakeSheet]]) -> None:
        self._sheets = dict(sheets)
        self._names = [name for name, _ in sheets]

    def sheet_names(self) -> list[str]:
        return self._names

    def sheet_by_name(self, name: str) -> FakeSheet:
        return self._sheets[name]


def official_institution_rows() -> list[list[object]]:
    workbook = xlrd.open_workbook(WORKBOOK_PATH)
    sheet = workbook.sheet_by_name(INSTITUTION_SHEET)
    return [sheet.row_values(index) for index in range(sheet.nrows)]


def synthetic_book(*rows: list[object]) -> FakeBook:
    return FakeBook(
        [
            (APPOINTMENT_SHEET, FakeSheet([APPOINTMENT_HEADERS, *rows])),
            (INSTITUTION_SHEET, FakeSheet(official_institution_rows())),
        ]
    )


def empty_resolutions(tmp_path: Path) -> Path:
    path = tmp_path / "duplicate-resolutions.json"
    path.write_text("[]\n", encoding="utf-8")
    return path


def test_pinned_workbook_reconciles_to_reviewed_appointments() -> None:
    dataset = load_appointments(WORKBOOK_PATH)

    assert dataset.source_row_count == 2419
    assert dataset.duplicate_source_row_count == 41
    assert len(dataset.appointments) == 2378
    assert dataset.date_min.isoformat() == "2000-02-22"
    assert dataset.date_max.isoformat() == "2026-06-03"
    assert len({item.appointed_on for item in dataset.appointments}) == 67

    institution_ids = {institution.id for institution in dataset.institutions}
    assert len(institution_ids) == 22
    assert {item.institution_id for item in dataset.appointments} == institution_ids
    assert all(item.president_id for item in dataset.appointments)
    assert {item.president_id for item in dataset.appointments} == {
        president.id for president in dataset.presidents
    }


def test_workbook_dates_and_stable_ids_are_converted_deterministically() -> None:
    dataset = load_appointments(WORKBOOK_PATH)
    first_source_row = next(
        item for item in dataset.appointments if item.source_variants[0].row_number == 2
    )

    assert first_source_row.name == "István Ajtonyi"
    assert first_source_row.appointed_on.isoformat() == "2000-12-05"
    identity = (
        f"{normalize_search(first_source_row.name)}|"
        f"{first_source_row.appointed_on.isoformat()}"
    )
    assert first_source_row.id == hashlib.sha256(identity.encode("utf-8")).hexdigest()[:12]


def test_reviewed_duplicate_keeps_primary_and_all_raw_source_variants() -> None:
    dataset = load_appointments(WORKBOOK_PATH)
    appointment = next(
        item for item in dataset.appointments if item.source_variants[0].row_number == 889
    )

    assert appointment.faculty == "Filozofická fakulta"
    assert [variant.row_number for variant in appointment.source_variants] == [889, 1008]
    assert appointment.source_variants[0].titles_before == "doc. ThDr.,PaedDr., PhDr."
    assert appointment.source_variants[1].titles_before == "doc. ThDr.,PaedDr.,PhDr."
    assert appointment.source_variants[1].faculty == "Pedagogická fakulta"


def test_institution_metadata_covers_every_normalized_source_label() -> None:
    dataset = load_appointments(WORKBOOK_PATH)
    workbook = xlrd.open_workbook(WORKBOOK_PATH)
    source_sheet = workbook.sheet_by_name(APPOINTMENT_SHEET)
    source_labels = {
        normalize_display(source_sheet.row_values(index)[5])
        for index in range(1, source_sheet.nrows)
    }

    configured_labels = {
        label for institution in dataset.institutions for label in institution.source_labels
    }
    assert len(source_labels) == 32
    assert configured_labels == source_labels


@pytest.mark.parametrize(
    "sheet_names",
    [
        [INSTITUTION_SHEET, APPOINTMENT_SHEET],
        [APPOINTMENT_SHEET],
        [APPOINTMENT_SHEET, INSTITUTION_SHEET, "unexpected"],
    ],
)
def test_workbook_rejects_any_sheet_name_or_order_change(
    monkeypatch: pytest.MonkeyPatch, sheet_names: list[str]
) -> None:
    book = FakeBook([(name, FakeSheet([[]])) for name in sheet_names])
    monkeypatch.setattr(xlrd, "open_workbook", lambda _: book)

    with pytest.raises(WorkbookSchemaError, match="sheet names"):
        load_appointments(Path("changed.xls"))


def test_workbook_rejects_any_header_change(monkeypatch: pytest.MonkeyPatch) -> None:
    changed_headers = APPOINTMENT_HEADERS.copy()
    changed_headers[-1] = "Dátum vymenovania"
    book = FakeBook(
        [
            (APPOINTMENT_SHEET, FakeSheet([changed_headers])),
            (INSTITUTION_SHEET, FakeSheet([INSTITUTION_HEADERS])),
        ]
    )
    monkeypatch.setattr(xlrd, "open_workbook", lambda _: book)

    with pytest.raises(WorkbookSchemaError, match="headers"):
        load_appointments(Path("changed.xls"))


def test_unreviewed_same_name_and_date_collision_fails(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    appointment_date = xldate_from_date_tuple((2020, 1, 1), 0)
    first = [
        "doc.",
        "Ľubomír",
        "Šoltés",
        "PhD.",
        "Fakulta prvá",
        "UK v Bratislave",
        "história",
        appointment_date,
    ]
    second = [
        "doc.  ",
        "Lubomir",
        "Soltes",
        "PhD.",
        "Fakulta druhá",
        "UK v Bratislave",
        "história",
        appointment_date,
    ]
    book = synthetic_book(first, second)
    monkeypatch.setattr(xlrd, "open_workbook", lambda _: book)

    with pytest.raises(
        UnreviewedDuplicateError, match="lubomir soltes.*2020-01-01"
    ):
        load_appointments(
            Path("synthetic-collision.xls"),
            duplicate_resolutions_path=empty_resolutions(tmp_path),
        )


def test_appointment_must_map_to_exactly_one_presidential_term(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    appointment_date = xldate_from_date_tuple((2020, 1, 1), 0)
    row = [
        "doc.",
        "Jana",
        "Nováková",
        "",
        "Fakulta",
        "UK v Bratislave",
        "história",
        appointment_date,
    ]
    book = synthetic_book(row)
    monkeypatch.setattr(xlrd, "open_workbook", lambda _: book)
    presidents_path = tmp_path / "presidents.json"
    presidents_path.write_text(
        json.dumps(
            [
                {
                    "id": "first",
                    "name": "First President",
                    "from": "2019-01-01",
                    "to": "2021-01-01",
                },
                {
                    "id": "second",
                    "name": "Second President",
                    "from": "2019-06-01",
                    "to": "2020-06-01",
                },
            ]
        ),
        encoding="utf-8",
    )

    with pytest.raises(PresidentAssignmentError, match="exactly one"):
        load_appointments(
            Path("overlapping-terms.xls"),
            presidents_path=presidents_path,
            duplicate_resolutions_path=empty_resolutions(tmp_path),
        )
