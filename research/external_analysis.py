from __future__ import annotations

import argparse
import hashlib
import json
import math
import urllib.request
from collections.abc import Mapping, Sequence
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_SOURCES = {
    "gdp_growth": "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_gdp?lang=en&geo=SK&na_item=B1GQ&unit=CLV_PCH_PRE&sinceTimePeriod=2000",
    "higher_education_rd_percent_gdp": "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/rd_e_gerdtot?lang=en&geo=SK&sectperf=HES&unit=PC_GDP&sinceTimePeriod=2000",
    "unemployment_percent": "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/une_rt_a?lang=en&geo=SK&age=Y15-74&unit=PC_ACT&sex=T&sinceTimePeriod=2000",
    "net_migration_plus_adjustment": "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_gind?lang=en&geo=SK&indic_de=CNMIGRAT&sinceTimePeriod=2000",
    "nominal_fte_salary_eur": "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_fte?lang=en&geo=SK&unit=EUR&sinceTimePeriod=2000",
}


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


def extract_jsonstat_series(payload: Mapping[str, Any]) -> dict[int, float | None]:
    dimensions = list(payload["id"])
    sizes = list(payload["size"])
    time_position = dimensions.index("time")
    if any(size != 1 for index, size in enumerate(sizes) if index != time_position):
        raise ValueError("expected a single filtered series")
    time_index = payload["dimension"]["time"]["category"]["index"]
    if isinstance(time_index, Mapping):
        positions = {int(year): int(position) for year, position in time_index.items()}
    else:
        positions = {int(year): position for position, year in enumerate(time_index)}
    raw_values = payload.get("value", {})
    if isinstance(raw_values, Sequence) and not isinstance(raw_values, (str, bytes)):
        values = {position: value for position, value in enumerate(raw_values)}
    else:
        values = {int(position): value for position, value in raw_values.items()}
    return {
        year: (
            float(values[position])
            if position in values and values[position] is not None
            else None
        )
        for year, position in sorted(positions.items())
    }


def _paired_correlation(pairs: Sequence[tuple[float, float]]) -> dict[str, Any]:
    return {
        "n": len(pairs),
        "pearson": _pearson(
            [left for left, _ in pairs], [right for _, right in pairs]
        ),
    }


def correlate_annual_series(
    appointments: Mapping[int, int | float],
    external: Mapping[int, int | float | None],
    *,
    lags: Sequence[int],
) -> dict[str, Any]:
    level_pairs = [
        (float(appointments[year]), float(external[year]))
        for year in sorted(set(appointments) & set(external))
        if external[year] is not None
    ]
    difference_pairs = []
    for year in sorted(set(appointments) & set(external)):
        if year - 1 not in appointments or year - 1 not in external:
            continue
        if external[year] is None or external[year - 1] is None:
            continue
        difference_pairs.append(
            (
                float(appointments[year]) - float(appointments[year - 1]),
                float(external[year]) - float(external[year - 1]),
            )
        )
    lag_results = {}
    difference_lag_results = {}
    for lag in lags:
        pairs = [
            (float(value), float(external[year - lag]))
            for year, value in sorted(appointments.items())
            if year - lag in external and external[year - lag] is not None
        ]
        lag_results[str(lag)] = _paired_correlation(pairs)
        difference_pairs_for_lag = []
        for year, value in sorted(appointments.items()):
            external_year = year - lag
            if year - 1 not in appointments:
                continue
            if (
                external_year not in external
                or external_year - 1 not in external
                or external[external_year] is None
                or external[external_year - 1] is None
            ):
                continue
            difference_pairs_for_lag.append(
                (
                    float(value) - float(appointments[year - 1]),
                    float(external[external_year])
                    - float(external[external_year - 1]),
                )
            )
        difference_lag_results[str(lag)] = _paired_correlation(
            difference_pairs_for_lag
        )
    return {
        "level": _paired_correlation(level_pairs),
        "first_difference": _paired_correlation(difference_pairs),
        "lags": lag_results,
        "first_difference_lags": difference_lag_results,
    }


def _fetch(url: str) -> tuple[dict[str, Any], str, str]:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "slovak-professors-atlas-research/1.0"},
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        raw = response.read()
    retrieved_at = datetime.now(timezone.utc).isoformat()
    return json.loads(raw), hashlib.sha256(raw).hexdigest(), retrieved_at


def analyze_external(atlas: Mapping[str, Any]) -> dict[str, Any]:
    appointments = {
        int(row["year"]): int(row["appointments"])
        for row in atlas["context"]
    }
    sources = {}
    for name, url in _SOURCES.items():
        payload, digest, retrieved_at = _fetch(url)
        series = extract_jsonstat_series(payload)
        sources[name] = {
            "url": url,
            "sha256": digest,
            "retrieved_at": retrieved_at,
            "provider": "Eurostat",
            "license": "European Commission reuse policy / CC BY 4.0",
            "license_url": "https://ec.europa.eu/eurostat/help/copyright-notice",
            "updated": payload.get("updated"),
            "label": payload.get("label"),
            "series": {str(year): value for year, value in series.items()},
            "association_with_appointments": correlate_annual_series(
                appointments, series, lags=[0, 1, 2, 3]
            ),
        }
    return {
        "interpretation": "Screening diagnostics only; annual levels and changes do not identify causality.",
        "appointment_years": [min(appointments), max(appointments)],
        "sources": sources,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--atlas", type=Path, default=Path("public/data/atlas.json"))
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    result = analyze_external(json.loads(args.atlas.read_text()))
    rendered = json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered)
    else:
        print(rendered, end="")


if __name__ == "__main__":
    main()
