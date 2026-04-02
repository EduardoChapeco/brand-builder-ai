from __future__ import annotations

from functools import lru_cache

from simlab.core.settings import Settings, get_settings

try:  # pragma: no cover - optional dependency guard
    from celery import Celery
except ImportError:  # pragma: no cover - optional dependency guard
    Celery = None  # type: ignore[assignment]


@lru_cache(maxsize=1)
def get_celery_app() -> "Celery":
    if Celery is None:
        raise RuntimeError("celery is not installed")

    settings = get_settings()
    app = Celery(
        "simlab",
        broker=settings.redis_url,
        backend=settings.redis_url,
        include=["simlab.workers.tasks"],
    )
    app.conf.update(
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        timezone="UTC",
        enable_utc=True,
        task_track_started=True,
    )
    return app

