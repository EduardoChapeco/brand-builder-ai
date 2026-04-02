from __future__ import annotations

from fastapi import APIRouter

from simlab.api.dependencies import get_personas, get_repository
from simlab.core.qdrant_index import QdrantPersonaIndex
from simlab.core.settings import get_settings

router = APIRouter()


@router.get("/health")
async def health() -> dict:
    settings = get_settings()
    repo = get_repository()
    readiness = settings.readiness()
    db_ready = False
    db_error: str | None = None

    if repo.ready():
        try:
            db_ready = await repo.ping()
        except Exception as exc:  # pragma: no cover - health should report broken infra
            db_error = str(exc)

    qdrant_ready = False
    qdrant_error: str | None = None
    if settings.has_qdrant:
        try:
            qdrant_ready = await QdrantPersonaIndex(settings).ping()
        except Exception as exc:  # pragma: no cover - health should report broken infra
            qdrant_error = str(exc)

    personas = []
    try:
        personas = get_personas().load_seed_personas()
    except Exception:
        personas = []

    ready = bool(
        db_ready
        and readiness["redis"]
        and qdrant_ready
        and readiness["llm"]
        and readiness["internal_token"]
    )
    return {
        "service": settings.app_name,
        "status": "ok" if ready else "degraded",
        "ready": ready,
        "components": {
            **readiness,
            "supabase_ping": db_ready,
            "qdrant_ping": qdrant_ready,
            "seed_personas": len(personas),
        },
        "error": db_error or qdrant_error,
    }
