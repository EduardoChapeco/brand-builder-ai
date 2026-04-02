from __future__ import annotations

import hashlib
import hmac
from functools import lru_cache

from fastapi import HTTPException, status

from simlab.core.personas import PersonaCatalog
from simlab.core.runtime import SimlabRuntime
from simlab.core.settings import get_settings
from simlab.providers.litellm_provider import LiteLLMProvider
from simlab.repositories.supabase import SupabaseRepository


def _compute_signature(secret: str, timestamp: str, path: str, body: bytes) -> str:
    payload = b".".join([timestamp.encode("utf-8"), path.encode("utf-8"), body])
    return hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()


def verify_internal_request(body: bytes, timestamp: str | None, signature: str | None, path: str) -> None:
    settings = get_settings()
    if not settings.has_internal_token:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Internal secret is not configured.")
    if not timestamp or not signature:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing SimLab signature headers.")

    expected = _compute_signature(settings.internal_token, timestamp, path, body)
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid SimLab signature.")


@lru_cache(maxsize=1)
def get_repository() -> SupabaseRepository:
    return SupabaseRepository(get_settings())


@lru_cache(maxsize=1)
def get_provider() -> LiteLLMProvider | None:
    settings = get_settings()
    if not settings.has_llm:
        return None
    return LiteLLMProvider(settings)


@lru_cache(maxsize=1)
def get_personas() -> PersonaCatalog:
    return PersonaCatalog(get_settings())


@lru_cache(maxsize=1)
def get_runtime() -> SimlabRuntime:
    settings = get_settings()
    return SimlabRuntime(
        settings=settings,
        repository=get_repository(),
        provider=get_provider(),
        personas=get_personas(),
    )
