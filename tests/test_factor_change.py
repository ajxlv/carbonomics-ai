import os, sys
import pandas as pd
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
import emission_factors as ef
import factor_change as fc


def periods(extra_2025=0.0, start="2024-01-01", end="2025-12-28"):
    return [{"period_start": str(d.date()), "electricity_kwh": 20000 + (extra_2025 if d.year == 2025 else 0), "diesel_litres": 80.0}
            for d in pd.date_range(start, end, freq="7D")]


def test_registry_documented_and_matches_current_factor():
    for v in ef.grid_factor_versions():
        assert v["source"] and v["version"] and v["unit"]
    assert round(ef.GRID_FACTOR_BY_FY["2024-25"]["factor"], 2) == ef.EMISSION_FACTORS["electricity"]["factor"]


def test_effects_add_up_exactly():
    r = fc.compare(periods(1500), 2024, 2025, "2023-24", "2025-26")
    t = r["totals"]
    assert t["activity_effect_t"] + t["factor_effect_t"] == pytest.approx(t["change_t"], abs=1e-9)
    assert t["activity_effect_t"] > 0 and t["factor_effect_t"] < 0


def test_same_use_only_factor_effect():
    r = fc.compare(periods(0), 2024, 2025, "2023-24", "2025-26")
    rows = {x["source"]: x for x in r["rows"]}
    assert rows["electricity_kwh"]["factor_effect_t"] < 0
    assert abs(r["totals"]["activity_effect_t"]) < 40      # only the 1-2 weeks fewer in the later year
    assert rows["diesel_litres"]["factor_effect_t"] == 0


def test_same_factor_gives_zero_factor_effect():
    r = fc.compare(periods(1500), 2024, 2025, "2024-25", "2024-25")
    assert r["totals"]["factor_effect_t"] == 0


def test_incomplete_year_and_bad_input_rejected():
    with pytest.raises(fc.FactorChangeError):
        fc.compare(periods(0, end="2025-03-01"), 2024, 2025, "2023-24", "2024-25")
    with pytest.raises(fc.FactorChangeError):
        fc.compare(periods(), 2024, 2025, "1999-00", "2024-25")
    with pytest.raises(fc.FactorChangeError):
        fc.compare(periods(), 2024, 2024, "2023-24", "2024-25")


def test_plain_sentences():
    r = fc.compare(periods(1500), 2024, 2025, "2023-24", "2025-26")
    text = " ".join(r["sentences"])
    assert "cleaner grid" in text and "more energy" in text
