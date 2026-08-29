from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter, defaultdict
from collections.abc import Mapping, Sequence
from fractions import Fraction
from pathlib import Path
from typing import Any

import xlrd

from pipeline.context import ContextYear, load_context
from pipeline.models import Appointment, Institution, President, ProfessorDataset, SourceVariant
from pipeline.professors import APPOINTMENT_SHEET, load_appointments
from pipeline.text import normalize_display


_PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PROFESSORS_PATH = _PROJECT_ROOT / "public/data/source/professors.xls"
DEFAULT_CONTEXT_PATH = _PROJECT_ROOT / "public/data/source/higher-education.xls"
DEFAULT_GEOMETRY_PATH = _PROJECT_ROOT / "data/config/slovakia.geojson"
DEFAULT_PROVENANCE_PATH = _PROJECT_ROOT / "public/data/provenance.json"
DEFAULT_OUTPUT_PATH = _PROJECT_ROOT / "public/data/atlas.json"
_SOURCE_PATH_KEYS = ("professors", "higher_education")


class AtlasBuildError(ValueError):
    """Raised when committed build inputs cannot produce a trustworthy payload."""


def _load_object(path: Path, description: str) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise AtlasBuildError(f"Cannot read {description} at {path}: {error}") from error
    if not isinstance(value, dict):
        raise AtlasBuildError(f"{description.capitalize()} at {path} must be an object")
    return value


def _sha256(path: Path) -> str:
    try:
        with path.open("rb") as source:
            return hashlib.file_digest(source, "sha256").hexdigest()
    except OSError as error:
        raise AtlasBuildError(f"Cannot read build input {path}: {error}") from error


def _validated_provenance(
    provenance_path: Path,
    professors_path: Path,
    context_path: Path,
) -> dict[str, Any]:
    provenance = _load_object(provenance_path, "source provenance")
    sources = provenance.get("sources")
    if not isinstance(sources, dict) or set(sources) != set(_SOURCE_PATH_KEYS):
        raise AtlasBuildError(
            "Source provenance must contain exactly professors and higher_education"
        )
    paths = {
        "professors": professors_path,
        "higher_education": context_path,
    }
    for key in _SOURCE_PATH_KEYS:
        source = sources[key]
        if not isinstance(source, dict):
            raise AtlasBuildError(f"Provenance source {key!r} must be an object")
        expected = source.get("sha256")
        if not isinstance(expected, str) or len(expected) != 64:
            raise AtlasBuildError(f"Provenance source {key!r} has no valid SHA-256")
        actual = _sha256(paths[key])
        if actual != expected:
            raise AtlasBuildError(
                f"Checksum mismatch for {key}: expected {expected}, got {actual}"
            )
    return sources


def _validated_geography(path: Path) -> dict[str, Any]:
    feature = _load_object(path, "Slovakia geometry")
    if feature.get("type") != "Feature":
        raise AtlasBuildError("Slovakia geometry must be a GeoJSON Feature")
    geometry = feature.get("geometry")
    if not isinstance(geometry, dict) or geometry.get("type") not in {
        "Polygon",
        "MultiPolygon",
    }:
        raise AtlasBuildError("Slovakia geometry must be a Polygon or MultiPolygon")
    if not isinstance(geometry.get("coordinates"), list):
        raise AtlasBuildError("Slovakia geometry must contain coordinate arrays")
    properties = feature.get("properties")
    if not isinstance(properties, dict):
        raise AtlasBuildError("Slovakia geometry must contain properties")
    for key in ("source", "sourceUrl", "license", "licenseUrl"):
        if not isinstance(properties.get(key), str) or not properties[key]:
            raise AtlasBuildError(
                f"Slovakia geometry must retain non-empty {key!r} provenance"
            )
    return feature


def _source_surnames(path: Path) -> dict[int, str]:
    workbook = xlrd.open_workbook(str(path))
    sheet = workbook.sheet_by_name(APPOINTMENT_SHEET)
    return {
        row_index + 1: normalize_display(sheet.cell_value(row_index, 2))
        for row_index in range(1, sheet.nrows)
    }


def _source_variant_payload(variant: SourceVariant) -> dict[str, object]:
    return {
        "rowNumber": variant.row_number,
        "titlesBefore": variant.titles_before,
        "titlesAfter": variant.titles_after,
        "faculty": variant.faculty,
        "institution": variant.institution,
        "field": variant.field,
    }


def _appointment_payload(appointment: Appointment) -> dict[str, object]:
    return {
        "id": appointment.id,
        "name": appointment.name,
        "titlesBefore": appointment.titles_before,
        "titlesAfter": appointment.titles_after,
        "faculty": appointment.faculty,
        "institutionId": appointment.institution_id,
        "institutionSource": appointment.institution_source,
        "field": appointment.field,
        "appointedOn": appointment.appointed_on.isoformat(),
        "presidentId": appointment.president_id,
        "sourceVariants": [
            _source_variant_payload(variant)
            for variant in appointment.source_variants
        ],
    }


