import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))
import pandas as pd
import pytest

pypdf = pytest.importorskip("pypdf")
from upload_analysis import analyze
from report_pages import build_sections, commuting_scope3


def _analysis():
    d = pd.DataFrame({"month": [f"2025-{m:02d}-01" for m in range(1, 13)],
                      "electricity_kwh": [90000.0] * 12, "diesel_litres": [100.0] * 12})
    return analyze(d.to_csv(index=False).encode())


def _text(path):
    return "\n".join(p.extract_text() for p in pypdf.PdfReader(path).pages)


def test_three_a4_pages_with_the_given_numbers(tmp_path):
    a = _analysis()
    out = build_sections(str(tmp_path / "s.pdf"), a)
    r = pypdf.PdfReader(out)
    assert len(r.pages) == 3 and round(float(r.pages[0].mediabox.width)) == 595
    t = _text(out)
    total = a["accounting"]["totals"]["total_tco2e"]
    assert f"{total:,.1f}" in t and "0.71" in t and "CEA" in t
    assert "Scope 3 is not included" in t       # no data, so it says so instead of inventing a value


def test_scope3_appears_only_when_given(tmp_path):
    out = build_sections(str(tmp_path / "s.pdf"), _analysis(), commuting_scope3())
    t = _text(out)
    assert "Student commuting" in t and "India GHG Program" in t and "4,873" in t
