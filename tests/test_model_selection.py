"""Tests for src/ml/model_selection.py: tuning uses time-ordered validation inside the training weeks only."""

import os
import sys

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from ml import model_selection as ms  # noqa: E402


def series(n=70, seed=3):
    rng = np.random.default_rng(seed)
    t = np.arange(n)
    return pd.DataFrame({
        "week_start": pd.date_range("2024-01-01", periods=n, freq="7D"),
        "electricity_kwh": 10000 + 1500 * np.sin(2 * np.pi * t / 52) + rng.normal(0, 300, n),
    })


@pytest.fixture(scope="module")
def ev():
    return ms.evaluate(series(), "electricity_kwh")


def test_three_models_and_two_baselines_are_scored(ev):
    assert {r["model"] for r in ev["metrics"]} == {"naive_last_week", "train_mean", "random_forest", "xgboost", "ridge"}
    for r in ev["metrics"]:
        assert r["MAE"] >= 0 and r["RMSE"] >= r["MAE"] - 1e-9


def test_test_weeks_are_the_last_chronological_weeks(ev):
    s = series()
    assert ev["pred_df"]["week_start"].is_monotonic_increasing
    assert ev["pred_df"]["week_start"].iloc[-1] == s["week_start"].iloc[-1]
    n_test = ev["metrics"][0]["test_weeks"]
    assert len(ev["pred_df"]) == n_test and 0.15 < n_test / len(s.dropna()) < 0.25


def test_candidate_is_the_lowest_validation_score_not_the_lowest_test_score(ev):
    models = ev["training"]["models"]
    assert ev["candidate"] == min(models, key=lambda m: m["validation_mae"])["model"]


def test_settings_come_from_the_grid_and_log_has_timings(ev):
    for m in ev["training"]["models"]:
        assert set(m["best_settings"]) == set(ms.GRIDS[m["model"]])
        for k, v in m["best_settings"].items():
            assert v in ms.GRIDS[m["model"]][k]
        assert m["settings_tried"] == len(ms._settings(m["model"])) and m["seconds"] >= 0
        assert m["validation_mae"] >= 0 and m["test_mae"] >= 0
    assert ev["training"]["seconds"] > 0 and "rolling-origin" in ev["training"]["validation"]


def test_validation_folds_stay_inside_training_weeks():
    s = series()
    feats = ms.make_features(s, "electricity_kwh")
    data = pd.concat([s, feats], axis=1).dropna().reset_index(drop=True)
    k = ms.time_split(len(data))
    seen = []

    def spy():
        class M:
            def fit(self, X, y):
                seen.append(len(X)); return self
            def predict(self, X):
                seen.append(-len(X)); return np.zeros(len(X))
        return M()

    ms._rolling_mae(data.iloc[:k], list(feats.columns), "electricity_kwh", spy)
    fits = [x for x in seen if x > 0]
    assert fits == sorted(fits) and max(fits) < k          # expanding window, always before the test weeks


def test_fit_future_returns_n_non_negative_weeks():
    out = ms.fit_future(series(), "electricity_kwh", "ridge", {"alpha": 1.0}, 6)
    assert len(out) == 6 and (out >= 0).all()


def test_nothing_is_written_to_disk(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    ms.evaluate(series(), "electricity_kwh")
    assert list(tmp_path.iterdir()) == []


def test_unknown_model_is_rejected():
    with pytest.raises(ValueError):
        ms.build("lstm", {})


def test_training_log_survives_the_history_size_cap():
    from api import history
    block = {"training": {"seconds": 1.2, "models": []}, "backtest": [{"x": 1}] * 10, "future": [{"y": 1}] * 10, "metrics": []}
    result = {"forecast": {"targets": {"electricity_kwh": block}}, "accounting": {"totals": {}, "periods": []}, "padding": "x" * 2_100_000}
    small = history.shrink(result)
    kept = small["forecast"]["targets"]["electricity_kwh"]
    assert small["truncated"] and kept["training"] == block["training"] and "backtest" not in kept
