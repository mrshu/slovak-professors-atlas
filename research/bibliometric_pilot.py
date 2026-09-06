from __future__ import annotations

import hashlib
import math
import re
import unicodedata
from collections.abc import Iterable, Mapping, Sequence
from statistics import median
from typing import Any

_TITLE_TOKENS = {
    "csc",
    "doc",
    "dr",
    "drsc",
    "ing",
    "judr",
    "mgr",
    "mudr",
    "phd",
    "prof",
    "rndr",
}
_METRICS = ("works", "citations", "h_index", "i10")


def normalize_name(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", value)
    ascii_value = "".join(char for char in decomposed if not unicodedata.combining(char))
    words = re.findall(r"[a-z]+", ascii_value.casefold())
    return " ".join(word for word in words if word not in _TITLE_TOKENS)


def select_rank_sample(
    employees: Iterable[Mapping[str, Any]],
    institutions: Sequence[str],
    *,
    per_rank: int,
    salt: str,
) -> list[dict[str, str]]:
    employee_rows = list(employees)
    selected: list[dict[str, str]] = []
    for institution in institutions:
        for rank in ("professor", "docent"):
            eligible = []
            for employee in employee_rows:
                ranks = set(employee["ranks"])
                if employee["institution"] != institution or ranks != {rank}:
                    continue
                name = str(employee["name"])
                digest = hashlib.sha256(
                    f"{salt}|{institution}|{rank}|{normalize_name(name)}".encode()
                ).hexdigest()
                eligible.append((digest, name))
            for _, name in sorted(eligible)[:per_rank]:
                selected.append({"name": name, "institution": institution, "rank": rank})
    return selected


def triage_openalex_candidates(
    employee_name: str,
    candidates: Iterable[Mapping[str, Any]],
    target_ror: str,
    *,
    minimum_recent_year: int,
) -> dict[str, Any]:
    expected_name = normalize_name(employee_name)
    expected_ror = f"https://ror.org/{target_ror}"
    matches = []
    for candidate in candidates:
        names = [candidate.get("display_name", "")]
        names.extend(candidate.get("display_name_alternatives") or [])
        if expected_name not in {normalize_name(str(name)) for name in names}:
            continue
        if int(candidate.get("works_count") or 0) < 1:
            continue
        has_recent_affiliation = any(
            affiliation.get("institution", {}).get("ror") == expected_ror
            and max(affiliation.get("years") or [-math.inf]) >= minimum_recent_year
            for affiliation in candidate.get("affiliations") or []
        )
        if has_recent_affiliation:
            matches.append(str(candidate["id"]))
    if len(matches) == 1:
        return {
            "status": "manual_review",
            "candidate_ids": matches,
            "reason_codes": ["exact_name", "recent_target_ror"],
        }
    return {
        "status": "unresolved",
        "candidate_ids": matches,
        "reason_codes": ["multiple_candidates" if matches else "no_candidate"],
    }


def _distribution(values: Sequence[float]) -> dict[str, float | int]:
    return {
        "median": median(values),
        "minimum": min(values),
        "maximum": max(values),
    }


def _rank_biserial(professors: Sequence[float], docents: Sequence[float]) -> float:
    wins = sum(left > right for left in professors for right in docents)
    losses = sum(left < right for left in professors for right in docents)
    return (wins - losses) / (len(professors) * len(docents))


def aggregate_rank_metrics(
    rows: Sequence[Mapping[str, Any]], *, observation_year: int
) -> dict[str, Any]:
    verified = [row for row in rows if row.get("review_status") == "verified"]
    grouped = {
        rank: [row for row in verified if row["rank"] == rank]
        for rank in ("professor", "docent")
    }
    groups: dict[str, Any] = {}
    for rank, rank_rows in grouped.items():
        metrics = {
            metric: _distribution([float(row["metrics"][metric]) for row in rank_rows])
            for metric in _METRICS
        }
        publication_ages = [
            observation_year - int(row["first_publication_year"])
            for row in rank_rows
        ]
        groups[rank] = {
            "n": len(rank_rows),
            "metrics": metrics,
            "observed_publication_age": _distribution(publication_ages),
        }

    contrasts = {}
    for metric in _METRICS:
        professor_values = [float(row["metrics"][metric]) for row in grouped["professor"]]
        docent_values = [float(row["metrics"][metric]) for row in grouped["docent"]]
        professor_median = median(professor_values)
        docent_median = median(docent_values)
        contrasts[metric] = {
            "median_difference_professor_minus_docent": professor_median - docent_median,
            "median_ratio_professor_to_docent": (
                professor_median / docent_median if docent_median else None
            ),
            "rank_biserial": _rank_biserial(professor_values, docent_values),
        }

    return {
        "excluded_unverified": len(rows) - len(verified),
        "groups": groups,
        "contrasts": contrasts,
    }
