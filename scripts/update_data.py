from __future__ import annotations

import argparse
import hashlib
import json
import re
import tempfile
import urllib.request
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any, Sequence


SOURCE_DESTINATIONS = {
    "professors": "professors.xls",
    "higher_education": "higher-education.xls",
    "graduates_by_field_2025": "graduates-by-field-2025.xls",
    "population": "population.json",
}
CHUNK_SIZE = 1024 * 1024
DEFAULT_PROVENANCE_PATH = Path("public/data/provenance.json")
DEFAULT_SOURCE_DESTINATION = Path("public/data/source")
_SHA256 = re.compile(r"^[0-9a-f]{64}$")
_POPULATION_URL = (
    "https://data.statistics.sk/api/v2/dataset/"
    "om7102rr/SK0/2000:2025/IN010114/SPOLU?lang=en&type=json"
)


@dataclass(frozen=True, slots=True)
class DownloadedSource:
    name: str
    url: str
    sha256: str
    size: int


class SourceIntegrityError(RuntimeError):
    """Raised when downloaded source bytes do not match their pinned digest."""


def _load_provenance(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _validated_sources(
    provenance: dict[str, Any], *, require_checksums: bool
) -> dict[str, dict[str, Any]]:
    raw_sources = provenance.get("sources")
    if not isinstance(raw_sources, dict) or set(raw_sources) != set(
        SOURCE_DESTINATIONS
    ):
        raise SourceIntegrityError(
            "Source provenance must contain exactly "
            + ", ".join(SOURCE_DESTINATIONS)
        )

    sources: dict[str, dict[str, Any]] = {}
    for name in SOURCE_DESTINATIONS:
        source = raw_sources[name]
        if not isinstance(source, dict):
            raise SourceIntegrityError(f"Provenance source {name!r} must be an object")
        url = source.get("url")
        if not isinstance(url, str) or not url:
            raise SourceIntegrityError(
                f"Provenance source {name!r} requires a non-empty URL"
            )
        retrieved_on = source.get("retrievedOn")
        try:
            if not isinstance(retrieved_on, str):
                raise ValueError
            date.fromisoformat(retrieved_on)
        except ValueError as error:
            raise SourceIntegrityError(
                f"Provenance source {name!r} requires an ISO retrieval date"
            ) from error
        if name == "population" and url != _POPULATION_URL:
            raise SourceIntegrityError(
                "Population provenance URL must retain the reviewed national "
                "mid-year selection"
            )
        expected_sha256 = source.get("sha256")
        if require_checksums and (
            not isinstance(expected_sha256, str)
            or _SHA256.fullmatch(expected_sha256) is None
        ):
            raise SourceIntegrityError(
                f"Provenance source {name!r} requires a lowercase SHA-256"
            )
        sources[name] = source
    return sources


def _stage_provenance(path: Path, provenance: dict[str, Any]) -> Path:
    temporary_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=path.parent,
            prefix=f".{path.name}.",
            suffix=".tmp",
            delete=False,
        ) as temporary_file:
            temporary_path = Path(temporary_file.name)
            json.dump(provenance, temporary_file, ensure_ascii=False, indent=2)
            temporary_file.write("\n")
    except BaseException:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)
        raise

    return temporary_path


def _replace_staged_files(replacements: Sequence[tuple[Path, Path]]) -> None:
    backups: list[tuple[Path, Path | None]] = []
    for _, target in replacements:
        backup_path: Path | None = None
        if target.exists():
            with tempfile.NamedTemporaryFile(
                dir=target.parent,
                prefix=f".{target.name}.",
                suffix=".bak",
                delete=False,
            ) as backup_file:
                backup_path = Path(backup_file.name)
            backup_path.unlink()
        backups.append((target, backup_path))

    replaced: list[tuple[Path, Path | None]] = []
    try:
        for (staged_path, target), (_, backup_path) in zip(
            replacements, backups, strict=True
        ):
            if backup_path is not None:
                target.replace(backup_path)
            replaced.append((target, backup_path))
            staged_path.replace(target)
    except BaseException as replacement_error:
        rollback_errors: list[BaseException] = []
        for target, backup_path in reversed(replaced):
            try:
                target.unlink(missing_ok=True)
                if backup_path is not None:
                    backup_path.replace(target)
            except BaseException as rollback_error:
                rollback_errors.append(rollback_error)
        if rollback_errors:
            raise RuntimeError(
                f"Failed to roll back {len(rollback_errors)} staged replacement(s)"
            ) from replacement_error
        raise
    else:
        for _, backup_path in backups:
            if backup_path is not None:
                backup_path.unlink(missing_ok=True)


