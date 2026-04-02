from __future__ import annotations

from fastapi import FastAPI

from simlab.api.routes import health_router, simlab_router
from simlab.core.settings import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, version=settings.app_version)
    app.include_router(health_router)
    app.include_router(simlab_router)
    return app

