from __future__ import annotations

import argparse
import json
import math
import re
from collections import Counter, defaultdict
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any


def _pearson(left: Sequence[float], right: Sequence[float]) -> float | None:
    if len(left) < 2 or len(left) != len(right):
        return None
    left_mean = sum(left) / len(left)
    right_mean = sum(right) / len(right)
    numerator = sum(
        (left_value - left_mean) * (right_value - right_mean)
        for left_value, right_value in zip(left, right, strict=True)
    )
    left_ss = sum((value - left_mean) ** 2 for value in left)
    right_ss = sum((value - right_mean) ** 2 for value in right)
    denominator = math.sqrt(left_ss * right_ss)
    return numerator / denominator if denominator else None


def _ceremony_metrics(records: Sequence[Mapping[str, Any]]) -> dict[str, Any]:
    by_date = Counter(str(record["appointedOn"]) for record in records)
    by_year = Counter(int(record["appointedOn"][:4]) for record in records)
    peak_year, peak_events = max(by_year.items(), key=lambda item: (item[1], -item[0]))
    largest_date, largest_events = max(
        by_date.items(), key=lambda item: (item[1], item[0])
    )
    november_events = sum(
        count for date_value, count in by_date.items() if date_value[5:7] == "11"
    )
    november_ceremonies = sum(date_value[5:7] == "11" for date_value in by_date)
    top_ten_events = sum(sorted(by_date.values(), reverse=True)[:10])
    peak_without_largest = peak_events - (
        largest_events if int(largest_date[:4]) == peak_year else 0
    )
    return {
        "peak_year": peak_year,
        "peak_events": peak_events,
        "largest_ceremony_date": largest_date,
        "largest_ceremony_events": largest_events,
        "peak_events_without_largest_ceremony": peak_without_largest,
        "top_ten_ceremony_event_share": top_ten_events / len(records),
        "mean_ceremony_size": len(records) / len(by_date),
        "november_events": november_events,
        "november_ceremonies": november_ceremonies,
        "november_event_share": november_events / len(records),
        "november_ceremony_share": november_ceremonies / len(by_date),
        "november_mean_ceremony_size": (
            november_events / november_ceremonies if november_ceremonies else None
        ),
    }


def _title_metrics(records: Sequence[Mapping[str, Any]]) -> dict[str, Any]:
    counts: dict[int, Counter[str]] = defaultdict(Counter)
    for record in records:
        year = int(record["appointedOn"][:4])
        titles = str(record.get("titlesAfter") or "")
        if re.search(r"\bPhD\b", titles, re.IGNORECASE):
            counts[year]["phd"] += 1
        if re.search(r"\bCSc\b", titles, re.IGNORECASE):
            counts[year]["csc"] += 1
    first_plurality = next(
        (
            year
            for year in sorted(counts)
            if counts[year]["phd"] > counts[year]["csc"]
        ),
        None,
    )
    return {
        "by_year": {
            str(year): {"phd": values["phd"], "csc": values["csc"]}
            for year, values in sorted(counts.items())
        },
        "first_phd_plurality_year": first_plurality,
    }


def _field_coverage(
    comparison: Mapping[str, Any], context: Sequence[Mapping[str, Any]]
) -> dict[str, Any]:
    context_by_year = {int(row["year"]): row for row in context}
    years = [int(year_row["year"]) for year_row in comparison.get("years", [])]
    graduate_coverage = {}
    for index, year in enumerate(years):
        matched = sum(
            row["graduateCounts"][index]
            for row in comparison.get("rows", [])
            if row["graduateCounts"][index] is not None
        )
        total = context_by_year[year]["graduates"]
        graduate_coverage[str(year)] = matched / total if total else None
    latest_context = context_by_year[max(context_by_year)]
    matched_students = sum(
        row["currentStudentCount"]
        for row in comparison.get("rows", [])
        if row.get("currentStudentCount") is not None
    )
    return {
        "graduates": graduate_coverage,
        "current_students": matched_students / latest_context["students"],
    }


