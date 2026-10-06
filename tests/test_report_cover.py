"""Tests for the report cover and 'About this report' pages."""

import pytest

from report_cover import CoverInfo, ReportDetails, build_cover

pypdf = pytest.importorskip("pypdf")


def read(path):
    return pypdf.PdfReader(str(path))


@pytest.mark.parametrize("design", ["classic", "full"])
def test_cover_is_one_a4_page_with_no_date_version_or_status(tmp_path, design):
    out = build_cover(str(tmp_path / "c.pdf"), CoverInfo(), design)
    r = read(out)
    assert len(r.pages) == 1
    box = r.pages[0].mediabox
    assert (round(float(box.width)), round(float(box.height))) == (595, 842)          # A4
    text = r.pages[0].extract_text()
    assert "Carbon Footprint Report" in text and "K. K. Wagh Institute" in text
    for word in ("Draft", "Version", "2026", "October"):
        assert word not in text


def test_details_page_shows_what_it_is_given_and_a_dash_for_gaps(tmp_path):
    d = ReportDetails(generated_on="6 October 2026", prepared_for="Dr. Test, Principal", data_period="Jan to Dec 2025")
    r = read(build_cover(str(tmp_path / "c.pdf"), CoverInfo(), "classic", d))
    assert len(r.pages) == 2
    text = r.pages[1].extract_text()
    assert "6 October 2026" in text and "Dr. Test, Principal" in text and "Jan to Dec 2025" in text
    assert "Scope 1" in text and "Where the campus is" in text
    assert float(r.pages[1].mediabox.width) == pytest.approx(595.276, abs=0.01)


def test_bad_design_is_rejected(tmp_path):
    with pytest.raises(ValueError):
        build_cover(str(tmp_path / "c.pdf"), CoverInfo(), "nope")
