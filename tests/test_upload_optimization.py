"""Tests for the measure optimisation on uploaded data. All figures are generated test inputs, not real costs."""

import pytest
from fastapi.testclient import TestClient

import upload_optimization as uo
from emission_factors import EMISSION_FACTORS
from api.main import app

EF_E = EMISSION_FACTORS["electricity"]["factor"]
EF_D = EMISSION_FACTORS["diesel"]["factor"]
client = TestClient(app)


@pytest.fixture(autouse=True)
def _no_login(monkeypatch):
    monkeypatch.setenv("AUTH_DISABLED", "1")


def monthly(elec=90_000.0, diesel=300.0, n=12):
    return [{"period_start": f"2025-{m:02d}-01", "electricity_kwh": elec, "diesel_litres": diesel} for m in range(1, n + 1)]


def measure(**over):
    return {"label": "Solar", "acts_on": "electricity", "saving_type": "fixed_kwh_per_year", "saving_value": 140_000.0,
            "capex_inr": 3_300_000.0, "max_units": 3, **over}


def test_baseline_is_scaled_to_a_year_with_real_month_lengths():
    full = uo.annual_baseline(monthly(), "monthly")
    assert full["days_covered"] == 365 and full["electricity_kwh"] == pytest.approx(1_080_000)
    half = uo.annual_baseline(monthly(n=6), "monthly")             # Jan-Jun = 181 days
    assert half["days_covered"] == 181 and half["electricity_kwh"] == pytest.approx(540_000 * 365 / 181)
    weekly = uo.annual_baseline([{"period_start": "x", "electricity_kwh": 1000.0}] * 52, "weekly")
    assert weekly["days_covered"] == 364 and weekly["diesel_litres"] == 0.0 and weekly["has_diesel_litres"] is False


def test_saving_is_activity_times_the_documented_factor_and_pct_is_of_the_baseline():
    r = uo.optimize_upload(monthly(), "monthly", 10_000_000, [measure(max_units=1)])
    base_t = (1_080_000 * EF_E + 3_600 * EF_D) / 1000
    assert r["baseline"]["tco2e_per_year"] == pytest.approx(base_t, abs=1e-3)
    saved = 140_000 * EF_E / 1000
    assert r["optimal"]["tco2e_saved"] == pytest.approx(saved, abs=1e-3)
    assert r["ranking"][0]["pct_of_baseline_per_unit"] == pytest.approx(saved / base_t * 100, abs=0.01)
    assert r["consistency_check"]["passed"] is True


def test_budget_limits_the_plan_and_optimal_beats_or_ties_greedy():
    ms = [measure(label="Solar", saving_value=140_000, capex_inr=3_300_000, max_units=1),
          measure(label="LED", saving_type="pct_of_activity", saving_value=4, capex_inr=800_000, max_units=1)]
    r = uo.optimize_upload(monthly(), "monthly", 3_300_000, ms)
    assert r["optimal"]["total_capex_inr"] <= 3_300_000
    assert [s["label"] for s in r["optimal"]["selected"]] == ["Solar"]          # the budget fits only one of them
    assert r["optimal"]["tco2e_saved"] >= r["greedy"]["tco2e_saved"]
    assert uo.optimize_upload(monthly(), "monthly", 0, ms)["optimal"]["selected"] == []


def test_ranking_is_best_first_and_payback_only_with_the_users_rupee_saving():
    ms = [measure(label="Small", saving_value=10_000, annual_saving_inr=None),
          measure(label="Big", saving_value=140_000, annual_saving_inr=1_000_000)]
    r = uo.optimize_upload(monthly(), "monthly", 99_000_000, ms)
    assert [x["label"] for x in r["ranking"]] == ["Big", "Small"]
    assert r["ranking"][0]["payback_years"] == pytest.approx(3.3) and r["ranking"][1]["payback_years"] is None
    assert r["optimal"]["payback_years"] is None                                   # not every selected measure has a rupee saving


def test_exclusive_group_allows_only_one_of_the_alternatives():
    ms = [measure(label="A", saving_value=100_000, capex_inr=1, max_units=1, exclusive_group="g"),
          measure(label="B", saving_value=50_000, capex_inr=1, max_units=1, exclusive_group="g")]
    r = uo.optimize_upload(monthly(), "monthly", 10, ms)
    assert [s["label"] for s in r["optimal"]["selected"]] == ["A"]


def test_savings_cannot_exceed_what_the_source_uses():
    r = uo.optimize_upload(monthly(), "monthly", 10**9, [measure(saving_value=5_000_000, max_units=1)])
    assert r["optimal"]["selected"][0]["kwh_saved"] == pytest.approx(1_080_000)
    assert r["ranking"][0]["cap_applied"] is True


@pytest.mark.parametrize("bad,msg", [
    ({"acts_on": "diesel"}, "not in your uploaded file"),                  # file below has no diesel
    ({"acts_on": "gas"}, "acts_on"),
    ({"saving_type": "magic"}, "saving_type"),
    ({"saving_type": "pct_of_activity", "saving_value": 150}, "between"),
    ({"saving_value": -1}, "between|or more"),
    ({"capex_inr": -5}, "cost per unit"),
    ({"capex_inr": "abc"}, "number"),
    ({"max_units": 0}, "max units"),
    ({"label": "  "}, "needs a name"),
    ({"saving_type": "fixed_litres_per_year"}, "must be in kWh"),
])
def test_bad_measure_inputs_are_rejected_not_defaulted(bad, msg):
    elec_only = [{"period_start": f"2025-{m:02d}-01", "electricity_kwh": 90_000.0} for m in range(1, 13)]
    with pytest.raises(uo.UploadError, match=msg):
        uo.optimize_upload(elec_only, "monthly", 1_000_000, [measure(**bad)])


@pytest.mark.parametrize("args,msg", [
    (dict(periods=[], granularity="monthly"), "No periods"),
    (dict(periods=monthly(), granularity="daily"), "granularity"),
    (dict(periods=[{"period_start": "2025-01-01", "electricity_kwh": 5.0}], granularity="weekly"), "at least"),
    (dict(periods=monthly(), granularity="monthly", budget=-1), "Budget"),
    (dict(periods=monthly(), granularity="monthly", measures=[]), "at least one measure"),
])
def test_bad_requests_are_rejected(args, msg):
    with pytest.raises(uo.UploadError, match=msg):
        uo.optimize_upload(args["periods"], args["granularity"], args.get("budget", 1000), args.get("measures", [measure()]))


def test_endpoint_returns_the_plan_and_rejects_bad_input_with_422():
    body = {"periods": monthly(), "granularity": "monthly", "budget_inr": 4_000_000, "measures": [measure(max_units=3)]}
    r = client.post("/api/optimize", json=body)
    assert r.status_code == 200 and r.json()["optimal"]["selected"][0]["units"] == 1 and "run" not in r.json()
    assert client.post("/api/optimize", json={**body, "measures": [measure(saving_type="x")]}).status_code == 422
    assert client.post("/api/optimize", json={**body, "measures": [measure(max_units=0)]}).status_code == 422
