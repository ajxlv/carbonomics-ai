"""
Carbonomics-AI web API.

POST /api/analyze  - upload a CSV, get validation, carbon accounting and a forecast as JSON.
POST /api/simulate - what-if scenario on the periods returned by /api/analyze.
GET  /api/health   - liveness check.

Uploaded files are processed in memory and are never stored.

Run locally (from the repository root):
    uvicorn api.main:app --reload --port 8000

CORS: set ALLOWED_ORIGINS to a comma-separated list (default: the Vite dev server).
"""

import os
import sys
from typing import List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(os.path.join(ROOT, "src"))

import upload_analysis  # noqa: E402

app = FastAPI(title="Carbonomics-AI API", version="0.1.0")

_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins.split(",") if o.strip()],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/analyze")
async def analyze(
    file: UploadFile = File(...),
    date_col: Optional[str] = Form(None),
    electricity_col: Optional[str] = Form(None),
    diesel_col: Optional[str] = Form(None),
    future_weeks: int = Form(upload_analysis.DEFAULT_FUTURE_WEEKS),
) -> dict:
    # read one byte more than the limit so an oversized file is detected without loading all of it
    raw = await file.read(upload_analysis.MAX_BYTES + 1)
    try:
        return upload_analysis.analyze(
            raw,
            date_col=date_col or None,
            electricity_col=electricity_col or None,
            diesel_col=diesel_col or None,
            future_weeks=future_weeks,
        )
    except upload_analysis.UploadError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


class Period(BaseModel):
    period_start: str = Field(max_length=32)
    electricity_kwh: Optional[float] = None
    diesel_litres: Optional[float] = None


class SimulateRequest(BaseModel):
    periods: List[Period] = Field(max_length=upload_analysis.MAX_SIM_PERIODS)
    electricity_change_pct: float = 0.0
    diesel_change_pct: float = 0.0
    solar_offset_kwh_per_period: float = 0.0


@app.post("/api/simulate")
def simulate(req: SimulateRequest) -> dict:
    """What-if scenario on the periods returned by /api/analyze. Stateless: nothing is stored."""
    try:
        return upload_analysis.simulate_upload(
            [p.model_dump() for p in req.periods],
            electricity_change_pct=req.electricity_change_pct,
            diesel_change_pct=req.diesel_change_pct,
            solar_offset_kwh_per_period=req.solar_offset_kwh_per_period,
        )
    except upload_analysis.UploadError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
