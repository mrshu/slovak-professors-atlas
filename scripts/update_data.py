from __future__ import annotations

import argparse
import hashlib
import json
import tempfile
import urllib.request
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any, Sequence


SOURCE_DESTINATIONS = {
    "professors": "professors.xls",
    "higher_education": "higher-education.xls",
}
CHUNK_SIZE = 1024 * 1024
DEFAULT_PROVENANCE_PATH = Path("public/data/provenance.json")
DEFAULT_SOURCE_DESTINATION = Path("public/data/source")


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
    sources = provenance["sources"]
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
