import hashlib
import json
from collections import Counter
from pathlib import Path

from pipeline.build import build_atlas


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def test_build_is_byte_deterministic_and_serializes_public_contract(tmp_path: Path) -> None:
    first_output = tmp_path / "first" / "atlas.json"
    second_output = tmp_path / "second" / "atlas.json"

    first_payload = build_atlas(first_output)
    second_payload = build_atlas(second_output)
    first_bytes = first_output.read_bytes()
    second_bytes = second_output.read_bytes()

    assert hashlib.sha256(first_bytes).hexdigest() == hashlib.sha256(
        second_bytes
    ).hexdigest()
    assert first_bytes == second_bytes
    assert first_bytes.endswith(b"\n")
    assert b"Zuzana \xc4\x8caputov\xc3\xa1" in first_bytes
    assert first_payload == second_payload == json.loads(first_bytes)

    assert first_payload["metadata"] == {
        "analyticalAppointmentCount": 2_378,
        "appointmentDateMax": "2026-06-03",
        "appointmentDateMin": "2000-02-22",
        "ceremonyCount": 67,
        "duplicateSourceRowCount": 41,
        "sourceRowCount": 2_419,
    }
    assert len(first_payload["records"]) == 2_378
    assert len(first_payload["institutions"]) == 22
    assert len(first_payload["presidents"]) == 5
    assert len(first_payload["context"]) == 26
    assert first_payload["geography"]["geometry"]["type"] in {
        "Polygon",
        "MultiPolygon",
    }
    assert first_payload["geography"]["properties"]["sourceUrl"].endswith(
        "ne_10m_admin_0_countries.geojson"
    )
    assert first_payload["geography"]["properties"]["license"] == "Public domain"


def test_generated_facts_match_reviewed_pinned_source_findings(tmp_path: Path) -> None:
    payload = build_atlas(tmp_path / "atlas.json")

    assert payload["editorialFacts"] == {
        "appointmentRateMaximum": {
            "appointments": 112,
            "appointmentsPer10kStudents": 8.13,
            "students": 137_680,
            "year": 2023,
        },
        "largestCeremony": {
            "appointedOn": "2011-01-24",
            "appointments": 108,
        },
        "studentPeak": {
            "academicYear": "2008/2009",
            "students": 230_519,
            "year": 2008,
        },
    }


def test_context_keeps_national_numerators_independent_of_record_filters(
    tmp_path: Path,
) -> None:
    payload = build_atlas(tmp_path / "atlas.json")
    records_2023 = [
        record for record in payload["records"] if record["appointedOn"][:4] == "2023"
    ]
    uniba_2023 = [
        record for record in records_2023 if record["institutionId"] == "uniba"
    ]
    context_by_year = {item["year"]: item for item in payload["context"]}

    assert len(records_2023) == context_by_year[2023]["appointments"] == 112
    assert len(uniba_2023) != context_by_year[2023]["appointments"]
    assert context_by_year[2023]["appointmentsPer10kStudents"] == 8.13
    assert 2026 not in context_by_year
    assert any(record["appointedOn"].startswith("2026-") for record in payload["records"])


def test_records_are_sorted_by_date_then_display_surname_then_source_row(
    tmp_path: Path,
) -> None:
    payload = build_atlas(tmp_path / "atlas.json")
    records = payload["records"]

    assert [record["appointedOn"] for record in records] == sorted(
        (record["appointedOn"] for record in records), reverse=True
    )
    latest_rows = [
        record["sourceVariants"][0]["rowNumber"]
        for record in records
        if record["appointedOn"] == "2026-06-03"
    ]
    assert latest_rows == [
        2391,
        2397,
        2392,
        2394,
        2395,
        2396,
        2398,
        2399,
        2400,
        2401,
        2402,
        2403,
        2404,
        2405,
        2406,
        2407,
        2408,
        2409,
        2410,
        2411,
        2412,
        2413,
        2414,
        2415,
        2416,
        2417,
        2418,
        2419,
        2420,
        2393,
    ]
    assert Counter(
        record["sourceVariants"][0]["rowNumber"] for record in records
    ).total() == 2_378
