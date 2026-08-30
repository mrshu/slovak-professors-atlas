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

    assert set(first_payload) == {
        "affiliations",
        "cities",
        "context",
        "editorialFacts",
        "fieldCatalog",
        "fieldEducationComparison",
        "geography",
        "institutions",
        "meta",
        "presidents",
        "records",
        "sources",
    }
    assert "metadata" not in first_payload
    assert first_payload["meta"] == {
        "analyticalAppointmentCount": 2_378,
        "appointmentDateMax": "2026-06-03",
        "appointmentDateMin": "2000-02-22",
        "ceremonyCount": 67,
        "duplicateSourceRowCount": 41,
        "schemaVersion": 1,
        "sourceRowCount": 2_419,
    }
    assert len(first_payload["records"]) == 2_378
    field_catalog = first_payload["fieldCatalog"]
    assert field_catalog["schemaVersion"] == 1
    assert len(field_catalog["aliases"]) == 13
    assert len(field_catalog["labels"]) == 416
    assert field_catalog["labels"]["verejne zdravotnictvo"] == "verejné zdravotníctvo"
    assert all(
        record["fieldKey"] in field_catalog["labels"]
        for record in first_payload["records"]
    )
    typo = next(
        record
        for record in first_payload["records"]
        if record["field"] == "verejné zravotníctvo"
    )
    assert typo["fieldKey"] == "verejne zdravotnictvo"
    assert typo["field"] == "verejné zravotníctvo"
    assert len(first_payload["institutions"]) == 22
    assert len(first_payload["presidents"]) == 5
    pellegrini = next(
        president
        for president in first_payload["presidents"]
        if president["id"] == "pellegrini"
    )
    assert (
        pellegrini["citationUrl"]
        == "https://www.prezident.sk/zivotopis-petra-pellegriniho"
    )
    assert len(first_payload["context"]) == 26
    assert first_payload["context"][0]["population"] == 5_400_637
    assert first_payload["context"][0]["appointmentsPerMillionResidents"] == 19.44
    assert first_payload["context"][0]["professorsPer100kResidents"] == 17.37
    assert first_payload["context"][-1]["population"] == 5_413_600
    assert first_payload["context"][-1]["appointmentsPerMillionResidents"] == 10.16
    assert first_payload["context"][-1]["professorsPer100kResidents"] == 30.05
    assert first_payload["geography"]["geometry"]["type"] in {
        "Polygon",
        "MultiPolygon",
    }
    assert first_payload["geography"]["properties"]["sourceUrl"].endswith(
        "ne_10m_admin_0_countries.geojson"
    )
    assert first_payload["geography"]["properties"]["license"] == "Public domain"

def test_build_resolves_workplace_locations_without_inheriting_ambiguous_seats(
    tmp_path: Path,
) -> None:
    payload = build_atlas(tmp_path / "atlas.json")
    records = payload["records"]
    affiliations = {item["id"]: item for item in payload["affiliations"]}
    counts = Counter(record["affiliationId"] for record in records)

    assert all(
        set(institution).isdisjoint({"city", "latitude", "longitude"})
        for institution in payload["institutions"]
    )
    assert counts["uniba-jlf-martin"] == 45
    assert counts["tuke-fvt-presov"] == 15
    assert counts["stuba-mtf-trnava"] == 35
    assert counts["stuba-fchpt-humenne"] == 1
    assert counts["euba-phf-kosice"] == 4
    assert counts["ku-tf-kosice"] == 25
    assert counts["ku-spisska-kapitula"] == 1
    assert counts["vszsp-unresolved"] == 76
    assert affiliations["vszsp-unresolved"]["status"] == "unresolved"
    assert affiliations["vszsp-unresolved"]["city"] is None
    assert affiliations["vszsp-unresolved"]["sourceUrl"].startswith("https://")

    cities = {city["name"]: city for city in payload["cities"]}
    assert "uniba-jlf-martin" in cities["Martin"]["affiliationIds"]
    assert "tuke-fvt-presov" in cities["Prešov"]["affiliationIds"]
    assert "stuba-mtf-trnava" in cities["Trnava"]["affiliationIds"]
    assert "stuba-fchpt-humenne" in cities["Humenné"]["affiliationIds"]
    assert "ku-spisska-kapitula" in cities["Spišské Podhradie"]["affiliationIds"]


