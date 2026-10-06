import json
import pathlib

PATH = pathlib.Path(__file__).resolve().parents[1] / "dashboard" / "public" / "data" / "dashboard.json"


def test_public_demo_data_is_fake_and_has_no_campus_figures():
    text = PATH.read_text(encoding="utf-8")
    d = json.loads(text)
    assert d["meta"]["demo"] is True and "FAKE" in d["meta"]["weekly_label"]
    for real in ("KKWIEER", "Wagh", "Master Data", "Energy team", "3719", "1059147", "896.90", "804.17"):
        assert real not in text, real
    assert d["kpis"]["electricity_kwh"] != 1059147 and len(d["real_monthly"]) == 12 and len(d["weekly"]) == 52
