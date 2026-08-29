import unicodedata


def normalize_display(value: object) -> str:
    """Return source text with Unicode whitespace collapsed for display."""
    if value is None:
        return ""
    return " ".join(str(value).replace("\u00a0", " ").split())


def normalize_search(value: str) -> str:
    """Return a case- and accent-insensitive identity/search key."""
    display = normalize_display(value)
    decomposed = unicodedata.normalize("NFKD", display)
    return "".join(character for character in decomposed if not unicodedata.combining(character)).casefold()
