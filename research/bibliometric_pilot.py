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
            candidate_names = [
                str(employee["name"])
                for employee in employee_rows
                if employee["institution"] == institution
                and set(employee["ranks"]) == {rank}
            ]
            normalized_counts: dict[str, int] = {}
            for name in candidate_names:
                normalized = normalize_name(name)
                normalized_counts[normalized] = normalized_counts.get(normalized, 0) + 1
            eligible = []
            for name in candidate_names:
                normalized = normalize_name(name)
                if normalized_counts[normalized] != 1:
                    continue
                digest = hashlib.sha256(
                    f"{salt}|{institution}|{rank}|{normalized}".encode()
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
    rows: Sequence[Mapping[str, Any]],
    *,
    observation_year: int,
    minimum_per_rank: int = 30,
) -> dict[str, Any]:
    eligible = [
        row
        for row in rows
        if row.get("review_status") == "verified"
        and row.get("rank_status") == "consistent"
    ]
    grouped = {
        rank: [row for row in eligible if row["rank"] == rank]
        for rank in ("professor", "docent")
    }
    if min(len(rank_rows) for rank_rows in grouped.values()) < minimum_per_rank:
        raise ValueError(
            f"minimum per rank is {minimum_per_rank}; "
            "outcome aggregation is suppressed"
        )
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
        "excluded_ineligible": len(rows) - len(eligible),
        "groups": groups,
        "contrasts": contrasts,
    }


def summarize_linkage_feasibility(
    rows: Sequence[Mapping[str, Any]], *, minimum_per_rank: int
) -> dict[str, Any]:
    primary = [
        row
        for row in rows
        if row.get("review_status") == "verified"
        and row.get("rank_status") == "consistent"
    ]
    primary_by_rank = {
        rank: sum(row.get("rank") == rank for row in primary)
        for rank in ("professor", "docent")
    }
    return {
        "selected": len(rows),
        "verified_identity": sum(
            row.get("review_status") == "verified" for row in rows
        ),
        "rank_conflicts": sum(
            row.get("rank_status") == "conflict" for row in rows
        ),
        "primary_usable": len(primary),
        "primary_by_rank": primary_by_rank,
        "minimum_per_rank": minimum_per_rank,
        "minimum_cell_gate_passed": min(primary_by_rank.values()) >= minimum_per_rank,
        "outcome_metrics_published": False,
    }