def _stock_flow(
    records: Sequence[Mapping[str, Any]], context: Sequence[Mapping[str, Any]]
) -> dict[str, Any]:
    ordered = sorted(context, key=lambda row: int(row["year"]))
    stock_change = int(ordered[-1]["internalProfessors"]) - int(
        ordered[0]["internalProfessors"]
    )
    negative_transitions = sum(
        int(right["internalProfessors"]) < int(left["internalProfessors"])
        for left, right in zip(ordered, ordered[1:])
    )
    return {
        "appointment_events": len(records),
        "professor_stock_change": stock_change,
        "negative_stock_transitions": negative_transitions,
        "stock_transitions": max(0, len(ordered) - 1),
    }


def _geography(
    records: Sequence[Mapping[str, Any]], affiliations: Sequence[Mapping[str, Any]]
) -> dict[str, Any]:
    city_by_affiliation = {
        str(affiliation["id"]): str(affiliation["city"])
        for affiliation in affiliations
        if affiliation.get("status") == "resolved" and affiliation.get("city")
    }
    located = [
        (record, city_by_affiliation[str(record["affiliationId"])])
        for record in records
        if str(record.get("affiliationId")) in city_by_affiliation
    ]
    institution_cities: dict[str, Counter[str]] = defaultdict(Counter)
    for record, city in located:
        institution_cities[str(record["institutionId"])][city] += 1
    dominant = sum(max(cities.values()) for cities in institution_cities.values())

    pooled_bratislava_share = {
        institution: cities["Bratislava"] / sum(cities.values())
        for institution, cities in institution_cities.items()
    }
    annual_institutions: dict[int, Counter[str]] = defaultdict(Counter)
    annual_cities: dict[int, Counter[str]] = defaultdict(Counter)
    for record, city in located:
        year = int(record["appointedOn"][:4])
        annual_institutions[year][str(record["institutionId"])] += 1
        annual_cities[year][city] += 1
    observed = []
    predicted = []
    for year in sorted(annual_institutions):
        total = sum(annual_institutions[year].values())
        observed.append(annual_cities[year]["Bratislava"] / total)
        predicted.append(
            sum(
                count * pooled_bratislava_share[institution]
                for institution, count in annual_institutions[year].items()
            )
            / total
        )
    correlation = _pearson(observed, predicted)
    return {
        "resolved_events": len(located),
        "unresolved_events": len(records) - len(located),
        "institution_dominant_city_share": dominant / len(located),
        "bratislava_shift_share_correlation": correlation,
        "bratislava_shift_share_r_squared": (
            correlation**2 if correlation is not None else None
        ),
        "bratislava_shift_share_mean_absolute_error": sum(
            abs(actual - fitted)
            for actual, fitted in zip(observed, predicted, strict=True)
        )
        / len(observed),
    }


def analyze_atlas(atlas: Mapping[str, Any]) -> dict[str, Any]:
    context = sorted(atlas["context"], key=lambda row: int(row["year"]))
    start_year = int(context[0]["year"])
    end_year = int(context[-1]["year"])
    records = [
        record
        for record in atlas["records"]
        if start_year <= int(record["appointedOn"][:4]) <= end_year
    ]
    return {
        "coverage": {
            "start_year": start_year,
            "end_year": end_year,
            "events": len(records),
            "ceremonies": len({record["appointedOn"] for record in records}),
        },
        "ceremony_bundling": _ceremony_metrics(records),
        "title_notation": _title_metrics(records),
        "field_coverage": _field_coverage(
            atlas["fieldEducationComparison"], context
        ),
        "stock_flow": _stock_flow(records, context),
        "geography": _geography(records, atlas["affiliations"]),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--atlas", type=Path, default=Path("public/data/atlas.json"))
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    result = analyze_atlas(json.loads(args.atlas.read_text()))
    rendered = json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered)
    else:
        print(rendered, end="")


if __name__ == "__main__":
    main()
