"""
upload_optimization.py

Budget-constrained measure selection for an uploaded dataset, using the user's OWN measure inputs.

Reuses optimization.optimize() (MILP + greedy) and optimization.measure_impact(); nothing is rebuilt here.
This module only (1) turns the uploaded periods into a one-year baseline, (2) turns the user's measure
rows into the dicts that optimization.py expects, and (3) adds a per-measure ranking.

Rules kept from the project:
- Every number about a measure (saving, cost, size limit) is typed in by the user. Nothing is assumed
  or defaulted here, and the result is labelled "based on your inputs".
- Emission saved = activity saved x emission factor (from EMISSION_FACTORS). No ML is involved.
- A measure that acts on a source that is not in the file is rejected, not guessed.
"""

from __future__ import annotations

import calendar
import math
from typing import List, Optional

import pandas as pd

from emission_factors import EMISSION_FACTORS
from optimization import measure_impact, optimize
from upload_analysis import DIESEL, ELECTRICITY, MAX_SIM_PERIODS, UploadError

MAX_MEASURES = 30
MAX_UNITS = 1000
MIN_DAYS = 28                  # shorter than four weeks cannot be turned into a yearly figure
SAVING_TYPES = ("pct_of_activity", "fixed_kwh_per_year", "fixed_litres_per_year")


def _num(v, name: str, lo: float = 0.0, hi: float = float("inf")) -> float:
    try:
        x = float(v)
    except (TypeError, ValueError) as exc:
        raise UploadError(f"{name} must be a number.") from exc
    if not math.isfinite(x) or x < lo or x > hi:
        raise UploadError(f"{name} must be between {lo:g} and {hi:g}." if hi != float("inf") else f"{name} must be {lo:g} or more.")
    return x


def covered_days(periods: List[dict], granularity: str) -> int:
    """Days the uploaded periods span: 7 per week, or the real length of each month."""
    if granularity == "weekly":
        return 7 * len(periods)
    if granularity == "monthly":
        total = 0
        for p in periods:
            try:
                d = pd.Timestamp(str(p["period_start"]))
            except (KeyError, ValueError, TypeError) as exc:
                raise UploadError("Each monthly period needs a valid period_start date.") from exc
            total += calendar.monthrange(d.year, d.month)[1]
        return total
    raise UploadError("granularity must be 'weekly' or 'monthly'.")


def annual_baseline(periods: List[dict], granularity: str) -> dict:
    """Yearly electricity (kWh) and diesel (litres): the uploaded total scaled to 365 days."""
    if not periods:
        raise UploadError("No periods were given.")
    if len(periods) > MAX_SIM_PERIODS:
        raise UploadError(f"More than {MAX_SIM_PERIODS} periods were given.")
    days = covered_days(periods, granularity)
    if days < MIN_DAYS:
        raise UploadError(f"The data covers {days} days; at least {MIN_DAYS} days are needed to estimate a year.")
    out = {"days_covered": days, "scale_to_year": 365.0 / days}
    for key in (ELECTRICITY, DIESEL):
        vals = [p.get(key) for p in periods]
        out[f"has_{key}"] = all(v is not None for v in vals)
        if any(v is not None for v in vals) and not out[f"has_{key}"]:
            raise UploadError(f"{key} is given for some periods but not all.")
        out[key] = sum(_num(v, key) for v in vals) * out["scale_to_year"] if out[f"has_{key}"] else 0.0
    if not (out[f"has_{ELECTRICITY}"] or out[f"has_{DIESEL}"]):
        raise UploadError("Each period needs electricity_kwh and/or diesel_litres.")
    return out


def _measures(raw: List[dict], base: dict) -> List[dict]:
    if not raw:
        raise UploadError("Add at least one measure.")
    if len(raw) > MAX_MEASURES:
        raise UploadError(f"At most {MAX_MEASURES} measures are allowed.")
    out = []
    for i, r in enumerate(raw, 1):
        label = str(r.get("label") or "").strip()[:100]
        if not label:
            raise UploadError(f"Measure {i} needs a name.")
        acts_on = r.get("acts_on")
        if acts_on not in ("electricity", "diesel"):
            raise UploadError(f"'{label}': acts_on must be electricity or diesel.")
        source = ELECTRICITY if acts_on == "electricity" else DIESEL
        if not base[f"has_{source}"]:
            raise UploadError(f"'{label}' acts on {acts_on}, which is not in your uploaded file.")
        saving_type = r.get("saving_type")
        if saving_type not in SAVING_TYPES:
            raise UploadError(f"'{label}': saving_type must be one of {', '.join(SAVING_TYPES)}.")
        if (saving_type == "fixed_kwh_per_year") != (acts_on == "electricity") and saving_type != "pct_of_activity":
            raise UploadError(f"'{label}': a fixed saving must be in kWh for electricity or litres for diesel.")
        saving = _num(r.get("saving_value"), f"'{label}' saving", 0.0, 100.0 if saving_type == "pct_of_activity" else float("inf"))
        units = int(_num(r.get("max_units"), f"'{label}' max units", 1.0, MAX_UNITS))
        group = str(r.get("exclusive_group") or "").strip()[:40] or None
        out.append({
            "id": f"m{i}", "label": label, "category": "user", "acts_on": acts_on, "saving_type": saving_type,
            "saving_value": saving, "saving_unit": "", "cap_basis": "total_electricity" if acts_on == "electricity" else "total_diesel",
            "capex_inr": _num(r.get("capex_inr"), f"'{label}' cost per unit"),
            "annual_opex_change_inr": None, "lifetime_years": None, "max_units": units, "exclusive_group": group,
            "basis": "USER INPUT", "source": "Entered by the user", "source_date": "", "notes": "",
            "status": "ready", "missing_fields": [],
            "_annual_saving_inr": _num(r["annual_saving_inr"], f"'{label}' yearly rupee saving") if r.get("annual_saving_inr") not in (None, "") else None,
        })
    return out


