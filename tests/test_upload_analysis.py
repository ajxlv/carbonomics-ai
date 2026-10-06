"""Tests for the CSV upload analysis and the /api endpoints. All data here is generated test data."""

import io
import os

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

import upload_analysis as ua
from emission_factors import EMISSION_FACTORS
from api.main import app

EF_E = EMISSION_FACTORS["electricity"]["factor"]
EF_D = EMISSION_FACTORS["diesel"]["factor"]
client = TestClient(app)


@pytest.fixture(autouse=True)
def _no_login(monkeypatch):
    """These tests are about the analysis, not the login (see test_auth_history.py)."""
    monkeypatch.setenv("AUTH_DISABLED", "1")


def to_csv(df: pd.DataFrame) -> bytes:
    return df.to_csv(index=False).encode()


def weekly_frame(n=52, seed=0):
    rng = np.random.default_rng(seed)
    return pd.DataFrame({
        "week_start": pd.date_range("2025-01-01", periods=n, freq="7D"),
        "electricity_kwh": 20000 + 1500 * np.sin(np.arange(n) / 4) + rng.normal(0, 300, n),
        "diesel_litres": rng.uniform(0, 40, n),
    })


def daily_frame(n_days):
    rng = np.random.default_rng(1)
    return pd.DataFrame({
        "date": pd.date_range("2025-01-01", periods=n_days, freq="D"),
        "electricity_kwh": 3000 + rng.normal(0, 100, n_days),
    })


def monthly_frame():
    return pd.DataFrame({
        "month": ["2025-%02d-01" % m for m in range(1, 13)],
        "electricity_kwh": np.linspace(80000, 100000, 12),
        "dg_diesel_litres": np.linspace(50, 600, 12),
    })


# ── happy paths ───────────────────────────────────────────────────────────────
def test_weekly_accounting_is_activity_times_factor():
    df = weekly_frame()
    res = ua.analyze(to_csv(df))
    totals = res["accounting"]["totals"]
    # per-row rounding to 2 decimals in calculations.py, so allow a small tolerance
    assert totals["scope2_tco2e"] == pytest.approx(df["electricity_kwh"].sum() * EF_E / 1000, abs=0.05)
    assert totals["scope1_tco2e"] == pytest.approx(df["diesel_litres"].sum() * EF_D / 1000, abs=0.05)
    assert totals["total_tco2e"] == pytest.approx(totals["scope1_tco2e"] + totals["scope2_tco2e"])
    assert {f["factor_key"] for f in res["factors_used"]} == {"electricity", "diesel"}
    assert all(f["source"] and f["version"] and f["unit"] for f in res["factors_used"])


def test_weekly_forecast_is_gated_and_emission_is_derived():
    res = ua.analyze(to_csv(weekly_frame()), future_weeks=6)
    fc = res["forecast"]
    assert fc["status"] == "ok"
    for target, block in fc["targets"].items():
        assert len(block["future"]) == 6
        assert block["chosen_model"] in {"naive_last_week", "random_forest", "xgboost"}
        assert block["beats_naive"] == (block["chosen_model"] != "naive_last_week")
        assert block["train_weeks"] + block["test_weeks"] == 52 - 4  # first 4 rows lack lags
        assert {m["model"] for m in block["metrics"]} >= {"naive_last_week", "train_mean"}
        assert all(v["predicted"] >= 0 for v in block["future"])
    for i, row in enumerate(fc["emission_future"]):
        e = fc["targets"]["electricity_kwh"]["future"][i]["predicted"]
        d = fc["targets"]["diesel_litres"]["future"][i]["predicted"]
        assert row["total_kg"] == pytest.approx(e * EF_E + d * EF_D, abs=0.05)


def test_future_dates_follow_last_week_in_7_day_steps():
    df = weekly_frame()
    res = ua.analyze(to_csv(df), future_weeks=3)
    dates = [pd.Timestamp(r["week_start"]) for r in res["forecast"]["targets"]["electricity_kwh"]["future"]]
    assert dates[0] == df["week_start"].iloc[-1] + pd.Timedelta(days=7)
    assert all((b - a) == pd.Timedelta(days=7) for a, b in zip(dates, dates[1:]))


def test_backtest_comes_after_training_weeks():
    res = ua.analyze(to_csv(weekly_frame()))
    block = res["forecast"]["targets"]["electricity_kwh"]
    first_test = pd.Timestamp(block["backtest"][0]["week_start"])
    # 4 lag rows dropped, then train_weeks rows, then the test block
    expected = pd.Timestamp("2025-01-01") + pd.Timedelta(days=7 * (4 + block["train_weeks"]))
    assert first_test == expected