def _institution_payload(institution: Institution) -> dict[str, object]:
    return {
        "id": institution.id,
        "shortName": institution.short_name,
        "fullName": institution.full_name,
        "city": institution.city,
        "latitude": institution.latitude,
        "longitude": institution.longitude,
        "sourceLabels": list(institution.source_labels),
        "citationUrl": institution.citation_url,
    }


def _president_payload(president: President) -> dict[str, object]:
    return {
        "id": president.id,
        "name": president.name,
        "from": president.from_date.isoformat(),
        "to": president.to_date.isoformat() if president.to_date is not None else None,
    }


def _context_payload(item: ContextYear) -> dict[str, object]:
    return {
        "year": item.year,
        "academicYear": item.academic_year,
        "students": item.students,
        "graduates": item.graduates,
        "internalTeachers": item.internal_teachers,
        "internalProfessors": item.internal_professors,
        "appointments": item.appointments,
        "appointmentsPer1kGraduates": item.appointments_per_1k_graduates,
        "graduatesPerAppointment": item.graduates_per_appointment,
        "appointmentsPer10kStudents": item.appointments_per_10k_students,
        "appointmentsPer1kTeachers": item.appointments_per_1k_teachers,
        "appointmentsPer100Professors": item.appointments_per_100_professors,
        "professorShare": item.professor_share,
    }


def _city_payload(institutions: Sequence[Institution]) -> list[dict[str, object]]:
    institution_ids: defaultdict[str, list[str]] = defaultdict(list)
    for institution in institutions:
        institution_ids[institution.city].append(institution.id)
    return [
        {
            "name": city,
            "institutionIds": sorted(ids),
        }
        for city, ids in sorted(institution_ids.items())
    ]


def _format_slovak_integer(value: int) -> str:
    return f"{value:,}".replace(",", "\u00a0")


def _format_slovak_decimal(value: float) -> str:
    return f"{value:.2f}".rstrip("0").rstrip(".").replace(".", ",")


def _editorial_facts(
    appointments: Sequence[Appointment], context: Sequence[ContextYear]
) -> dict[str, object]:
    if not appointments or not context:
        raise AtlasBuildError("Editorial facts require appointments and context")
    student_peak = max(context, key=lambda item: (item.students, -item.year))
    graduate_peak = max(context, key=lambda item: (item.graduates, -item.year))
    rate_maximum = max(
        context,
        key=lambda item: (Fraction(item.appointments, item.students), -item.year),
    )
    graduate_rate_maximum = max(
        context,
        key=lambda item: (Fraction(item.appointments, item.graduates), -item.year),
    )
    professor_stock_rate_maximum = max(
        context,
        key=lambda item: (
            Fraction(item.appointments, item.internal_professors),
            -item.year,
        ),
    )
    graduate_rate_text = _format_slovak_decimal(
        graduate_rate_maximum.appointments_per_1k_graduates
    )
    professor_stock_rate_text = _format_slovak_decimal(
        professor_stock_rate_maximum.appointments_per_100_professors
    )
    ceremony_counts = Counter(item.appointed_on for item in appointments)
    largest_date, largest_count = max(
        ceremony_counts.items(), key=lambda item: (item[1], -item[0].toordinal())
    )
    return {
        "studentPeak": {
            "year": student_peak.year,
            "academicYear": student_peak.academic_year,
            "students": student_peak.students,
        },
        "graduateThroughputPeak": {
            "year": graduate_peak.year,
            "graduates": graduate_peak.graduates,
            "statementSk": (
                f"V roku {graduate_peak.year} evidovalo CVTI "
                f"{_format_slovak_integer(graduate_peak.graduates)} absolventov "
                "I., II. a III. stupňa, najviac v sledovanom období."
            ),
        },
        "appointmentRateMaximum": {
            "year": rate_maximum.year,
            "appointments": rate_maximum.appointments,
            "students": rate_maximum.students,
            "appointmentsPer10kStudents": (
                rate_maximum.appointments_per_10k_students
            ),
        },
        "appointmentGraduateRateMaximum": {
            "year": graduate_rate_maximum.year,
            "appointments": graduate_rate_maximum.appointments,
            "graduates": graduate_rate_maximum.graduates,
            "appointmentsPer1kGraduates": (
                graduate_rate_maximum.appointments_per_1k_graduates
            ),
            "graduatesPerAppointment": (
                graduate_rate_maximum.graduates_per_appointment
            ),
            "statementSk": (
                f"V roku {graduate_rate_maximum.year} pripadlo "
                f"{graduate_rate_text} "
                "profesorských vymenovaní na 1\u00a0000 absolventov, najviac "
                "v sledovanom období; oba údaje sú ročné toky."
            ),
        },
        "appointmentProfessorStockRateMaximum": {
            "year": professor_stock_rate_maximum.year,
            "appointments": professor_stock_rate_maximum.appointments,
            "internalProfessors": (
                professor_stock_rate_maximum.internal_professors
            ),
            "appointmentsPer100Professors": (
                professor_stock_rate_maximum.appointments_per_100_professors
            ),
            "statementSk": (
                f"V roku {professor_stock_rate_maximum.year} pripadlo "
                f"{professor_stock_rate_text} "
                "profesorských vymenovaní na 100 profesorov medzi internými "
                "učiteľmi; ide o porovnanie ročného toku so stavom, nie "
                "o zmenu počtu profesorov."
            ),
        },
        "largestCeremony": {
            "appointedOn": largest_date.isoformat(),
            "appointments": largest_count,
        },
    }


