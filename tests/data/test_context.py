from pathlib import Path

from pipeline.context import load_context


PROJECT_ROOT = Path(__file__).resolve().parents[2]
CONTEXT_WORKBOOK = PROJECT_ROOT / "public/data/source/higher-education.xls"


def test_load_context_uses_national_total_rows_for_every_supported_year() -> None:
    context = load_context(CONTEXT_WORKBOOK)

    assert tuple(item.year for item in context) == tuple(range(2000, 2026))
    assert tuple(item.academic_year for item in context) == tuple(
        f"{year}/{year + 1}" for year in range(2000, 2026)
    )

    first = context[0]
    assert first.students == 137_908
    assert first.graduates == 20_558
    assert first.internal_teachers == 9_535
    assert first.internal_professors == 938
    assert first.population == 5_400_637
    assert first.appointments_per_million_residents == 19.44
    assert first.professors_per_100k_residents == 17.37

    last = context[-1]
    assert last.students == 148_189
    assert last.graduates == 37_627
    assert last.internal_teachers == 9_296
    assert last.internal_professors == 1_627
    assert last.population == 5_413_600
    assert last.appointments_per_million_residents == 10.16
    assert last.professors_per_100k_residents == 30.05


def test_student_total_includes_each_cvti_student_category_exactly_once() -> None:
    context_by_year = {item.year: item for item in load_context(CONTEXT_WORKBOOK)}

    assert context_by_year[2000].students == 93_587 + 34_982 + 1_560 + 7_779
    assert context_by_year[2025].students == 89_953 + 26_265 + 25_591 + 6_380


def test_graduate_total_includes_each_cvti_graduate_category_exactly_once() -> None:
    context_by_year = {item.year: item for item in load_context(CONTEXT_WORKBOOK)}

    assert context_by_year[2000].graduates == 14_570 + 5_327 + 232 + 429
    assert context_by_year[2025].graduates == 25_628 + 6_806 + 3_972 + 1_221


def test_context_rates_use_national_calendar_year_appointment_counts() -> None:
    context_by_year = {item.year: item for item in load_context(CONTEXT_WORKBOOK)}

    assert context_by_year[2000].appointments == 105
    assert context_by_year[2000].appointments_per_1k_graduates == 5.11
    assert context_by_year[2000].graduates_per_appointment == 195.79
    assert context_by_year[2007].appointments == 46
    assert context_by_year[2007].appointments_per_10k_students == 2.04
    assert context_by_year[2023].appointments == 112
    assert context_by_year[2023].appointments_per_10k_students == 8.13
    assert context_by_year[2025].appointments_per_100_professors == 3.38
    assert context_by_year[2000].professor_share == 9.8
    assert context_by_year[2025].professor_share == 17.5
    assert 2026 not in context_by_year


def test_graduates_per_appointment_is_null_when_no_appointments_exist() -> None:
    context = load_context(CONTEXT_WORKBOOK, appointments=())

    assert all(item.appointments == 0 for item in context)
    assert all(item.graduates_per_appointment is None for item in context)
