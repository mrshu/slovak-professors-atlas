from __future__ import annotations

import json
from collections import Counter, defaultdict
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from types import MappingProxyType

from pipeline.models import Appointment
from pipeline.text import normalize_display, normalize_search


_PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_FIELD_ALIASES_PATH = _PROJECT_ROOT / "data/config/field-aliases.json"


class FieldAliasError(ValueError):
    """Raised when reviewed field aliases no longer match the source universe."""


@dataclass(frozen=True, slots=True)
class FieldAliasEntry:
    source_label: str
    source_key: str
    target_label: str
    target_key: str


@dataclass(frozen=True, slots=True)
class FieldCatalog:
    aliases: Mapping[str, str]
    labels: Mapping[str, str]
    alias_entries: Sequence[FieldAliasEntry]

    def key_for(self, label: str) -> str:
        normalized = normalize_search(normalize_display(label))
        return self.aliases.get(normalized, normalized)

    def label_for(self, field_key: str) -> str:
        return self.labels[field_key]

    def is_alias(self, label: str) -> bool:
        return normalize_search(normalize_display(label)) in self.aliases

    def payload(self) -> dict[str, object]:
        return {
            "schemaVersion": 1,
            "aliases": [
                {
                    "sourceLabel": item.source_label,
                    "sourceKey": item.source_key,
                    "targetLabel": item.target_label,
                    "targetKey": item.target_key,
                }
                for item in self.alias_entries
            ],
            "labels": dict(self.labels),
        }


_SLOVAK_TOKENS = (
    "a",
    "á",
    "ä",
    "b",
    "c",
    "č",
    "d",
    "ď",
    "dz",
    "dž",
    "e",
    "é",
    "f",
    "g",
    "h",
    "ch",
    "i",
    "í",
    "j",
    "k",
    "l",
    "ĺ",
    "ľ",
    "m",
    "n",
    "ň",
    "o",
    "ó",
    "ô",
    "p",
    "q",
    "r",
    "ŕ",
    "s",
    "š",
    "t",
    "ť",
    "u",
    "ú",
    "v",
    "w",
    "x",
    "y",
    "ý",
    "z",
    "ž",
)
_SLOVAK_ORDER = {token: index for index, token in enumerate(_SLOVAK_TOKENS)}
_SLOVAK_MULTIGRAPHS = ("dž", "dz", "ch")


def _slovak_sort_key(value: str) -> tuple[tuple[int, str], ...]:
    text = normalize_display(value).casefold()
    result: list[tuple[int, str]] = []
    index = 0
    while index < len(text):
        token = next(
            (item for item in _SLOVAK_MULTIGRAPHS if text.startswith(item, index)),
            text[index],
        )
        result.append((_SLOVAK_ORDER.get(token, len(_SLOVAK_ORDER)), token))
        index += len(token)
    return tuple(result)


def _load_alias_pairs(path: Path) -> list[tuple[str, str]]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise FieldAliasError(f"Cannot read field aliases from {path}: {error}") from error
    if not isinstance(value, dict) or not value:
        raise FieldAliasError("Field aliases must be a non-empty JSON object")

    pairs: list[tuple[str, str]] = []
    for source, target in value.items():
        if not isinstance(source, str) or not source.strip():
            raise FieldAliasError("Field alias source must be a non-empty string")
        if not isinstance(target, str) or not target.strip():
            raise FieldAliasError("Field alias target must be a non-empty string")
        pairs.append((normalize_display(source), normalize_display(target)))
    return pairs


def _validate_alias_graph(entries: Sequence[FieldAliasEntry]) -> None:
    graph = {item.source_key: item.target_key for item in entries}
    for start in graph:
        visited: set[str] = set()
        current = start
        while current in graph:
            if current in visited:
                raise FieldAliasError(f"Field alias cycle starts at {start!r}")
            visited.add(current)
            current = graph[current]
    chained = sorted(set(graph).intersection(graph.values()))
    if chained:
        raise FieldAliasError(f"Field alias chain contains {chained!r}")


def build_field_catalog(
    appointments: Sequence[Appointment],
    aliases_path: Path = DEFAULT_FIELD_ALIASES_PATH,
) -> FieldCatalog:
    normalized_universe = {normalize_search(item.field) for item in appointments}
    entries: list[FieldAliasEntry] = []
    source_keys: set[str] = set()

    for source_label, target_label in _load_alias_pairs(aliases_path):
        source_key = normalize_search(source_label)
        target_key = normalize_search(target_label)
        if source_key == target_key:
            raise FieldAliasError(f"Field alias {source_label!r} maps to itself")
        if source_key in source_keys:
            raise FieldAliasError(f"Duplicate normalized field alias source {source_key!r}")
        source_keys.add(source_key)
        entries.append(
            FieldAliasEntry(source_label, source_key, target_label, target_key)
        )

    _validate_alias_graph(entries)
    for item in entries:
        if item.source_key not in normalized_universe:
            raise FieldAliasError(f"Field alias source {item.source_label!r} is missing")
        if item.target_key not in normalized_universe:
            raise FieldAliasError(f"Field alias target {item.target_label!r} is missing")

    aliases = {item.source_key: item.target_key for item in entries}
    variants: defaultdict[str, Counter[str]] = defaultdict(Counter)
    for appointment in appointments:
        label = normalize_display(appointment.field)
        normalized = normalize_search(label)
        variants[aliases.get(normalized, normalized)][label] += 1

    approved_targets = {item.target_key: item.target_label for item in entries}
    labels: dict[str, str] = {}
    for field_key, counts in variants.items():
        if field_key in approved_targets:
            labels[field_key] = approved_targets[field_key]
            continue
        labels[field_key] = min(
            counts,
            key=lambda label: (-counts[label], _slovak_sort_key(label), label),
        )

    return FieldCatalog(
        aliases=MappingProxyType(dict(aliases)),
        labels=MappingProxyType(dict(sorted(labels.items()))),
        alias_entries=tuple(entries),
    )
