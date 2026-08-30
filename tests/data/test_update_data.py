import hashlib
import io
import json
from datetime import date
from pathlib import Path
from unittest.mock import patch
from zipfile import ZIP_DEFLATED, ZipFile

import pytest

import scripts.update_data as update_data
from scripts.update_data import SourceIntegrityError, download_sources


PROFESSOR_BYTES = b"professor workbook"
HIGHER_EDUCATION_BYTES = b"higher education workbook"
GRADUATES_BY_FIELD_BYTES = b"graduates by field workbook"
POPULATION_BYTES = b'{"class":"dataset","value":[]}'
SOURCE_URLS = {
    "professors": "https://example.test/professors.xls",
    "higher_education": "https://example.test/higher-education.xls",
    "graduates_2025": "https://example.test/graduates/2025.xls",
    "population": (
        "https://data.statistics.sk/api/v2/dataset/"
        "om7102rr/SK0/2000:2025/IN010114/SPOLU?lang=en&type=json"
    ),
}


def write_provenance(path: Path, *, professor_sha256: str | None = None) -> None:
    path.write_text(
        json.dumps(
            {
                "sources": {
                    "professors": {
                        "url": SOURCE_URLS["professors"],
                        "sha256": professor_sha256
                        or hashlib.sha256(PROFESSOR_BYTES).hexdigest(),
                        "retrievedOn": "2026-08-29",
                    },
                    "higher_education": {
                        "url": SOURCE_URLS["higher_education"],
                        "sha256": hashlib.sha256(HIGHER_EDUCATION_BYTES).hexdigest(),
                        "retrievedOn": "2026-08-29",
                    },
                    "population": {
                        "url": SOURCE_URLS["population"],
                        "sha256": hashlib.sha256(POPULATION_BYTES).hexdigest(),
                        "retrievedOn": "2026-08-29",
                    },
                }
            }
        ),
        encoding="utf-8",
    )

def add_field_education_provenance(path: Path) -> list[bytes]:
    provenance = json.loads(path.read_text(encoding="utf-8"))
    responses: list[bytes] = []
    graduate_sources = []
    for year in range(2009, 2025):
        member = f"abvs{year}.xls"
        workbook_bytes = f"graduates {year}".encode()
        archive_buffer = io.BytesIO()
        with ZipFile(archive_buffer, "w", ZIP_DEFLATED) as archive:
            archive.writestr(member, workbook_bytes)
        responses.append(archive_buffer.getvalue())
        graduate_sources.append(
            {
                "year": year,
                "url": f"https://example.test/vs{year}.zip",
                "archiveMember": member,
                "sha256": hashlib.sha256(workbook_bytes).hexdigest(),
                "retrievedOn": "2026-08-29",
                "localPath": f"graduates-by-field/{year}.xls",
            }
        )

    responses.append(GRADUATES_BY_FIELD_BYTES)
    graduate_sources.append(
        {
            "year": 2025,
            "url": SOURCE_URLS["graduates_2025"],
            "archiveMember": None,
            "sha256": hashlib.sha256(GRADUATES_BY_FIELD_BYTES).hexdigest(),
            "retrievedOn": "2026-08-29",
            "localPath": "graduates-by-field/2025.xls",
        }
    )
    student_bytes = b"current students"
    responses.append(student_bytes)
    provenance["fieldEducation"] = {
        "catalogUrl": "https://example.test/catalog",
        "graduateSources": graduate_sources,
        "currentStudentsSource": {
            "year": 2025,
            "url": "https://example.test/current-students.xls",
            "archiveMember": None,
            "sha256": hashlib.sha256(student_bytes).hexdigest(),
            "retrievedOn": "2026-08-29",
            "localPath": "current-students-by-field-2025.xls",
        },
    }
    path.write_text(json.dumps(provenance), encoding="utf-8")
    return responses




def test_download_sources_writes_verified_workbooks(tmp_path: Path) -> None:
    provenance_path = tmp_path / "provenance.json"
    destination = tmp_path / "source"
    write_provenance(provenance_path)

    with patch(
        "scripts.update_data.urllib.request.urlopen",
        side_effect=[
            io.BytesIO(PROFESSOR_BYTES),
            io.BytesIO(HIGHER_EDUCATION_BYTES),
            io.BytesIO(POPULATION_BYTES),
        ],
    ):
        result = download_sources(provenance_path, destination)

    assert [item.name for item in result] == [
        "professors",
        "higher_education",
        "population",
    ]
    assert result[0].sha256 == hashlib.sha256(PROFESSOR_BYTES).hexdigest()
    assert (destination / "professors.xls").read_bytes() == PROFESSOR_BYTES
    assert (
        destination / "higher-education.xls"
    ).read_bytes() == HIGHER_EDUCATION_BYTES
    assert (destination / "population.json").read_bytes() == POPULATION_BYTES


