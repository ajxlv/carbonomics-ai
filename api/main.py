"""
Carbonomics-AI web API.

POST /api/analyze  - upload a CSV, get validation, carbon accounting and a forecast as JSON.
GET  /api/health   - liveness check.

Uploaded files are processed in memory and are never stored.

Run locally (from the repository root):
    uvicorn api.main:app --reload --port 8000

CORS: set ALLOWED_ORIGINS to a comma-separated list (default: the Vite dev server).
"""

import os
import sys
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

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
