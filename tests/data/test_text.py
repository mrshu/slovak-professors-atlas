from pipeline.text import normalize_display, normalize_search


def test_normalize_display_collapses_non_breaking_and_repeated_whitespace() -> None:
    assert normalize_display(" doc.\u00a0  RNDr. ") == "doc. RNDr."


def test_normalize_search_removes_accents_and_case_distinctions() -> None:
    assert normalize_search("Ľubomír Šoltés") == "lubomir soltes"
