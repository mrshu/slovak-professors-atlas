from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True, slots=True)
class SourceVariant:
    row_number: int
    titles_before: str
    titles_after: str
    faculty: str
    institution: str
    field: str


@dataclass(frozen=True, slots=True)
class Institution:
    id: str
    short_name: str
    full_name: str
    city: str
    latitude: float
    longitude: float
    source_labels: tuple[str, ...]
    citation_url: str


@dataclass(frozen=True, slots=True)
class President:
    id: str
    name: str
    from_date: date
    to_date: date | None
    citation_url: str


@dataclass(frozen=True, slots=True)
class Appointment:
    id: str
    name: str
    titles_before: str
    titles_after: str
    faculty: str
    institution_id: str
    institution_source: str
    field: str
    appointed_on: date
    president_id: str
    source_variants: tuple[SourceVariant, ...]


@dataclass(frozen=True, slots=True)
class ProfessorDataset:
    appointments: tuple[Appointment, ...]
    institutions: tuple[Institution, ...]
    presidents: tuple[President, ...]
    source_row_count: int
    duplicate_source_row_count: int
    date_min: date
    date_max: date