def test_only_electricity_has_no_scope1():
    df = weekly_frame().drop(columns="diesel_litres")
    res = ua.analyze(to_csv(df))
    assert res["accounting"]["totals"]["scope1_tco2e"] == 0.0
    assert list(res["forecast"]["targets"]) == ["electricity_kwh"]


def test_daily_is_summed_to_weeks_and_partial_week_dropped():
    df = daily_frame(200)  # 28 full weeks + 4 days
    res = ua.analyze(to_csv(df))
    assert res["input"]["granularity_detected"] == "daily"
    assert res["input"]["rows"] == 28
    assert any("did not fill a whole week" in n for n in res["input"]["notes"])
    first_week_total = res["accounting"]["periods"][0]["electricity_kwh"]
    assert first_week_total == pytest.approx(df["electricity_kwh"].iloc[:7].sum())
    assert res["forecast"]["status"] == "ok"


def test_short_history_skips_forecast_but_still_accounts():
    res = ua.analyze(to_csv(daily_frame(70)))  # 10 weeks
    assert res["forecast"]["status"] == "skipped"
    assert str(ua.MIN_WEEKS_FOR_ML) in res["forecast"]["reason"]
    assert res["accounting"]["totals"]["scope2_tco2e"] > 0


@pytest.mark.parametrize("fmt", ["%Y-%m-01", "%Y-%m"])
def test_monthly_gets_accounting_only_and_accepts_dg_alias(fmt):
    df = monthly_frame()
    df["month"] = pd.to_datetime(df["month"]).dt.strftime(fmt)
    res = ua.analyze(to_csv(df))
    assert res["input"]["granularity_analysed"] == "monthly"
    assert res["forecast"]["status"] == "skipped"
    assert res["accounting"]["totals"]["scope1_tco2e"] == pytest.approx(
        df["dg_diesel_litres"].sum() * EF_D / 1000, abs=0.05)
    assert res["input"]["columns_used"]["diesel_litres"] == "dg_diesel_litres"


def test_explicit_column_mapping():
    df = weekly_frame().rename(columns={"week_start": "d", "electricity_kwh": "grid", "diesel_litres": "dsl"})
    res = ua.analyze(to_csv(df), date_col="d", electricity_col="grid", diesel_col="dsl")
    assert res["forecast"]["status"] == "ok"


def test_naive_fallback_when_models_cannot_win():
    # constant series: naive is exact, so no model can beat it
    df = weekly_frame()
    df["electricity_kwh"] = 5000.0
    df["diesel_litres"] = 10.0
    res = ua.analyze(to_csv(df))
    for block in res["forecast"]["targets"].values():
        assert block["chosen_model"] == "naive_last_week"
        assert not block["beats_naive"]
        assert all(v["predicted"] == pytest.approx(block["future"][0]["predicted"]) for v in block["future"])


# ── bad input is rejected, never repaired ─────────────────────────────────────
@pytest.mark.parametrize("mutate,match", [
    (lambda d: d.drop(columns="week_start"), "No date column"),
    (lambda d: d.drop(columns=["electricity_kwh", "diesel_litres"]), "No activity column"),
    (lambda d: d.assign(electricity_kwh=d["electricity_kwh"].where(d.index != 3)), "missing or non-numeric"),
    (lambda d: d.assign(electricity_kwh=d["electricity_kwh"].astype(object).where(d.index != 3, "abc")),
     "missing or non-numeric"),
    (lambda d: d.assign(diesel_litres=d["diesel_litres"].where(d.index != 5, -1.0)), "negative"),
    (lambda d: d.drop(index=10), "complete daily, weekly"),
    (lambda d: pd.concat([d, d.iloc[[0]]]), "repeated dates"),
    (lambda d: d.assign(week_start=d["week_start"].astype(str).where(d.index != 2, "not a date")), "valid dates"),
])
def test_bad_files_are_rejected(mutate, match):
    with pytest.raises(ua.UploadError, match=match):
        ua.analyze(to_csv(mutate(weekly_frame())))


def test_empty_and_wrong_mapping_and_future_weeks():
    with pytest.raises(ua.UploadError, match="empty"):
        ua.analyze(b"")
    with pytest.raises(ua.UploadError, match="not found"):
        ua.analyze(to_csv(weekly_frame()), electricity_col="nope")
    with pytest.raises(ua.UploadError, match="future_weeks"):
        ua.analyze(to_csv(weekly_frame()), future_weeks=0)
    with pytest.raises(ua.UploadError, match="larger than"):
        ua.analyze(b"a" * (ua.MAX_BYTES + 1))


