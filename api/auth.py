"""
Login check for the API.

The browser logs in with Supabase and sends the access token as `Authorization: Bearer <token>`.
The token is verified here against the project's public signing keys (JWKS), so no secret is
shared with this server. Only projects using asymmetric signing keys (ES256 / RS256) are supported.

Environment:
    SUPABASE_URL   e.g. https://<project>.supabase.co  (required)
    AUTH_DISABLED  set to 1 ONLY for local development; skips the login check and turns history off
"""

import os
import logging
from dataclasses import dataclass
from functools import lru_cache
from typing import Optional

import jwt
from fastapi import Header, HTTPException

log = logging.getLogger("carbonomics.auth")

ALGORITHMS = ["ES256", "RS256"]
AUDIENCE = "authenticated"


@dataclass(frozen=True)
class User:
    id: str
    token: str
    email: Optional[str] = None
    dev: bool = False


def supabase_url() -> str:
    return os.environ.get("SUPABASE_URL", "").rstrip("/")


def auth_disabled() -> bool:
    return os.environ.get("AUTH_DISABLED") == "1"


@lru_cache(maxsize=4)
def _jwks_client(url: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(f"{url}/auth/v1/.well-known/jwks.json", cache_keys=True, lifespan=3600)


def verify_token(token: str) -> dict:
    """Return the verified claims, or raise jwt.PyJWTError (bad token) / jwt.PyJWKClientError (keys unreachable)."""
    url = supabase_url()
    key = _jwks_client(url).get_signing_key_from_jwt(token).key
    return jwt.decode(
        token, key, algorithms=ALGORITHMS, audience=AUDIENCE, issuer=f"{url}/auth/v1",
        options={"require": ["exp", "sub", "aud", "iss"]},
    )


def current_user(authorization: Optional[str] = Header(None)) -> User:
    if auth_disabled():
        log.warning("AUTH_DISABLED=1: login check is off (development only)")
        return User(id="dev", token="", dev=True)
    if not supabase_url():
        raise HTTPException(status_code=503, detail="Login is not configured on this server.")
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Please log in.", headers={"WWW-Authenticate": "Bearer"})
    token = authorization[7:].strip()
    try:
        claims = verify_token(token)
    except jwt.PyJWKClientConnectionError as exc:
        raise HTTPException(status_code=503, detail="Could not check the login right now.") from exc
    except (jwt.PyJWTError, jwt.PyJWKClientError) as exc:
        raise HTTPException(status_code=401, detail="Your login is invalid or has expired. Please log in again.",
                            headers={"WWW-Authenticate": "Bearer"}) from exc
    return User(id=claims["sub"], token=token, email=claims.get("email"))
