from __future__ import annotations

import asyncio

from simlab.core.personas import PersonaCatalog
from simlab.core.runtime import SimlabRuntime
from simlab.core.settings import get_settings
from simlab.providers.litellm_provider import LiteLLMProvider
from simlab.repositories.supabase import SupabaseRepository
from simlab.workers.celery_app import get_celery_app

try:  # pragma: no cover - optional dependency guard
    celery_app = get_celery_app()
except Exception:  # pragma: no cover - optional dependency guard
    celery_app = None


def _build_runtime() -> SimlabRuntime:
    settings = get_settings()
    repository = SupabaseRepository(settings)
    provider = LiteLLMProvider(settings) if settings.has_llm else None
    personas = PersonaCatalog(settings)
    return SimlabRuntime(
        settings=settings,
        repository=repository,
        provider=provider,
        personas=personas,
    )


if celery_app is not None:  # pragma: no branch

    @celery_app.task(name="simlab.process_run", bind=True)
    def process_run_task(self, run_id: str) -> dict:
        runtime = _build_runtime()
        return asyncio.run(runtime.process_run(run_id))

    @celery_app.task(name="simlab.record_feedback", bind=True)
    def record_feedback_task(self, payload: dict) -> dict:
        runtime = _build_runtime()
        return asyncio.run(runtime.record_feedback(payload))

else:

    def process_run_task(*_args, **_kwargs):  # pragma: no cover - fallback for missing celery
        raise RuntimeError("celery is not installed")

    def record_feedback_task(*_args, **_kwargs):  # pragma: no cover - fallback for missing celery
        raise RuntimeError("celery is not installed")

