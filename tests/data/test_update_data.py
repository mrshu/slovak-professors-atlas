import hashlib
import io
import json
from datetime import date
from pathlib import Path
from unittest.mock import patch

import pytest

import scripts.update_data as update_data
from scripts.update_data import SourceIntegrityError, download_sources


PROFESSOR_BYTES = b"professor workbook"
HIGHER_EDUCATION_BYTES = b"higher education workbook"
SOURCE_URLS = {
    "professors": "https://example.test/professors.xls",
    "higher_education": "https://example.test/higher-education.xls",
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
                }
            }
        ),
        encoding="utf-8",
    )


def test_download_sources_writes_verified_workbooks(tmp_path: Path) -> None:
    provenance_path = tmp_path / "provenance.json"
    destination = tmp_path / "source"
    write_provenance(provenance_path)

    with patch(
        "scripts.update_data.urllib.request.urlopen",
        side_effect=[io.BytesIO(PROFESSOR_BYTES), io.BytesIO(HIGHER_EDUCATION_BYTES)],
    ):
        result = download_sources(provenance_path, destination)

    assert [item.name for item in result] == ["professors", "higher_education"]
    assert result[0].sha256 == hashlib.sha256(PROFESSOR_BYTES).hexdigest()
    assert (destination / "professors.xls").read_bytes() == PROFESSOR_BYTES
    assert (
        destination / "higher-education.xls"
    ).read_bytes() == HIGHER_EDUCATION_BYTES


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
    previous_provenance_bytes = provenance_path.read_bytes()
    monkeypatch.setattr(update_data, "DEFAULT_PROVENANCE_PATH", provenance_path)
    monkeypatch.setattr(update_data, "DEFAULT_SOURCE_DESTINATION", destination)

    with patch(
        "scripts.update_data.urllib.request.urlopen",
        side_effect=[io.BytesIO(PROFESSOR_BYTES), OSError("second download failed")],
    ):
        with pytest.raises(OSError, match="second download failed"):
            update_data.main(["--accept-new-checksums"])

    assert professor_path.read_bytes() == previous_professor_bytes
    assert higher_education_path.read_bytes() == previous_higher_education_bytes
    assert provenance_path.read_bytes() == previous_provenance_bytes


def test_accept_new_checksums_updates_provenance_and_reports_changes(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    provenance_path = tmp_path / "provenance.json"
    destination = tmp_path / "source"
    write_provenance(provenance_path, professor_sha256="0" * 64)
    monkeypatch.setattr(update_data, "DEFAULT_PROVENANCE_PATH", provenance_path)
    monkeypatch.setattr(update_data, "DEFAULT_SOURCE_DESTINATION", destination)

    with patch(
        "scripts.update_data.urllib.request.urlopen",
        side_effect=[io.BytesIO(PROFESSOR_BYTES), io.BytesIO(HIGHER_EDUCATION_BYTES)],
    ):
        update_data.main(["--accept-new-checksums"])

    provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
    professor_sha256 = hashlib.sha256(PROFESSOR_BYTES).hexdigest()
    assert provenance["sources"]["professors"]["sha256"] == professor_sha256
    assert provenance["sources"]["professors"]["retrievedOn"] == date.today().isoformat()
    assert (destination / "professors.xls").read_bytes() == PROFESSOR_BYTES

    output = capsys.readouterr().out
    assert f"old sha256: {'0' * 64}" in output
    assert f"new sha256: {professor_sha256}" in output
    assert f"size: {len(PROFESSOR_BYTES)} bytes" in output
    assert f"destination: {destination / 'professors.xls'}" in output
