import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))
import pandas as pd
import scope3_commuting as s


def test_parse_km_handles_free_text():
    assert s.parse_km("4 km") == 4 and s.parse_km("500m") == 0.5 and s.parse_km("2-3 km") == 2.5
    assert s.parse_km("Home") is None and s.parse_km("Under 10 km") is None and s.parse_km(7) == 7


def test_emission_is_distance_days_weeks_factor():
    d = pd.DataFrame({"dist": [10.0], "days": [5.5], "mode": ["Two-wheeler"], "status": ["ok"]})
    kg = s.emissions(d)["kg"].iloc[0]
    assert abs(kg - 10 * 2 * 5.5 * 41 * 0.03743) < 1e-9


def test_bad_rows_are_flagged_not_dropped_silently():
    d = pd.DataFrame({"name_key": ["a", "a", "b"], "dist": [5.0, 5.0, 99.0], "days": [5.5] * 3, "mode": ["Bus"] * 3})
    assert list(s.clean(d)["status"]) == ["ok", "duplicate name (kept first)", "distance above 60 km"]
