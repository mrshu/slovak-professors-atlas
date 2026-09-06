from __future__ import annotations

import argparse
import itertools
import json
import math
import random
from collections import Counter, defaultdict
from collections.abc import Mapping, Sequence
from datetime import date, timedelta
from pathlib import Path
from typing import Any


def _pearson(left: Sequence[float], right: Sequence[float]) -> float | None:
    if len(left) < 2:
        return None
    left_mean = sum(left) / len(left)
    right_mean = sum(right) / len(right)
    numerator = sum(
        (left_value - left_mean) * (right_value - right_mean)
        for left_value, right_value in zip(left, right, strict=True)
    )
    denominator = math.sqrt(
        sum((value - left_mean) ** 2 for value in left)
        * sum((value - right_mean) ** 2 for value in right)
    )
    return numerator / denominator if denominator else None


def _detrend(years: Sequence[float], values: Sequence[float]) -> list[float]:
    year_mean = sum(years) / len(years)
    value_mean = sum(values) / len(values)
    denominator = sum((year - year_mean) ** 2 for year in years)
    slope = (
        sum(
            (year - year_mean) * (value - value_mean)
            for year, value in zip(years, values, strict=True)
        )
        / denominator
    )
    intercept = value_mean - slope * year_mean
    return [
        value - (intercept + slope * year)
        for year, value in zip(years, values, strict=True)
    ]


def analyze_context_correlations(
    context: Sequence[Mapping[str, Any]], fields: Sequence[str]
) -> dict[str, Any]:
    ordered = sorted(context, key=lambda row: int(row["year"]))
    years = [float(row["year"]) for row in ordered]
    appointments = [float(row["appointments"]) for row in ordered]
    result = {}
    for field in fields:
        values = [float(row[field]) for row in ordered]
        result[field] = {
            "level": _pearson(appointments, values),
            "first_difference": _pearson(
                [right - left for left, right in zip(appointments, appointments[1:])],
                [right - left for left, right in zip(values, values[1:])],
            ),
            "detrended": _pearson(
                _detrend(years, appointments), _detrend(years, values)
            ),
        }
    return result


def term_end_batch_permutation(
    records: Sequence[Mapping[str, Any]],
    presidents: Sequence[Mapping[str, Any]],
    *,
    window_days: int,
    randomizations: int,
    seed: int,
) -> dict[str, Any]:
    completed = {
        str(president["id"]): date.fromisoformat(str(president["to"]))
        for president in presidents
        if president.get("to")
    }
    batches: dict[str, Counter[date]] = defaultdict(Counter)
    for record in records:
        president_id = str(record["presidentId"])
        if president_id in completed:
            batches[president_id][date.fromisoformat(str(record["appointedOn"]))] += 1

    ceremony_rows = [
        (president_id, ceremony_date, size)
        for president_id, ceremonies in batches.items()
        for ceremony_date, size in ceremonies.items()
    ]
    is_term_end = {
        (president_id, ceremony_date): (
            completed[president_id] - timedelta(days=window_days)
            <= ceremony_date
            < completed[president_id]
        )
        for president_id, ceremony_date, _ in ceremony_rows
    }
    observed = sum(
        size
        for president_id, ceremony_date, size in ceremony_rows
        if is_term_end[(president_id, ceremony_date)]
    )

    if len(ceremony_rows) <= 8 and len(batches) == 1:
        president_id = next(iter(batches))
        dates = list(batches[president_id])
        sizes = list(batches[president_id].values())
        null_values = [
            sum(
                size
                for ceremony_date, size in zip(dates, permutation, strict=True)
                if is_term_end[(president_id, ceremony_date)]
            )
            for permutation in itertools.permutations(sizes)
        ]
    else:
        generator = random.Random(seed)
        null_values = []
        for _ in range(randomizations):
            total = 0
            for president_id, ceremonies in batches.items():
                dates = list(ceremonies)
                sizes = list(ceremonies.values())
                generator.shuffle(sizes)
                total += sum(
                    size
                    for ceremony_date, size in zip(dates, sizes, strict=True)
                    if is_term_end[(president_id, ceremony_date)]
                )
            null_values.append(total)

    return {
        "window_days": window_days,
        "observed_events": observed,
        "term_end_ceremonies": sum(is_term_end.values()),
        "eligible_ceremonies": len(ceremony_rows),
        "null_mean_events": sum(null_values) / len(null_values),
        "one_sided_p": sum(value >= observed for value in null_values)
        / len(null_values),
        "randomizations": len(null_values),
        "seed": seed,
        "unit": "ceremony batches permuted within completed presidential terms",
    }


def analyze_robustness(atlas: Mapping[str, Any]) -> dict[str, Any]:
    complete_end_year = max(int(row["year"]) for row in atlas["context"])
    records = [
        record
        for record in atlas["records"]
        if int(record["appointedOn"][:4]) <= complete_end_year
    ]
    return {
        "context_correlations": analyze_context_correlations(
            atlas["context"],
            ["graduates", "students", "internalProfessors", "internalTeachers"],
        ),
        "term_end_test": term_end_batch_permutation(
            records,
            atlas["presidents"],
            window_days=180,
            randomizations=100_000,
            seed=20260907,
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--atlas", type=Path, default=Path("public/data/atlas.json"))
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    result = analyze_robustness(json.loads(args.atlas.read_text()))
    rendered = json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered)
    else:
        print(rendered, end="")


if __name__ == "__main__":
    main()
