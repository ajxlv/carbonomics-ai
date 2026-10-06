"""
factor_change.py

Why did emissions change between two years? Two reasons get mixed together:
  1. you used more or less energy                 (activity effect)
  2. the grid got cleaner or dirtier              (factor effect)

For each source, emission E = activity x factor. Going from year A to year B:
    activity effect = (activity_B - activity_A) x factor_A
    factor effect   =  activity_B x (factor_B - factor_A)
    activity effect + factor effect = E_B - E_A    (exact, no leftover term)

Grid factors come only from the registry in emission_factors.py (GRID_FACTOR_BY_FY); the user picks a
documented version for each year and never types a value. Diesel has no yearly series in the registry, so
its factor is the same in both years and all of its change is activity.
"""

from collections import defaultdict
from typing import List

import numpy as np
import pandas as pd

from emission_factors import EMISSION_FACTORS, GRID_FACTOR_BY_FY, GRID_FACTOR_SOURCE, GRID_FACTOR_UNIT

ELECTRICITY = "electricity_kwh"
DIESEL = "diesel_litres"
MIN_COVERAGE = 0.9     # a comparison year must hold at least 90 % of its expected periods


class FactorChangeError(ValueError):
    """Bad input for the factor-change comparison (shown to the user as a 422)."""


def _year_totals(periods: List[dict]):
    dates = pd.to_datetime([p["period_start"] for p in periods], errors="coerce")
    if dates.isna().any():
        raise FactorChangeError("Some period dates could not be read.")
    step = float(np.median(np.diff(np.sort(dates.values)).astype("timedelta64[D]").astype(float))) if len(dates) > 1 else 0
    if step <= 0:
        raise FactorChangeError("Need at least two periods with different dates.")
    expected = 365.0 / step
    totals, counts = defaultdict(lambda: defaultdict(float)), defaultdict(int)
    for d, p in zip(dates, periods):
        counts[d.year] += 1
        for src in (ELECTRICITY, DIESEL):
            if p.get(src) is not None:
                totals[d.year][src] += float(p[src])
    complete = {y for y, c in counts.items() if c >= MIN_COVERAGE * expected}
    return totals, counts, complete, expected


def years_available(periods: List[dict]) -> List[int]:
    """Calendar years in the file that are complete enough to compare."""
    _, _, complete, _ = _year_totals(periods)
    return sorted(complete)


def compare(periods: List[dict], year_a: int, year_b: int, fy_a: str, fy_b: str) -> dict:
    if year_a == year_b:
        raise FactorChangeError("Pick two different years.")
    for fy in (fy_a, fy_b):
        if fy not in GRID_FACTOR_BY_FY:
            raise FactorChangeError(f"No documented grid factor for {fy}.")
    totals, counts, complete, expected = _year_totals(periods)
    for y in (year_a, year_b):
        if y not in complete:
            raise FactorChangeError(f"{y} is not a complete year in your file ({counts.get(y, 0)} of about "
                                    f"{expected:.0f} periods), so it cannot be compared fairly.")
    f_a, f_b = GRID_FACTOR_BY_FY[fy_a]["factor"], GRID_FACTOR_BY_FY[fy_b]["factor"]
    diesel_f = EMISSION_FACTORS["diesel"]["factor"]
    rows = []
    for src, label, unit, fa, fb in ((ELECTRICITY, "Electricity (grid)", "kWh", f_a, f_b),
                                     (DIESEL, "Generator diesel", "L", diesel_f, diesel_f)):
        if src not in totals[year_a] and src not in totals[year_b]:
            continue
        a, b = totals[year_a][src], totals[year_b][src]
        e_a, e_b = a * fa / 1000, b * fb / 1000                      # tCO2e
        act = (b - a) * fa / 1000
        fac = b * (fb - fa) / 1000
        rows.append({"source": src, "label": label, "unit": unit,
                     "activity_a": a, "activity_b": b, "factor_a": fa, "factor_b": fb,
                     "emission_a_t": e_a, "emission_b_t": e_b,
                     "activity_effect_t": act, "factor_effect_t": fac, "change_t": e_b - e_a})
    if not rows:
        raise FactorChangeError("Your file has no electricity or diesel columns to compare.")
    tot = {k: sum(r[k] for r in rows) for k in ("emission_a_t", "emission_b_t", "activity_effect_t",
                                                "factor_effect_t", "change_t")}
    return {
        "year_a": year_a, "year_b": year_b, "fy_a": fy_a, "fy_b": fy_b,
        "grid_factor_a": f_a, "grid_factor_b": f_b, "grid_factor_unit": GRID_FACTOR_UNIT,
        "source": GRID_FACTOR_SOURCE, "rows": rows, "totals": tot,
        "sentences": _sentences(year_a, year_b, tot, f_a, f_b),
        "note": ("Grid factors are documented CEA values chosen from the app's own list. Diesel has no yearly "
                 "factor series in the app, so its factor is the same in both years."),
    }


def _sentences(ya, yb, tot, fa, fb) -> List[str]:
    def t(x):
        return f"{abs(x):,.1f} tCO2e"
    ch = tot["change_t"]
    out = [f"Your emissions {'rose' if ch > 0 else 'fell' if ch < 0 else 'did not change'} from {tot['emission_a_t']:,.1f} "
           f"tCO2e in {ya} to {tot['emission_b_t']:,.1f} tCO2e in {yb}" + (f", a change of {t(ch)}." if ch else ".")]
    a = tot["activity_effect_t"]
    if abs(a) > 1e-9:
        out.append(f"Using {'more' if a > 0 else 'less'} energy {'added' if a > 0 else 'removed'} {t(a)}.")
    f = tot["factor_effect_t"]
    if abs(f) > 1e-9:
        out.append(f"A {'dirtier' if f > 0 else 'cleaner'} grid {'added' if f > 0 else 'removed'} {t(f)} "
                   f"(each unit of grid electricity went from {fa:.3f} to {fb:.3f} kg CO2e per kWh).")
    else:
        out.append("The grid factor did not change between the two versions you picked.")
    return out
