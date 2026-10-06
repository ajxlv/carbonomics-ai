"""
model_selection.py

Train, tune and compare the forecast models for ONE activity series (used by the upload flow).

Candidates:  random_forest, xgboost, ridge  (linear model on the same past-only features)
Baselines:   naive_last_week, train_mean

Procedure (time order is never broken, no shuffling):
  1. The last TEST_FRACTION of the weeks is the held-out test set, as in forecast_weekly.py.
  2. Inside the training weeks, every candidate setting is scored with rolling-origin validation: the model
     is fitted on the weeks up to a cut-off and scored on the next block, and the cut-off moves forward
     (3 folds). Tuning looks at these validation scores only; the test weeks are never used to pick settings.
  3. For each model the setting with the lowest mean validation MAE is refitted on all training weeks and
     scored once on the held-out test weeks (MAE, RMSE, R2).
  4. The model with the lowest validation MAE is the candidate for the forecast. upload_analysis.py then
     accepts it only if it beats the naive last-week baseline on the test weeks.

Nothing is saved to disk. A training log (settings tried, scores, seconds per model) is returned so the
interface can show what was done.
"""

import time
from itertools import product
from typing import Dict, List

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.model_selection import TimeSeriesSplit
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBRegressor

from ml.forecast_weekly import SEED, TEST_FRACTION, make_features, metrics, time_split

CV_FOLDS = 3
MODELS = ("random_forest", "xgboost", "ridge")

# Small grids on purpose: the series are short (about 100 weeks), so a big search would only fit noise.
GRIDS = {
    "random_forest": {"max_depth": [4, None], "min_samples_leaf": [1, 3]},
    "xgboost": {"learning_rate": [0.05, 0.1], "max_depth": [2, 3]},
    "ridge": {"alpha": [0.1, 1.0, 10.0]},
}
LABEL = {"random_forest": "Random Forest", "xgboost": "XGBoost", "ridge": "Ridge regression"}


def build(name: str, params: dict):
    if name == "random_forest":
        return RandomForestRegressor(n_estimators=100, random_state=SEED, n_jobs=1, **params)
    if name == "xgboost":
        return XGBRegressor(n_estimators=120, random_state=SEED, n_jobs=1, verbosity=0, **params)
    if name == "ridge":
        return make_pipeline(StandardScaler(), Ridge(**params))
    raise ValueError(f"unknown model: {name}")


def _settings(name: str) -> List[dict]:
    keys = list(GRIDS[name])
    return [dict(zip(keys, combo)) for combo in product(*GRIDS[name].values())]


def _mae(y, p) -> float:
    return float(np.mean(np.abs(np.asarray(y) - np.asarray(p))))


def _rolling_mae(train: pd.DataFrame, cols: List[str], target: str, make_model) -> float:
    """Mean MAE over rolling-origin folds inside the training weeks (make_model None = naive last week)."""
    n = len(train)
    test_size = max(3, n // 8)
    folds = min(CV_FOLDS, max(1, (n - 8) // test_size))
    scores = []
    for tr, va in TimeSeriesSplit(n_splits=folds, test_size=test_size).split(train):
        a, b = train.iloc[tr], train.iloc[va]
        pred = b["lag_1"].to_numpy() if make_model is None else make_model().fit(a[cols], a[target]).predict(b[cols])
        scores.append(_mae(b[target], pred))
    return float(np.mean(scores))


def evaluate(df: pd.DataFrame, target: str) -> dict:
    """Tune and score every candidate on one series. df needs week_start and the target column."""
    t_all = time.perf_counter()
    feats = make_features(df, target)
    data = pd.concat([df[["week_start", target]], feats], axis=1).dropna().reset_index(drop=True)
    k = time_split(len(data), TEST_FRACTION)
    train, test = data.iloc[:k], data.iloc[k:]
    cols = list(feats.columns)

    rows: List[dict] = []
    preds: Dict[str, np.ndarray] = {
        "naive_last_week": test["lag_1"].to_numpy(),
        "train_mean": np.full(len(test), train[target].mean()),
    }
    log = []
    for name in MODELS:
        t0 = time.perf_counter()
        scored = [(_rolling_mae(train, cols, target, lambda n=name, p=p: build(n, p)), p) for p in _settings(name)]
        cv_mae, best = min(scored, key=lambda x: x[0])
        model = build(name, best).fit(train[cols], train[target])
        preds[name] = model.predict(test[cols])
        log.append({"model": name, "label": LABEL[name], "settings_tried": len(scored), "best_settings": best,
                    "validation_mae": cv_mae, "seconds": round(time.perf_counter() - t0, 3)})
    naive_cv = _rolling_mae(train, cols, target, None)

    for name, p in preds.items():
        rows.append({"model": name, "train_weeks": len(train), "test_weeks": len(test), **metrics(test[target], p)})
    for entry in log:
        entry["test_mae"] = next(r["MAE"] for r in rows if r["model"] == entry["model"])
    candidate = min(log, key=lambda e: e["validation_mae"])["model"]    # chosen by validation, never by the test weeks

    pred_df = test[["week_start", target]].rename(columns={target: f"actual_{target}"}).copy()
    for name, p in preds.items():
        pred_df[f"pred_{name}"] = p
    return {
        "metrics": rows,
        "pred_df": pred_df,
        "candidate": candidate,
        "best_settings": {e["model"]: e["best_settings"] for e in log},
        "training": {
            "validation": f"rolling-origin, {min(CV_FOLDS, max(1, (len(train) - 8) // max(3, len(train) // 8)))} folds inside the training weeks",
            "naive_validation_mae": naive_cv,
            "models": log,
            "seconds": round(time.perf_counter() - t_all, 3),
        },
    }


def fit_future(df: pd.DataFrame, target: str, model_name: str, settings: dict, n: int) -> np.ndarray:
    """Refit on all weeks with the chosen settings, then predict n weeks ahead (each prediction feeds the next lags)."""
    feats = make_features(df, target)
    data = pd.concat([df[["week_start", target]], feats], axis=1).dropna()
    cols = list(feats.columns)
    model = build(model_name, settings).fit(data[cols], data[target])

    ext = df[["week_start", target]].copy()
    out = []
    for _ in range(n):
        next_week = ext["week_start"].iloc[-1] + pd.Timedelta(days=7)
        ext = pd.concat([ext, pd.DataFrame({"week_start": [next_week], target: [np.nan]})], ignore_index=True)
        row = make_features(ext, target).iloc[[-1]][cols]
        value = float(max(0.0, model.predict(row)[0]))
        ext.loc[ext.index[-1], target] = value
        out.append(value)
    return np.array(out)