def _download_sources(
    provenance_path: Path,
    destination: Path,
    *,
    accept_new_checksums: bool,
) -> list[DownloadedSource]:
    provenance = _load_provenance(provenance_path)
    sources = _validated_sources(
        provenance, require_checksums=not accept_new_checksums
    )
    destination.mkdir(parents=True, exist_ok=True)
    downloaded: list[DownloadedSource] = []
    staged_replacements: list[tuple[Path, Path]] = []
    retrieved_on = date.today().isoformat()

    try:
        for name, filename in SOURCE_DESTINATIONS.items():
            source = sources[name]
            url = source["url"]
            expected_sha256 = source.get("sha256")
            target = destination / filename
            temporary_path: Path | None = None

            try:
                with tempfile.NamedTemporaryFile(
                    dir=destination,
                    prefix=f".{filename}.",
                    suffix=".tmp",
                    delete=False,
                ) as temporary_file:
                    temporary_path = Path(temporary_file.name)
                    digest = hashlib.sha256()
                    size = 0

                    with urllib.request.urlopen(url) as response:
                        while chunk := response.read(CHUNK_SIZE):
                            temporary_file.write(chunk)
                            digest.update(chunk)
                            size += len(chunk)

                sha256 = digest.hexdigest()
                if (
                    expected_sha256
                    and sha256 != expected_sha256
                    and not accept_new_checksums
                ):
                    raise SourceIntegrityError(
                        f"Checksum mismatch for {name}: expected {expected_sha256}, "
                        f"downloaded {sha256}"
                    )

                staged_replacements.append((temporary_path, target))
                downloaded.append(DownloadedSource(name, url, sha256, size))
                if accept_new_checksums:
                    source["sha256"] = sha256
                    source["retrievedOn"] = retrieved_on
            except BaseException:
                if temporary_path is not None:
                    temporary_path.unlink(missing_ok=True)
                raise

        if accept_new_checksums:
            staged_provenance = _stage_provenance(provenance_path, provenance)
            staged_replacements.append((staged_provenance, provenance_path))

        _replace_staged_files(staged_replacements)
    except BaseException:
        for staged_path, _ in staged_replacements:
            staged_path.unlink(missing_ok=True)
        raise

    return downloaded


def download_sources(
    provenance_path: Path, destination: Path
) -> list[DownloadedSource]:
    return _download_sources(
        provenance_path,
        destination,
        accept_new_checksums=False,
    )


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Download and verify the official atlas source workbooks."
    )
    parser.add_argument(
        "--accept-new-checksums",
        action="store_true",
        help="accept upstream byte changes and update provenance metadata",
    )
    args = parser.parse_args(argv)

    previous_provenance = _load_provenance(DEFAULT_PROVENANCE_PATH)
    downloaded = _download_sources(
        DEFAULT_PROVENANCE_PATH,
        DEFAULT_SOURCE_DESTINATION,
        accept_new_checksums=args.accept_new_checksums,
    )

    for item in downloaded:
        destination = DEFAULT_SOURCE_DESTINATION / SOURCE_DESTINATIONS[item.name]
        if args.accept_new_checksums:
            old_sha256 = previous_provenance["sources"][item.name].get("sha256")
            print(f"{item.name}:")
            print(f"  old sha256: {old_sha256 or '(not pinned)'}")
            print(f"  new sha256: {item.sha256}")
        else:
            print(f"{item.name}: {item.sha256}")
        print(f"  size: {item.size} bytes")
        print(f"  destination: {destination}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
