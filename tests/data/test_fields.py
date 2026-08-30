import json
from pathlib import Path

import pytest

from pipeline.fields import FieldAliasError, build_field_catalog
from pipeline.professors import load_appointments
from pipeline.text import normalize_search


ROOT = Path(__file__).resolve().parents[2]
PROFESSORS = ROOT / "public/data/source/professors.xls"
ALIASES = ROOT / "data/config/field-aliases.json"


def _appointments():
    return load_appointments(PROFESSORS).appointments


def test_reviewed_aliases_assign_keys_without_mutating_raw_labels() -> None:
    appointments = _appointments()
    catalog = build_field_catalog(appointments, ALIASES)

    assert len(catalog.aliases) == 13
    assert len(catalog.labels) == 416
    assert catalog.key_for("verejné zravotníctvo") == "verejne zdravotnictvo"
    assert catalog.label_for("verejne zdravotnictvo") == "verejné zdravotníctvo"
    assert catalog.key_for("medzináro+dné vzťahy") == "medzinarodne vztahy"
    assert any(item.field == "verejné zravotníctvo" for item in appointments)


def test_unreviewed_neighbors_remain_separate() -> None:
    catalog = build_field_catalog(_appointments(), ALIASES)

    assert catalog.key_for("medzinárodné vzťahy") != catalog.key_for(
        "medzinárodné-vzťahy"
    )
    assert catalog.key_for("právo") != catalog.key_for("občianske právo")


def test_catalog_preserves_source_variant_universe() -> None:
    appointments = _appointments()
    catalog = build_field_catalog(appointments, ALIASES)

    assert len({item.field for item in appointments}) == 431
    assert len({normalize_search(item.field) for item in appointments}) == 429
    assert len(
        {variant.field for item in appointments for variant in item.source_variants}
    ) == 450
    assert len(catalog.labels) == 416


@pytest.mark.parametrize(
    ("mapping", "message"),
    [
        ({"mikobiológia": "neexistujúci cieľ"}, "target"),
        (
            {
                "mikobiológia": "mikrobiológia",
                "mikrobiológia": "biológia",
            },
            "chain",
        ),
        (
            {
                "mikobiológia": "mikrobiológia",
                "mikrobiológia": "mikobiológia",
            },
            "cycle",
        ),
    ],
)
def test_alias_validation_rejects_invalid_graphs(
    tmp_path: Path, mapping: dict[str, str], message: str
) -> None:
    path = tmp_path / "aliases.json"
    path.write_text(json.dumps(mapping, ensure_ascii=False), encoding="utf-8")

    with pytest.raises(FieldAliasError, match=message):
        build_field_catalog(_appointments(), path)