def test_download_sources_rejects_unpinned_source_before_network(
    tmp_path: Path,
) -> None:
    provenance_path = tmp_path / "provenance.json"
    destination = tmp_path / "source"
    write_provenance(provenance_path)
    provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
    del provenance["sources"]["professors"]["sha256"]
    provenance_path.write_text(json.dumps(provenance), encoding="utf-8")

    with patch("scripts.update_data.urllib.request.urlopen") as urlopen:
        with pytest.raises(SourceIntegrityError, match="professors"):
            download_sources(provenance_path, destination)

    urlopen.assert_not_called()
    assert not destination.exists()

def test_download_sources_rejects_changed_population_selection_before_network(
    tmp_path: Path,
) -> None:
    provenance_path = tmp_path / "provenance.json"
    destination = tmp_path / "source"
    write_provenance(provenance_path)
    provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
    provenance["sources"]["population"]["url"] = (
        "https://data.statistics.sk/api/v2/dataset/"
        "om7102rr/SK0/2000:2025/IN010115/SPOLU?lang=en&type=json"
    )
    provenance_path.write_text(json.dumps(provenance), encoding="utf-8")

    with patch("scripts.update_data.urllib.request.urlopen") as urlopen:
        with pytest.raises(SourceIntegrityError, match="mid-year selection"):
            download_sources(provenance_path, destination)

    urlopen.assert_not_called()
    assert not destination.exists()


def test_checksum_mismatch_preserves_existing_destination(tmp_path: Path) -> None:
    provenance_path = tmp_path / "provenance.json"
    destination = tmp_path / "source"
    destination.mkdir()
    professor_path = destination / "professors.xls"
    professor_path.write_bytes(b"previous verified workbook")
    write_provenance(provenance_path, professor_sha256="0" * 64)

    with patch(
        "scripts.update_data.urllib.request.urlopen",
        return_value=io.BytesIO(PROFESSOR_BYTES),
    ):
        with pytest.raises(SourceIntegrityError, match="professors"):
            download_sources(provenance_path, destination)

    assert professor_path.read_bytes() == b"previous verified workbook"
    assert {path.name for path in destination.iterdir()} == {"professors.xls"}


