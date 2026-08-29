import json
from pathlib import Path

import pytest

from pipeline.population import PopulationDataError, load_population


PROJECT_ROOT = Path(__file__).resolve().parents[2]
POPULATION_SOURCE = PROJECT_ROOT / "public/data/source/population.json"


def test_load_population_maps_json_stat_positions_to_supported_years() -> None:
    population = load_population(POPULATION_SOURCE)

    assert tuple(population) == tuple(range(2000, 2026))
    assert population[2000] == 5_400_637
    assert population[2020] == 5_460_136
    assert population[2025] == 5_413_600


def test_load_population_rejects_missing_supported_year(tmp_path: Path) -> None:
    payload = json.loads(POPULATION_SOURCE.read_text(encoding="utf-8"))
    del payload["dimension"]["om7102rr_obd"]["category"]["index"]["2000"]
    path = tmp_path / "population.json"
    path.write_text(json.dumps(payload), encoding="utf-8")

    with pytest.raises(PopulationDataError, match="supported years"):
        load_population(path)


def test_load_population_rejects_null_population(tmp_path: Path) -> None:
    payload = json.loads(POPULATION_SOURCE.read_text(encoding="utf-8"))
    payload["value"][0] = None
    path = tmp_path / "population.json"
    path.write_text(json.dumps(payload), encoding="utf-8")

    with pytest.raises(PopulationDataError, match="positive integer"):
        load_population(path)