def test_analysis_writes_nothing_to_disk():
    def snapshot():
        found = set()
        for root, dirs, files in os.walk("."):
            dirs[:] = [d for d in dirs if d not in {".git", "node_modules", "__pycache__", ".pytest_cache"}]
            found.update(os.path.join(root, f) for f in files)
        return found
    before = snapshot()
    ua.analyze(to_csv(weekly_frame()))
    assert snapshot() == before


# ── HTTP layer ────────────────────────────────────────────────────────────────
def test_api_health():
    assert client.get("/api/health").json() == {"status": "ok"}


def test_api_analyze_ok_and_form_fields():
    r = client.post("/api/analyze", files={"file": ("w.csv", to_csv(weekly_frame()), "text/csv")},
                    data={"future_weeks": "4"})
    assert r.status_code == 200
    body = r.json()
    assert len(body["forecast"]["targets"]["electricity_kwh"]["future"]) == 4
    assert body["disclaimer"]


def test_api_returns_422_with_readable_message():
    bad = weekly_frame().drop(columns="week_start")
    r = client.post("/api/analyze", files={"file": ("w.csv", to_csv(bad), "text/csv")})
    assert r.status_code == 422
    assert "No date column" in r.json()["detail"]


def test_api_rejects_oversized_file():
    r = client.post("/api/analyze", files={"file": ("big.csv", b"x" * (ua.MAX_BYTES + 10), "text/csv")})
    assert r.status_code == 422
    assert "larger than" in r.json()["detail"]


# ── what-if simulation on uploaded periods ────────────────────────────────────
def periods_of(df):
    return ua.analyze(to_csv(df))["accounting"]["periods"]


def test_simulation_zero_change_equals_baseline():
    res = ua.simulate_upload(periods_of(weekly_frame()))
    t = res["totals"]
    assert t["scenario_total_tco2e"] == pytest.approx(t["baseline_total_tco2e"])
    assert t["saved_tco2e"] == 0 and t["saved_pct"] == 0


def test_simulation_percentage_and_solar_savings_match_formula():
    df = weekly_frame()
    res = ua.simulate_upload(periods_of(df), electricity_change_pct=-10, diesel_change_pct=-50,
                             solar_offset_kwh_per_period=1000)
    kwh_saved = (df["electricity_kwh"] - (df["electricity_kwh"] * 0.9 - 1000).clip(lower=0)).sum()
    litres_saved = (df["diesel_litres"] * 0.5).sum()
    t = res["totals"]
    assert t["saved_scope2_tco2e"] == pytest.approx(kwh_saved * EF_E / 1000, abs=0.05)
    assert t["saved_scope1_tco2e"] == pytest.approx(litres_saved * EF_D / 1000, abs=0.05)
    assert res["sources_simulated"] == ["electricity_kwh", "diesel_litres"]
    assert "coverage_note" not in res and "presets_note" not in res  # KKWIEER-specific, not for uploads


def test_simulation_solar_cannot_make_activity_negative():
    res = ua.simulate_upload(periods_of(weekly_frame()), solar_offset_kwh_per_period=10**9)
    assert all(p["scen_electricity_kwh"] == 0 for p in res["periods"])
    assert res["totals"]["scenario_scope2_tco2e"] == 0


def test_simulation_with_only_electricity_leaves_diesel_out():
    res = ua.simulate_upload(periods_of(weekly_frame().drop(columns="diesel_litres")), electricity_change_pct=-20)
    assert res["sources_simulated"] == ["electricity_kwh"]
    assert res["totals"]["baseline_scope1_tco2e"] == 0
    assert [f["factor_key"] for f in res["factors_used"]] == ["electricity"]


@pytest.mark.parametrize("kwargs,match", [
    ({"periods": []}, "No periods"),
    ({"periods": [{"period_start": "2025-01-01"}]}, "needs electricity_kwh"),
    ({"periods": [{"period_start": "a", "electricity_kwh": 1.0}, {"period_start": "b"}]}, "not all"),
    ({"periods": [{"period_start": "a", "electricity_kwh": -1.0}]}, "not negative"),
    ({"periods": [{"period_start": "a", "electricity_kwh": float("nan")}]}, "finite"),
    ({"periods": [{"period_start": "a", "electricity_kwh": 1.0}], "electricity_change_pct": 150}, "electricity_change_pct"),
    ({"periods": [{"period_start": "a", "electricity_kwh": 1.0}], "solar_offset_kwh_per_period": -5}, "not negative"),
])
def test_simulation_rejects_bad_input(kwargs, match):
    with pytest.raises(ua.UploadError, match=match):
        ua.simulate_upload(**kwargs)