def test_build_publishes_reconciled_field_education_comparison(
    tmp_path: Path,
) -> None:
    payload = build_atlas(tmp_path / "atlas.json")
    comparison = payload["fieldEducationComparison"]

    assert payload["meta"]["schemaVersion"] == 1
    assert set(payload["sources"]) == {
        "professors",
        "higher_education",
        "population",
    }
    assert comparison["schemaVersion"] == 2
    assert comparison["startYear"] == 2009
    assert comparison["endYear"] == 2025
    assert [item["year"] for item in comparison["graduateSources"]] == list(
        range(2009, 2026)
    )
    assert [item["year"] for item in comparison["years"]] == list(
        range(2009, 2026)
    )
    assert comparison["currentStudentsSource"]["year"] == 2025
    assert "fieldGraduateComparison" not in payload

    field_catalog = payload["fieldCatalog"]
    rows = {row["fieldKey"]: row for row in comparison["rows"]}
    assert len(rows) == len(field_catalog["labels"]) == 416
    assert all(len(row["graduateCounts"]) == 17 for row in rows.values())
    assert all(
        row["canonicalLabel"] == field_catalog["labels"][field_key]
        for field_key, row in rows.items()
    )
    assert any(
        value is None
        for row in rows.values()
        for value in row["graduateCounts"]
    )
    assert any(row["currentStudentCount"] is None for row in rows.values())

    social_work = rows["socialna praca"]
    assert sum(
        value for value in social_work["graduateCounts"] if value is not None
    ) == 62_122
    assert social_work["currentStudentCount"] == 4_505
    public_health = rows["verejne zdravotnictvo"]
    assert sum(
        value for value in public_health["graduateCounts"] if value is not None
    ) == 5_968
    assert public_health["currentStudentCount"] == 785

def test_generated_facts_match_reviewed_pinned_source_findings(tmp_path: Path) -> None:
    payload = build_atlas(tmp_path / "atlas.json")

    assert payload["editorialFacts"] == {
        "appointmentRateMaximum": {
            "appointments": 112,
            "appointmentsPer10kStudents": 8.13,
            "students": 137_680,
            "year": 2023,
        },
        "appointmentGraduateRateMaximum": {
            "appointments": 105,
            "appointmentsPer1kGraduates": 5.11,
            "graduates": 20_558,
            "graduatesPerAppointment": 195.79,
            "statementSk": (
                "V roku 2000 pripadlo 5,11 profesorských vymenovaní na "
                "1\u00a0000 absolventov, najviac v sledovanom období; oba "
                "údaje sú ročné toky."
            ),
            "year": 2000,
        },
        "appointmentProfessorStockRateMaximum": {
            "appointments": 117,
            "appointmentsPer100Professors": 11.5,
            "internalProfessors": 1_017,
            "statementSk": (
                "V roku 2001 pripadlo 11,5 profesorských vymenovaní na "
                "100 profesorov medzi internými učiteľmi; ide o porovnanie "
                "ročného toku so stavom, nie o zmenu počtu profesorov."
            ),
            "year": 2001,
        },
        "graduateThroughputPeak": {
            "graduates": 73_970,
            "statementSk": (
                "V roku 2010 evidovalo CVTI 73\u00a0970 absolventov I., II. "
                "a III. stupňa, najviac v sledovanom období."
            ),
            "year": 2010,
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
    assert context_by_year[2023]["graduates"] == 35_006
    assert context_by_year[2023]["appointmentsPer1kGraduates"] == 3.2
    assert context_by_year[2023]["graduatesPerAppointment"] == 312.55
    assert context_by_year[2023]["appointmentsPer100Professors"] == 6.8
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
