"""
annual_inventory.py

The yearly (static) campus footprint for FY 2025-26: Scope 1, 2 and 3 in one table.

Source of the numbers: data/real/annual_inventory_fy2025_26.csv, copied row by row from the KKWIEER
Carbon Footprint Master Data workbook (sheets named in the `master_data_sheet` column). Scope 3 comes from
the college survey carried out by the Young Indians team. These are yearly totals: there is no time series
behind them, so nothing here is forecast or spread over weeks.

Rules kept here:
- emission = activity x factor. Factors are never typed in the CSV; the row names a key of
  emission_factors.EMISSION_FACTORS and the factor, unit, source and version come from there.
- A row with activity and factor is recomputed and must match the stated value (else InventoryError).
  A row without them is shown as "stated only" and says why in its note.
- The totals are the sum of the stated values and must reconcile with the published
  REPORT_FOOTPRINT_TCO2E (3,719.74); otherwise InventoryError.
"""

from __future__ import annotations

import csv
import os
from typing import Optional

from emission_factors import EMISSION_FACTORS, REPORT_FOOTPRINT_TCO2E, REPORT_SOURCE

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INVENTORY_PATH = os.path.join(ROOT, "data", "real", "annual_inventory_fy2025_26.csv")
PERIOD = "FY 2025-26"
SCOPES = ("Scope 1", "Scope 2", "Scope 3")
MATCH_TOLERANCE_T = 0.02   # stated values in the workbook are rounded to 2 decimals
TOTAL_TOLERANCE_T = 0.01
SCOPE3_SOURCE = "the college survey carried out by the Young Indians team"


class InventoryError(ValueError):
    """The inventory file is missing a column, disagrees with its own factors, or does not add up."""


def _num(v: str) -> Optional[float]:
    v = (v or "").strip()
    return float(v) if v else None


def _row(raw: dict) -> dict:
    activity, stated = _num(raw["activity_value"]), _num(raw["tco2e"])
    key = (raw["factor_key"] or "").strip()
    factor = None
    recomputed = None
    if key:
        if key not in EMISSION_FACTORS:
            raise InventoryError(f"{raw['source']}: factor '{key}' is not in emission_factors.py")
        f = EMISSION_FACTORS[key]
        factor = {"key": key, "value": f["factor"], "unit": f["output"], "source": f["source"],
                  "version": f["version"], "verified": f["verified"]}
        if activity is None:
            raise InventoryError(f"{raw['source']}: a factor is given but no activity")
        recomputed = activity * f["factor"] / 1000.0
    if raw["in_total"] == "no" and stated is None:
        check = "excluded"
    elif recomputed is not None:
        if stated is None or abs(recomputed - stated) > MATCH_TOLERANCE_T:
            raise InventoryError(f"{raw['source']}: activity x factor = {recomputed:.3f} but the file says {stated}")
        check = "recomputed"
    else:
        check = "stated"
    return {"scope": raw["scope"], "source": raw["source"], "activity": activity, "activity_unit": raw["activity_unit"],
            "factor": factor, "tco2e": stated, "recomputed": recomputed, "check": check, "in_total": raw["in_total"],
            "basis": raw["basis"], "note": raw["note"], "sheet": raw["master_data_sheet"]}


def load_inventory(path: Optional[str] = None) -> dict:
    with open(path or INVENTORY_PATH, encoding="utf-8", newline="") as f:
        rows = [_row(r) for r in csv.DictReader(f)]
    counted = [r for r in rows if r["in_total"] == "yes"]
    by_scope = {s: round(sum(r["tco2e"] for r in counted if r["scope"] == s), 2) for s in SCOPES}
    total = round(sum(by_scope.values()), 2)
    if abs(total - REPORT_FOOTPRINT_TCO2E) > TOTAL_TOLERANCE_T:
        raise InventoryError(f"rows add up to {total} but the published footprint is {REPORT_FOOTPRINT_TCO2E}")
    return {
        "period": PERIOD, "rows": rows, "counted": counted,
        "by_scope": by_scope, "total": total,
        "published_total": REPORT_FOOTPRINT_TCO2E, "published_source": REPORT_SOURCE,
        "alternatives": [r for r in rows if r["in_total"] == "alt"],
        "memo": [r for r in rows if r["in_total"] == "memo"],
        "excluded": [r for r in rows if r["check"] == "excluded"],
        "unverified_factors": sorted({r["factor"]["key"] for r in rows if r["factor"] and not r["factor"]["verified"]}),
        "scope3_source": SCOPE3_SOURCE,
    }