def _payback(capex: float, annual_saving: Optional[float]) -> Optional[float]:
    return round(capex / annual_saving, 2) if annual_saving and annual_saving > 0 else None


def optimize_upload(periods: List[dict], granularity: str, budget_inr, raw_measures: List[dict]) -> dict:
    base = annual_baseline(periods, granularity)
    budget = _num(budget_inr, "Budget")
    measures = _measures(raw_measures, base)
    baseline_df = pd.DataFrame([{"month": "annual", "electricity_kwh": base[ELECTRICITY], "dg_diesel_litres": base[DIESEL]}])
    baseline_tco2e = (base[ELECTRICITY] * EMISSION_FACTORS["electricity"]["factor"] + base[DIESEL] * EMISSION_FACTORS["diesel"]["factor"]) / 1000.0

    try:
        res = optimize(baseline_df, [{k: v for k, v in m.items() if not k.startswith("_")} for m in measures], budget)
    except ValueError as exc:
        raise UploadError(str(exc)) from exc

    by_id = {m["id"]: m for m in measures}
    ranking = []
    for m in measures:
        clean = {k: v for k, v in m.items() if not k.startswith("_")}
        imp = measure_impact(clean, baseline_df)
        per_unit = imp["tco2e_saved_per_unit"]
        ranking.append({
            "id": m["id"], "label": m["label"], "acts_on": m["acts_on"], "max_units": m["max_units"],
            "exclusive_group": m["exclusive_group"],
            "tco2e_saved_per_unit": per_unit,
            "pct_of_baseline_per_unit": round(per_unit / baseline_tco2e * 100.0, 2) if baseline_tco2e else 0.0,
            "capex_per_unit_inr": imp["capex_per_unit"],
            "inr_per_tco2e": imp["inr_per_tco2e"],
            "payback_years": _payback(imp["capex_per_unit"], m["_annual_saving_inr"]),
            "cap_applied": imp["cap_applied"],
        })
    ranking.sort(key=lambda r: (-r["pct_of_baseline_per_unit"], r["label"]))

    def plan(block: dict) -> dict:
        items = []
        for s in block["selected"]:
            ann = by_id[s["id"]]["_annual_saving_inr"]
            items.append({
                "id": s["id"], "label": s["label"], "acts_on": s["acts_on"], "units": s["units"], "capex_inr": s["capex_inr"],
                "kwh_saved": s["kwh_saved"], "litres_saved": s["litres_saved"], "tco2e_saved": s["tco2e_saved"], "scope": s["scope"],
                "pct_of_baseline": round(s["tco2e_saved"] / baseline_tco2e * 100.0, 2) if baseline_tco2e else 0.0,
                "annual_saving_inr": round(ann * s["units"], 2) if ann is not None else None,
            })
        savings = [i["annual_saving_inr"] for i in items]
        total_ann = sum(savings) if items and all(v is not None for v in savings) else None
        return {
            "selected": items, "total_capex_inr": block["total_capex_inr"], "tco2e_saved": block["annual_tco2e_saved"],
            "pct_of_baseline": round(block["annual_tco2e_saved"] / baseline_tco2e * 100.0, 2) if baseline_tco2e else 0.0,
            "annual_saving_inr": round(total_ann, 2) if total_ann is not None else None,
            "payback_years": _payback(block["total_capex_inr"], total_ann),
        }

    notes = []
    if base["days_covered"] < 330:
        notes.append(f"Your data covers {base['days_covered']} days; totals were scaled to a year (x{base['scale_to_year']:.2f}). Seasonal differences are ignored.")
    if res["greedy"]["annual_tco2e_saved"] > res["annual_tco2e_saved"] + 1e-6:
        notes.append("The greedy comparison saved more than the optimiser, which should not happen; treat this result with care.")
    return {
        "budget_inr": budget,
        "baseline": {"electricity_kwh_per_year": round(base[ELECTRICITY], 2), "diesel_litres_per_year": round(base[DIESEL], 2),
                     "tco2e_per_year": round(baseline_tco2e, 4), "days_covered": base["days_covered"]},
        "optimal": plan(res),
        "greedy": plan(res["greedy"]),
        "solver_status": res["solver_status"],
        "consistency_check": {**res["consistency_check"], "passed": bool(res["consistency_check"]["passed"])},
        "ranking": ranking,
        "factors_used": res["factors_used"],
        "notes": notes,
        "disclaimer": ("Based on the measure figures you entered; none were supplied or checked by Carbonomics-AI. "
                       "Emission saved = activity saved x emission factor. Savings are static yearly averages, and measures on the "
                       "same source are added together (up to what the source emits) without interaction effects. This is a planning "
                       "aid, not an engineering or financial assessment."),
    }