def test_accept_new_checksums_rolls_back_when_later_download_fails(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provenance_path = tmp_path / "provenance.json"
    destination = tmp_path / "source"
    destination.mkdir()
    professor_path = destination / "professors.xls"
    higher_education_path = destination / "higher-education.xls"
    previous_professor_bytes = b"previous professor workbook"
    previous_higher_education_bytes = b"previous higher education workbook"
    professor_path.write_bytes(previous_professor_bytes)
    higher_education_path.write_bytes(previous_higher_education_bytes)
    write_provenance(
        provenance_path,
        professor_sha256=hashlib.sha256(previous_professor_bytes).hexdigest(),
    )
    add_field_education_provenance(provenance_path)
    previous_provenance_bytes = provenance_path.read_bytes()
    monkeypatch.setattr(update_data, "DEFAULT_PROVENANCE_PATH", provenance_path)
    monkeypatch.setattr(update_data, "DEFAULT_SOURCE_DESTINATION", destination)

    with patch(
        "scripts.update_data.urllib.request.urlopen",
        side_effect=[
            io.BytesIO(PROFESSOR_BYTES),
            io.BytesIO(HIGHER_EDUCATION_BYTES),
            OSError("third download failed"),
        ],
    ):
        with pytest.raises(OSError, match="third download failed"):
            update_data.main(["--accept-new-checksums"])

    assert professor_path.read_bytes() == previous_professor_bytes
    assert higher_education_path.read_bytes() == previous_higher_education_bytes
    assert provenance_path.read_bytes() == previous_provenance_bytes



def test_main_requires_field_education_before_network(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provenance_path = tmp_path / "provenance.json"
    write_provenance(provenance_path)
    monkeypatch.setattr(update_data, "DEFAULT_PROVENANCE_PATH", provenance_path)
    urlopen = patch("scripts.update_data.urllib.request.urlopen")

    with urlopen as request:
        with pytest.raises(
            SourceIntegrityError,
            match="fieldEducation provenance is required",
        ):
            update_data.main([])

    request.assert_not_called()


def test_accept_new_checksums_updates_provenance_and_atomically_builds_atlas(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    provenance_path = tmp_path / "provenance.json"
    destination = tmp_path / "source"
    write_provenance(provenance_path, professor_sha256="0" * 64)
    field_responses = add_field_education_provenance(provenance_path)
    atlas_path = tmp_path / "atlas.json"
    monkeypatch.setattr(update_data, "DEFAULT_PROVENANCE_PATH", provenance_path)
    monkeypatch.setattr(update_data, "DEFAULT_SOURCE_DESTINATION", destination)
    monkeypatch.setattr(update_data, "DEFAULT_ATLAS_OUTPUT_PATH", atlas_path)

    def fake_build_atlas(output_path: Path, **_kwargs: object) -> None:
        output_path.write_text('{"schemaVersion":2}', encoding="utf-8")

    with (
        patch(
            "scripts.update_data.urllib.request.urlopen",
            side_effect=[
                io.BytesIO(PROFESSOR_BYTES),
                io.BytesIO(HIGHER_EDUCATION_BYTES),
                io.BytesIO(POPULATION_BYTES),
                *[io.BytesIO(response) for response in field_responses],
            ],
        ),
        patch("pipeline.build.build_atlas", side_effect=fake_build_atlas),
    ):
        update_data.main(["--accept-new-checksums"])

    provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
    professor_sha256 = hashlib.sha256(PROFESSOR_BYTES).hexdigest()
    assert provenance["sources"]["professors"]["sha256"] == professor_sha256
    assert provenance["sources"]["professors"]["retrievedOn"] == date.today().isoformat()
    assert (destination / "professors.xls").read_bytes() == PROFESSOR_BYTES
    assert atlas_path.read_text(encoding="utf-8") == '{"schemaVersion":2}'

    output = capsys.readouterr().out
    assert f"old sha256: {'0' * 64}" in output
    assert f"new sha256: {professor_sha256}" in output
    assert f"size: {len(PROFESSOR_BYTES)} bytes" in output
    assert f"destination: {destination / 'professors.xls'}" in output
    assert f"atlas: regenerated {atlas_path}" in output

    published_provenance = provenance_path.read_bytes()
    published_atlas = atlas_path.read_bytes()
    changed_professor_bytes = b"changed professor workbook"
    with (
        patch(
            "scripts.update_data.urllib.request.urlopen",
            side_effect=[
                io.BytesIO(changed_professor_bytes),
                io.BytesIO(HIGHER_EDUCATION_BYTES),
                io.BytesIO(POPULATION_BYTES),
                *[io.BytesIO(response) for response in field_responses],
            ],
        ),
        patch(
            "pipeline.build.build_atlas",
            side_effect=ValueError("invalid staged atlas"),
        ),
    ):
        with pytest.raises(ValueError, match="invalid staged atlas"):
            update_data.main(["--accept-new-checksums"])

    assert (destination / "professors.xls").read_bytes() == PROFESSOR_BYTES
    assert provenance_path.read_bytes() == published_provenance
    assert atlas_path.read_bytes() == published_atlas


def test_download_sources_extracts_historical_members_and_current_students(
    tmp_path: Path,
) -> None:
    provenance_path = tmp_path / "provenance.json"
    destination = tmp_path / "source"
    write_provenance(provenance_path)
    provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
    graduate_sources = []
    archive_bytes_by_url: dict[str, bytes] = {}
    for year in range(2009, 2025):
        member = f"abvs{year}.xls"
        workbook_bytes = f"graduates {year}".encode()
        archive_url = f"https://example.test/vs{year}.zip"
        archive_buffer = io.BytesIO()
        with ZipFile(archive_buffer, "w", ZIP_DEFLATED) as archive:
            archive.writestr(member, workbook_bytes)
        archive_bytes_by_url[archive_url] = archive_buffer.getvalue()
        graduate_sources.append(
            {
                "year": year,
                "url": archive_url,
                "archiveMember": member,
                "sha256": hashlib.sha256(workbook_bytes).hexdigest(),
                "retrievedOn": "2026-08-29",
                "localPath": f"graduates-by-field/{year}.xls",
            }
        )
    graduate_sources.append(
        {
            "year": 2025,
            "url": SOURCE_URLS["graduates_2025"],
            "archiveMember": None,
            "sha256": hashlib.sha256(GRADUATES_BY_FIELD_BYTES).hexdigest(),
            "retrievedOn": "2026-08-29",
            "localPath": "graduates-by-field/2025.xls",
        }
    )
    student_bytes = b"current students"
    student_url = "https://example.test/current-students.xls"
    provenance["fieldEducation"] = {
        "catalogUrl": "https://example.test/catalog",
        "graduateSources": graduate_sources,
        "currentStudentsSource": {
            "year": 2025,
            "url": student_url,
            "catalogUrl": "https://example.test/catalog",
            "sha256": hashlib.sha256(student_bytes).hexdigest(),
            "retrievedOn": "2026-08-29",
            "localPath": "current-students-by-field-2025.xls",
        },
    }
    provenance_path.write_text(json.dumps(provenance), encoding="utf-8")

    def response(url: str):
        if url in archive_bytes_by_url:
            return io.BytesIO(archive_bytes_by_url[url])
        direct = {
            SOURCE_URLS["professors"]: PROFESSOR_BYTES,
            SOURCE_URLS["higher_education"]: HIGHER_EDUCATION_BYTES,
            SOURCE_URLS["graduates_2025"]: GRADUATES_BY_FIELD_BYTES,
            SOURCE_URLS["population"]: POPULATION_BYTES,
            student_url: student_bytes,
        }
        return io.BytesIO(direct[url])

    with patch("scripts.update_data.urllib.request.urlopen", side_effect=response):
        result = download_sources(provenance_path, destination)

    assert len(result) == 21
    assert (destination / "graduates-by-field/2009.xls").read_bytes() == b"graduates 2009"
    assert (
        destination / "graduates-by-field/2025.xls"
    ).read_bytes() == GRADUATES_BY_FIELD_BYTES
    assert (
        destination / "current-students-by-field-2025.xls"
    ).read_bytes() == student_bytes


def test_archive_failure_preserves_every_existing_destination(tmp_path: Path) -> None:
    provenance_path = tmp_path / "provenance.json"
    destination = tmp_path / "source"
    destination.mkdir()
    existing = destination / "professors.xls"
    existing.write_bytes(b"existing")
    write_provenance(provenance_path)
    provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
    provenance["fieldEducation"] = {
        "catalogUrl": "https://example.test/catalog",
        "graduateSources": [
            {
                "year": year,
                "url": f"https://example.test/vs{year}.zip",
                "archiveMember": f"missing-{year}.xls",
                "sha256": "0" * 64,
                "retrievedOn": "2026-08-29",
                "localPath": f"graduates-by-field/{year}.xls",
            }
            for year in range(2009, 2025)
        ]
        + [
            {
                "year": 2025,
                "url": SOURCE_URLS["graduates_2025"],
                "archiveMember": None,
                "sha256": hashlib.sha256(GRADUATES_BY_FIELD_BYTES).hexdigest(),
                "retrievedOn": "2026-08-29",
                "localPath": "graduates-by-field/2025.xls",
            }
        ],
        "currentStudentsSource": {
            "year": 2025,
            "url": "https://example.test/current-students.xls",
            "catalogUrl": "https://example.test/catalog",
            "sha256": "0" * 64,
            "retrievedOn": "2026-08-29",
            "localPath": "current-students-by-field-2025.xls",
        },
    }
    provenance_path.write_text(json.dumps(provenance), encoding="utf-8")
    archive_buffer = io.BytesIO()
    with ZipFile(archive_buffer, "w", ZIP_DEFLATED) as archive:
        archive.writestr("different.xls", b"changed")

    with patch(
        "scripts.update_data.urllib.request.urlopen",
        side_effect=[
            io.BytesIO(PROFESSOR_BYTES),
            io.BytesIO(HIGHER_EDUCATION_BYTES),
            io.BytesIO(POPULATION_BYTES),
            io.BytesIO(archive_buffer.getvalue()),
        ],
    ):
        with pytest.raises(SourceIntegrityError, match="archive member"):
            download_sources(provenance_path, destination)

    assert existing.read_bytes() == b"existing"
    assert {path.name for path in destination.iterdir()} == {"professors.xls"}
