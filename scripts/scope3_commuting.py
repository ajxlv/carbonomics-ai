"""Scope 3 student commuting from the transport survey (sample), scaled to a population.

emission = one-way km x 2 x days/week x weeks/yr x factor (same method as Master Data sheet 10, Version B).
Factors come from Master Data sheet 17 (India GHG Program 2015, WRI/TERI/CII). Nothing is guessed:
rows that cannot be used are counted and listed in the output.

Usage: python scripts/scope3_commuting.py <survey.xlsx> [population=4873]
"""
import sys, re, json
import pandas as pd

WEEKS = 41  # academic weeks per year, Master Data sheet 10
DAYS = {"1–2 days": 1.5, "3–4 days": 3.5, "5–6 days": 5.5}  # mid-point of the answer range
MAX_KM = 60  # one-way; above this the answer is treated as a typing error
FACTORS = {  # kg CO2 per vehicle-km (bus: per passenger-km), India GHG Program 2015
    "Two-wheeler": 0.03743, "Bus": 0.015161, "Auto / Cab": 0.11779, "Car": 0.17221,
    "Bicycle": 0.0, "Walking": 0.0,
}
ALT_POPULATIONS = {"Engineering (Master Data)": 5547, "All students (Master Data)": 8633}


def parse_km(v):
    """'4 km', '500m', '2-3 km', '11(one side)' -> km. Ranges use the mid-point; words like 'Home' or 'Under 10' give None."""
    if isinstance(v, (int, float)):
        return None if pd.isna(v) else float(v)
    t = str(v).lower().replace(",", ".")
    if re.search(r"under|above|more|less|approx", t):
        return None
    nums = re.findall(r"\d+(?:\.\d+)?", t)
    if not nums:
        return None
    x = [float(n) for n in nums[:2]]
    km = sum(x) / len(x) if len(x) == 2 and re.search(r"\d\s*(?:-|to)\s*\d", t) else x[0]
    return km / 1000 if re.search(r"\d\s*(?:m\b|meter|metre|mtr)", t) else km


def load(path):
    d = pd.read_excel(path)
    d.columns = [c.strip() for c in d.columns]
    d = d.rename(columns={d.columns[5]: "dist_raw", d.columns[6]: "days_raw", d.columns[7]: "mode", d.columns[8]: "fuel"})
    d["name_key"] = d["Name"].astype(str).str.strip().str.lower()
    d["dist"] = d["dist_raw"].map(parse_km)
    d["days"] = d["days_raw"].map(DAYS)
    return d


def clean(d):
    d = d.copy()
    d["status"] = "ok"
    d.loc[d["name_key"].duplicated(keep="first") & d["dist"].notna(), "status"] = "duplicate name (kept first)"
    d.loc[d["dist"].isna(), "status"] = "distance missing or not a number"
    d.loc[d["dist"] > MAX_KM, "status"] = f"distance above {MAX_KM} km"
    d.loc[d["days"].isna(), "status"] = "days per week missing"
    d.loc[~d["mode"].isin(FACTORS), "status"] = "unknown mode"
    return d


def emissions(d):
    ok = d[d["status"] == "ok"].copy()
    ok["annual_km"] = ok["dist"] * 2 * ok["days"] * WEEKS
    ok["kg"] = ok["annual_km"] * ok["mode"].map(FACTORS)
    return ok


def main(path, population):
    d = clean(load(path))
    ok = emissions(d)
    by = ok.groupby("mode").agg(responses=("kg", "size"), annual_km=("annual_km", "sum"), tco2e=("kg", lambda s: s.sum() / 1000)).round(3)
    n, t = len(ok), ok["kg"].sum() / 1000
    out = {
        "responses_total": len(d), "responses_used": n,
        "excluded": d["status"].value_counts().drop("ok", errors="ignore").to_dict(),
        "sample_tco2e": round(t, 3), "population": population, "scale": round(population / n, 3),
        "estimated_tco2e_per_year": round(t * population / n, 2),
        "sensitivity_tco2e": {k: round(t * v / n, 2) for k, v in ALT_POPULATIONS.items()},
        "master_data_version_b_tco2e": 992.35,
        "electric_two_wheeler_rows": int(((ok["mode"] == "Two-wheeler") & (ok["fuel"].astype(str).str.strip().str.lower() == "electric")).sum()),
        "carpool_yes": int((ok.iloc[:, 9] == "Yes").sum()),
        "factors_kg_per_km": FACTORS, "weeks_per_year": WEEKS, "days_midpoints": DAYS,
    }
    by["share_pct"] = (by["tco2e"] / by["tco2e"].sum() * 100).round(1)
    by.to_csv("outputs/scope3/commuting_by_mode.csv")
    d[["Name", "dist_raw", "days_raw", "mode", "status"]].query("status != 'ok'").to_csv("outputs/scope3/excluded_rows.csv", index=False)
    json.dump(out, open("outputs/scope3/commuting_summary.json", "w"), indent=2, ensure_ascii=False)
    print(by); print(json.dumps({k: v for k, v in out.items() if k not in ("factors_kg_per_km", "days_midpoints")}, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 4873)
