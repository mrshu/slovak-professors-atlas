from __future__ import annotations

from research.bibliometric_pilot import (
    aggregate_rank_metrics,
    triage_openalex_candidates,
    normalize_name,
    select_rank_sample,
)


def test_normalize_name_preserves_word_identity_across_diacritics_and_titles() -> None:
    assert normalize_name("  prof. Katarína Slobodová-Nováková, PhD. ") == (
        "katarina slobodova novakova"
    )


def test_select_rank_sample_is_balanced_deterministic_and_excludes_mixed_ranks() -> None:
    employees = [
        {"name": "Professor One", "institution": "uniba", "ranks": ["professor"]},
        {"name": "Professor Two", "institution": "uniba", "ranks": ["professor"]},
        {"name": "Professor Three", "institution": "uniba", "ranks": ["professor"]},
        {"name": "Docent One", "institution": "uniba", "ranks": ["docent"]},
        {"name": "Docent Two", "institution": "uniba", "ranks": ["docent"]},
        {"name": "Docent Three", "institution": "uniba", "ranks": ["docent"]},
        {
            "name": "Mixed Rank",
            "institution": "uniba",
            "ranks": ["professor", "docent"],
        },
    ]

    first = select_rank_sample(employees, ["uniba"], per_rank=2, salt="pilot-v1")
    second = select_rank_sample(reversed(employees), ["uniba"], per_rank=2, salt="pilot-v1")

    assert first == second
    assert len(first) == 4
    assert {row["rank"] for row in first} == {"professor", "docent"}
    assert "Mixed Rank" not in {row["name"] for row in first}


def test_triage_never_promotes_name_and_affiliation_to_verified_identity() -> None:
    candidates = [
        {
            "id": "https://openalex.org/A1",
            "display_name": "Ján Novák",
            "display_name_alternatives": [],
            "works_count": 12,
            "affiliations": [
                {
                    "institution": {"ror": "https://ror.org/0587ef340"},
                    "years": [2025, 2024],
                }
            ],
        },
        {
            "id": "https://openalex.org/A2",
            "display_name": "Jan Novak",
            "display_name_alternatives": [],
            "works_count": 50,
            "affiliations": [
                {
                    "institution": {"ror": "https://ror.org/other"},
                    "years": [2025],
                }
            ],
        },
    ]

    result = triage_openalex_candidates(
        "Ján Novák", candidates, "0587ef340", minimum_recent_year=2023
    )

    assert result == {
        "status": "manual_review",
        "candidate_ids": ["https://openalex.org/A1"],
        "reason_codes": ["exact_name", "recent_target_ror"],
    }

    candidates[1]["affiliations"][0]["institution"]["ror"] = (
        "https://ror.org/0587ef340"
    )
    assert triage_openalex_candidates(
        "Ján Novák", candidates, "0587ef340", minimum_recent_year=2023
    ) == {
        "status": "unresolved",
        "candidate_ids": [
            "https://openalex.org/A1",
            "https://openalex.org/A2",
        ],
        "reason_codes": ["multiple_candidates"],
    }


def test_aggregate_rank_metrics_reports_groups_without_person_identifiers() -> None:
    rows = [
        {
            "name": "Professor One",
            "openalex_id": "A1",
            "institution": "uniba",
            "rank": "professor",
            "first_publication_year": 2000,
            "review_status": "verified",
            "metrics": {"works": 100, "citations": 500, "h_index": 12, "i10": 20},
        },
        {
            "name": "Professor Two",
            "openalex_id": "A2",
            "institution": "uniba",
            "rank": "professor",
            "first_publication_year": 2010,
            "metrics": {"works": 50, "citations": 100, "h_index": 8, "i10": 9},
            "review_status": "verified",
        },
        {
            "name": "Docent One",
            "openalex_id": "A3",
            "institution": "uniba",
            "rank": "docent",
            "first_publication_year": 2015,
            "metrics": {"works": 30, "citations": 60, "h_index": 5, "i10": 4},
            "review_status": "verified",
        },
        {
            "name": "Docent Two",
            "openalex_id": "A4",
            "institution": "uniba",
            "rank": "docent",
            "first_publication_year": 2020,
            "metrics": {"works": 10, "citations": 10, "h_index": 2, "i10": 1},
            "review_status": "verified",
        },
        {
            "name": "Unreviewed Candidate",
            "openalex_id": "A5",
            "institution": "uniba",
            "rank": "professor",
            "review_status": "manual_review",
            "first_publication_year": 1990,
            "metrics": {"works": 500, "citations": 5000, "h_index": 50, "i10": 100},
        },
    ]

    result = aggregate_rank_metrics(rows, observation_year=2026)

    assert result["groups"]["professor"]["n"] == 2
    assert result["excluded_unverified"] == 1
    assert result["groups"]["professor"]["metrics"]["citations"]["median"] == 300
    assert result["groups"]["docent"]["metrics"]["h_index"]["median"] == 3.5
    assert result["contrasts"]["citations"]["median_ratio_professor_to_docent"] == (
        300 / 35
    )
    assert result["contrasts"]["h_index"]["rank_biserial"] == 1.0
    assert result["groups"]["professor"]["observed_publication_age"]["median"] == 21
    rendered = repr(result)
    assert "Professor One" not in rendered
    assert "A1" not in rendered
