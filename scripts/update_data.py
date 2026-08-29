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


def _write_provenance(path: Path, provenance: dict[str, Any]) -> None:
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

        temporary_path.replace(path)
    except BaseException:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)
        raise


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
    retrieved_on = date.today().isoformat()

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

            temporary_path.replace(target)
            downloaded.append(DownloadedSource(name, url, sha256, size))
            if accept_new_checksums:
                source["sha256"] = sha256
                source["retrievedOn"] = retrieved_on
        except BaseException:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)
            raise

    if accept_new_checksums:
        _write_provenance(provenance_path, provenance)

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
