from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SIMLAB_", case_sensitive=False, extra="ignore")

    app_name: str = "SimLab"
    app_version: str = "0.1.0"
    environment: str = "development"

    internal_token: str = Field(default="", repr=False)

    supabase_url: str = ""
    supabase_service_role_key: str = Field(default="", repr=False)
    supabase_schema: str = "public"

    redis_url: str = "redis://localhost:6379/0"

    qdrant_url: str = ""
    qdrant_api_key: str | None = Field(default=None, repr=False)
    qdrant_collection: str = "simlab_personas"
    qdrant_vector_size: int = 1536

    litellm_model: str = "gpt-4o-mini"
    litellm_embedding_model: str = "text-embedding-3-small"
    litellm_api_key: str | None = Field(default=None, repr=False)
    litellm_base_url: str | None = None

    default_persona_count: int = 4
    default_agents_per_persona: int = 5
    max_persona_count: int = 8
    max_agents_per_persona: int = 10

    request_timeout_seconds: float = 120.0
    seed_personas_path: Path = Path(__file__).resolve().parents[1] / "personas" / "seed_personas.json"

    @property
    def has_supabase(self) -> bool:
        return bool(self.supabase_url.strip() and self.supabase_service_role_key.strip())

    @property
    def has_qdrant(self) -> bool:
        return bool(self.qdrant_url.strip())

    @property
    def has_llm(self) -> bool:
        return bool(self.litellm_model.strip())

    @property
    def has_internal_token(self) -> bool:
        return bool(self.internal_token.strip())

    def readiness(self) -> dict[str, bool]:
        return {
            "supabase": self.has_supabase,
            "redis": bool(self.redis_url.strip()),
            "qdrant": self.has_qdrant,
            "llm": self.has_llm,
            "internal_token": self.has_internal_token,
        }


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

