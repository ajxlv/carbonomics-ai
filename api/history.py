"""
Run history, stored in Supabase Postgres through its REST API (PostgREST).

Every call is made with the logged-in user's own token, so the database's Row Level Security
decides what they can see: their own runs only. No service-role key is used or needed.

Environment:
    SUPABASE_URL        https://<project>.supabase.co
    SUPABASE_ANON_KEY   the public (anon / publishable) key
"""

import json
import os
from typing import List, Optional
from uuid import UUID

import httpx

from api.auth import User, supabase_url

MAX_STORED_BYTES = 2_000_000
LIST_COLUMNS = "id,kind,title,created_at,parent_run_id,input,summary"
TIMEOUT = 10.0


class HistoryError(Exception):
    """Saving or reading history failed; the message is safe to show."""


def enabled(user: User) -> bool:
    return bool(not user.dev and supabase_url() and os.environ.get("SUPABASE_ANON_KEY"))


def _client() -> httpx.Client:
    return httpx.Client(timeout=TIMEOUT)


def _headers(user: User, prefer: Optional[str] = None) -> dict:
    h = {"apikey": os.environ["SUPABASE_ANON_KEY"], "Authorization": f"Bearer {user.token}",
         "Content-Type": "application/json"}
    if prefer:
        h["Prefer"] = prefer
    return h


def _call(user: User, method: str, path: str, **kw):
    if not enabled(user):
        raise HistoryError("History is not available on this server.")
    try:
        with _client() as c:
            r = c.request(method, f"{supabase_url()}/rest/v1/{path}", headers=_headers(user, kw.pop("prefer", None)), **kw)
    except httpx.HTTPError as exc:
        raise HistoryError("Could not reach the history database.") from exc
    if r.status_code >= 400:
        raise HistoryError(f"The history database refused the request (HTTP {r.status_code}).")
    return r


def shrink(result: dict) -> dict:
    """Keep the stored copy under the size cap: drop the bulky per-period arrays if needed."""
    if len(json.dumps(result)) <= MAX_STORED_BYTES:
        return result
    small = {k: v for k, v in result.items() if k not in ("periods", "emission_future")}
    acc = small.get("accounting")
    if isinstance(acc, dict):
        small["accounting"] = {k: v for k, v in acc.items() if k != "periods"}
    fc = small.get("forecast")
    if isinstance(fc, dict) and "targets" in fc:
        small["forecast"] = {**fc, "targets": {t: {k: v for k, v in b.items() if k not in ("backtest", "future")}
                                               for t, b in fc["targets"].items()}}
    small["truncated"] = True
    return small


def save_run(user: User, kind: str, input_: dict, result: dict, summary: dict,
             title: Optional[str] = None, parent_run_id: Optional[UUID] = None) -> str:
    clean_title = (title or "").strip()[:200] or None
    row = {"kind": kind, "title": clean_title, "input": input_, "result": shrink(result), "summary": summary}
    if parent_run_id:
        row["parent_run_id"] = str(parent_run_id)
    r = _call(user, "POST", "runs", json=row, prefer="return=representation")
    data = r.json()
    if not data:
        raise HistoryError("The run could not be saved.")
    return data[0]["id"]


def list_runs(user: User, limit: int = 50) -> List[dict]:
    limit = max(1, min(int(limit), 200))
    return _call(user, "GET", f"runs?select={LIST_COLUMNS}&order=created_at.desc&limit={limit}").json()


def get_run(user: User, run_id: UUID) -> Optional[dict]:
    rows = _call(user, "GET", f"runs?select=*&id=eq.{run_id}&limit=1").json()
    return rows[0] if rows else None


def delete_run(user: User, run_id: UUID) -> bool:
    r = _call(user, "DELETE", f"runs?id=eq.{run_id}", prefer="return=representation")
    return bool(r.json())