def build_payload(
    dataset: ProfessorDataset,
    context: Sequence[ContextYear],
    geography: Mapping[str, object],
    sources: Mapping[str, object],
    *,
    surnames_by_source_row: Mapping[int, str],
) -> dict[str, object]:
    """Assemble the complete static atlas payload from validated inputs."""
    context_years = [item.year for item in context]
    if context_years != list(range(2000, 2026)):
        raise AtlasBuildError(
            f"Context years must be 2000 through 2025, got {context_years!r}"
        )

    missing_surnames = [
        appointment.source_variants[0].row_number
        for appointment in dataset.appointments
        if appointment.source_variants[0].row_number not in surnames_by_source_row
    ]
    if missing_surnames:
        raise AtlasBuildError(
            f"Missing source surnames for rows {sorted(missing_surnames)!r}"
        )

    sorted_appointments = sorted(
        dataset.appointments,
        key=lambda item: (
            -item.appointed_on.toordinal(),
            surnames_by_source_row[item.source_variants[0].row_number],
            item.source_variants[0].row_number,
        ),
    )
    institutions = sorted(dataset.institutions, key=lambda item: item.id)
    presidents = sorted(dataset.presidents, key=lambda item: item.from_date)
    ceremony_count = len({item.appointed_on for item in dataset.appointments})

    return {
        "meta": {
            "schemaVersion": 1,
            "sourceRowCount": dataset.source_row_count,
            "duplicateSourceRowCount": dataset.duplicate_source_row_count,
            "analyticalAppointmentCount": len(dataset.appointments),
            "ceremonyCount": ceremony_count,
            "appointmentDateMin": dataset.date_min.isoformat(),
            "appointmentDateMax": dataset.date_max.isoformat(),
        },
        "sources": dict(sources),
        "records": [_appointment_payload(item) for item in sorted_appointments],
        "institutions": [_institution_payload(item) for item in institutions],
        "cities": _city_payload(institutions),
        "presidents": [_president_payload(item) for item in presidents],
        "context": [_context_payload(item) for item in context],
        "geography": dict(geography),
        "editorialFacts": _editorial_facts(dataset.appointments, context),
    }


def build_atlas(
    output_path: Path,
    *,
    professors_path: Path = DEFAULT_PROFESSORS_PATH,
    context_path: Path = DEFAULT_CONTEXT_PATH,
    geography_path: Path = DEFAULT_GEOMETRY_PATH,
    provenance_path: Path = DEFAULT_PROVENANCE_PATH,
) -> dict[str, object]:
    """Validate all committed inputs and write deterministic atlas JSON."""
    sources = _validated_provenance(
        provenance_path, professors_path, context_path
    )
    dataset = load_appointments(professors_path)
    context = load_context(context_path, appointments=dataset.appointments)
    geography = _validated_geography(geography_path)
    payload = build_payload(
        dataset,
        context,
        geography,
        sources,
        surnames_by_source_row=_source_surnames(professors_path),
    )
    serialized = json.dumps(
        payload,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(f"{serialized}\n", encoding="utf-8", newline="\n")
    return payload


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Generate deterministic static data for the Slovak Professors Atlas."
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH)
    parser.add_argument("--professors", type=Path, default=DEFAULT_PROFESSORS_PATH)
    parser.add_argument("--context", type=Path, default=DEFAULT_CONTEXT_PATH)
    parser.add_argument("--geometry", type=Path, default=DEFAULT_GEOMETRY_PATH)
    parser.add_argument("--provenance", type=Path, default=DEFAULT_PROVENANCE_PATH)
    args = parser.parse_args(argv)
    payload = build_atlas(
        args.output,
        professors_path=args.professors,
        context_path=args.context,
        geography_path=args.geometry,
        provenance_path=args.provenance,
    )
    meta = payload["meta"]
    assert isinstance(meta, dict)
    print(
        f"Wrote {args.output}: {meta['analyticalAppointmentCount']} appointments, "
        f"{len(payload['context'])} context years, "
        f"{meta['ceremonyCount']} ceremonies"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