def test_api_simulate_ok_and_422():
    periods = periods_of(weekly_frame())
    r = client.post("/api/simulate", json={"periods": periods, "electricity_change_pct": -10})
    assert r.status_code == 200
    assert r.json()["totals"]["saved_tco2e"] > 0
    bad = client.post("/api/simulate", json={"periods": periods, "electricity_change_pct": 500})
    assert bad.status_code == 422 and "electricity_change_pct" in str(bad.json()["detail"])
    assert client.post("/api/simulate", json={"periods": []}).status_code == 422


def test_xlsx_upload_is_read_like_csv():
    import io
    df = pd.DataFrame({"date": pd.date_range("2025-01-01", periods=60, freq="D"), "electricity_kwh": range(1000, 1060)})
    buf = io.BytesIO()
    df.to_excel(buf, index=False)
    r = ua.analyze(buf.getvalue())
    assert r["input"]["rows"] > 0 and r["accounting"]["totals"]["scope2_tco2e"] > 0


def test_old_xls_gets_a_clear_message():
    with pytest.raises(ua.UploadError, match="xlsx"):
        ua.read_upload(b"\xd0\xcf\x11\xe0" + b"0" * 50)


# ── workbooks with several sheets ─────────────────────────────────────────────
def _workbook(sheets):
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as xw:
        for name, rows in sheets.items():
            pd.DataFrame(rows).to_excel(xw, sheet_name=name, header=False, index=False)
    return buf.getvalue()


MULTI = {
    "README": [["About this file"], ["nothing to analyse here"]],
    "Elec": [["Purchased electricity"], [], ["Month", "Consumption (kWh)", "Grid EF (kgCO2/kWh)"],
             ["January 2025", 1000, 0.71], ["February 2025", 2000, 0.71], ["March 2025", 3000, 0.71], ["TOTAL", 6000, None]],
    "Diesel": [["Generator"], [], ["Month", "Diesel (L)", "EF (kgCO2/L)"],
               ["January 2025", 10, 2.89], ["February 2025", 20, 2.89], ["March 2025", 30, 2.89], ["TOTAL", 60, None]],
    "Solar": [["Solar"], [], ["Month", "Solar Generation (kWh)"], ["January 2025", 99999], ["February 2025", 99999], ["March 2025", 99999]],
}


def test_multi_sheet_workbook_joins_electricity_and_diesel_and_skips_the_rest():
    r = ua.analyze(_workbook(MULTI))
    t = r["accounting"]["totals"]
    assert r["input"]["rows"] == 3 and r["input"]["granularity_analysed"] == "monthly"
    assert t["scope2_tco2e"] == pytest.approx(6000 * 0.71 / 1000)       # solar sheet and the TOTAL row are not used
    assert t["scope1_tco2e"] == pytest.approx(60 * 2.89 / 1000)
    assert any("Elec" in n and "Diesel" in n and "Solar" not in n for n in r["input"]["notes"])


def test_multi_sheet_with_a_gap_between_sheets_is_rejected_not_filled():
    sheets = dict(MULTI)
    sheets["Diesel"] = MULTI["Diesel"][:-2] + [MULTI["Diesel"][-1]]      # March missing on the diesel sheet
    with pytest.raises(ua.UploadError, match="missing"):
        ua.analyze(_workbook(sheets))


def test_workbook_without_a_recognisable_sheet_falls_back_to_first_sheet_error():
    with pytest.raises(ua.UploadError):
        ua.analyze(_workbook({"A": [["x"], [1]], "B": [["y"], [2]]}))


def test_real_master_data_workbook_matches_its_own_totals():
    path = os.path.join(os.path.dirname(__file__), "..", "data", "real", "KKWIEER_Carbon_Footprint_Master_Data_FY2025-26.xlsx")
    if not os.path.exists(path):
        pytest.skip("master data workbook not in this checkout")
    r = ua.analyze(open(path, "rb").read())
    assert r["input"]["rows"] == 12
    assert r["accounting"]["totals"]["scope2_tco2e"] == pytest.approx(751.99, abs=0.01)
    assert r["accounting"]["totals"]["scope1_tco2e"] == pytest.approx(11.85, abs=0.01)
