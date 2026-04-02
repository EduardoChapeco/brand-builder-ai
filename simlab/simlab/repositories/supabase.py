from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Mapping, Sequence

import httpx

from simlab.core.settings import Settings
from simlab.models.contracts import PersonaDefinition


class SimlabRepositoryError(RuntimeError):
    pass


@dataclass(slots=True)
class TableResponse:
    data: list[dict[str, Any]]
    status_code: int


def _normalize_persona_definition(row: dict[str, Any]) -> PersonaDefinition:
    version = row.get("current_version") or {}
    calibration = dict(version.get("calibration_profile") or {})
    if version.get("id"):
        calibration["version_id"] = str(version["id"])
    profile = version.get("profile_json") or {}
    return PersonaDefinition.model_validate(
        {
            "id": str(row.get("id") or row.get("persona_code") or ""),
            "name": row.get("display_name") or row.get("persona_code") or "Persona",
            "demographic": profile.get("demographic") or {},
            "psychography": profile.get("psychography") or {},
            "digital_behavior": profile.get("digital_behavior") or {},
            "trigger_scores": version.get("trigger_scores") or {},
            "category_memory": profile.get("category_memory") or {},
            "default_context": (
                (profile.get("situational_defaults") or {}).get("context")
                or profile.get("prompt_contexto_padrao")
                or ""
            ),
            "source_refs": version.get("source_refs") or [],
            "calibration": calibration,
        }
    )


class SupabaseRepository:
    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self.settings = settings
        self._client = client

    def ready(self) -> bool:
        return self.settings.has_supabase

    def _headers(self) -> dict[str, str]:
        if not self.settings.has_supabase:
            raise SimlabRepositoryError("Supabase env vars are not configured.")
        return {
            "apikey": self.settings.supabase_service_role_key,
            "Authorization": f"Bearer {self.settings.supabase_service_role_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    def _base_url(self) -> str:
        return self.settings.supabase_url.rstrip("/") + "/rest/v1"

    async def _request_json(
        self,
        method: str,
        path: str,
        *,
        params: Mapping[str, Any] | None = None,
        json_body: Any | None = None,
        prefer_resolution: str | None = None,
    ) -> list[dict[str, Any]]:
        if not self.settings.has_supabase:
            raise SimlabRepositoryError("Supabase env vars are not configured.")

        client = self._client or httpx.AsyncClient(timeout=self.settings.request_timeout_seconds)
        owns_client = self._client is None
        try:
            response = await client.request(
                method,
                f"{self._base_url()}/{path.lstrip('/')}",
                params=params,
                json=json_body,
                headers={
                    **self._headers(),
                    **(
                        {"Prefer": f"{prefer_resolution},return=representation"}
                        if prefer_resolution
                        else {}
                    ),
                },
            )
        finally:
            if owns_client:
                await client.aclose()

        if response.status_code >= 400:
            raise SimlabRepositoryError(
                f"Supabase request failed ({response.status_code}) for {path}: {response.text}"
            )

        if response.status_code == 204:
            return []

        payload = response.json()
        if isinstance(payload, list):
            return [item for item in payload if isinstance(item, dict)]
        if isinstance(payload, dict):
            return [payload]
        return []

    async def ping(self) -> bool:
        await self._request_json("GET", "simlab_personas", params={"select": "id", "limit": 1})
        return True

    async def list_personas(self, *, limit: int = 50) -> list[dict[str, Any]]:
        return await self._request_json(
            "GET",
            "simlab_personas",
            params={
                "select": "id,slug,display_name,persona_code,persona_group,locale,workspace_id,is_system,status,notes",
                "order": "display_name.asc",
                "limit": limit,
            },
        )

    async def list_persona_definitions(self, workspace_id: str) -> list[PersonaDefinition]:
        rows = await self._request_json(
            "GET",
            "simlab_personas",
            params={
                "select": (
                    "id,display_name,persona_code,workspace_id,is_system,status,"
                    "current_version:simlab_persona_versions!simlab_personas_current_version_fkey("
                    "id,version_label,summary,profile_json,source_refs,trigger_scores,calibration_profile)"
                ),
                "or": f"workspace_id.eq.{workspace_id},workspace_id.is.null",
                "status": "eq.active",
                "order": "display_name.asc",
            },
        )
        return [_normalize_persona_definition(row) for row in rows]

    async def get_run(self, run_id: str) -> dict[str, Any]:
        rows = await self._request_json(
            "GET",
            "simlab_runs",
            params={"select": "*", "id": f"eq.{run_id}", "limit": 1},
        )
        if not rows:
            raise SimlabRepositoryError(f"Run {run_id} not found.")
        return rows[0]

    async def list_run_variants(self, run_id: str) -> list[dict[str, Any]]:
        return await self._request_json(
            "GET",
            "simlab_variants",
            params={"select": "*", "run_id": f"eq.{run_id}", "order": "variant_order.asc"},
        )

    async def list_run_agents(self, run_id: str) -> list[dict[str, Any]]:
        return await self._request_json(
            "GET",
            "simlab_run_agents",
            params={"select": "*", "run_id": f"eq.{run_id}", "order": "agent_index.asc"},
        )

    async def list_responses(self, run_id: str) -> list[dict[str, Any]]:
        return await self._request_json(
            "GET",
            "simlab_responses",
            params={"select": "*", "run_id": f"eq.{run_id}", "order": "created_at.asc"},
        )

    async def list_insights(self, run_id: str) -> list[dict[str, Any]]:
        return await self._request_json(
            "GET",
            "simlab_insights",
            params={"select": "*", "run_id": f"eq.{run_id}", "order": "created_at.asc"},
        )

    async def update_run(self, run_id: str, patch: dict[str, Any]) -> dict[str, Any]:
        rows = await self._request_json(
            "PATCH",
            "simlab_runs",
            params={"id": f"eq.{run_id}"},
            json_body=patch,
        )
        if not rows:
            return await self.get_run(run_id)
        return rows[0]

    async def insert_run_agents(self, rows: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
        if not rows:
            return []
        return await self._request_json("POST", "simlab_run_agents", json_body=list(rows))

    async def update_run_agent(self, agent_id: str, patch: dict[str, Any]) -> dict[str, Any]:
        rows = await self._request_json(
            "PATCH",
            "simlab_run_agents",
            params={"id": f"eq.{agent_id}"},
            json_body=patch,
        )
        if not rows:
            raise SimlabRepositoryError(f"Run agent {agent_id} not found.")
        return rows[0]

    async def insert_responses(self, rows: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
        if not rows:
            return []
        return await self._request_json("POST", "simlab_responses", json_body=list(rows))

    async def insert_or_update_insight(self, run_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        existing = await self._request_json(
            "GET",
            "simlab_insights",
            params={"select": "*", "run_id": f"eq.{run_id}", "limit": 1},
        )
        if existing:
            rows = await self._request_json(
                "PATCH",
                "simlab_insights",
                params={"id": f"eq.{existing[0]['id']}"},
                json_body=payload,
            )
            return rows[0] if rows else existing[0]

        rows = await self._request_json("POST", "simlab_insights", json_body=payload)
        if not rows:
            raise SimlabRepositoryError("Could not insert insight.")
        return rows[0]

    async def insert_observation(self, payload: dict[str, Any]) -> dict[str, Any]:
        rows = await self._request_json("POST", "simlab_observations", json_body=payload)
        if not rows:
            raise SimlabRepositoryError("Could not insert observation.")
        return rows[0]

    async def upsert_persona(self, payload: dict[str, Any]) -> dict[str, Any]:
        rows = await self._request_json(
            "POST",
            "simlab_personas",
            json_body=payload,
            params={"on_conflict": "id"},
            prefer_resolution="resolution=merge-duplicates",
        )
        if not rows:
            raise SimlabRepositoryError("Could not upsert persona.")
        return rows[0]

    async def upsert_persona_version(self, payload: dict[str, Any]) -> dict[str, Any]:
        rows = await self._request_json(
            "POST",
            "simlab_persona_versions",
            json_body=payload,
            params={"on_conflict": "persona_id,version_number"},
            prefer_resolution="resolution=merge-duplicates",
        )
        if not rows:
            raise SimlabRepositoryError("Could not upsert persona version.")
        return rows[0]

    async def get_module_policy(self, workspace_id: str, module_type: str) -> dict[str, Any] | None:
        rows = await self._request_json(
            "GET",
            "simlab_module_policies",
            params={
                "select": "*",
                "module_type": f"eq.{module_type}",
                "is_active": "eq.true",
                "or": f"workspace_id.eq.{workspace_id},workspace_id.is.null",
                "order": "updated_at.desc",
            },
        )
        if not rows:
            return None
        workspace_rows = [row for row in rows if row.get("workspace_id") == workspace_id]
        if workspace_rows:
            return workspace_rows[0]
        return rows[0]

    async def upsert_module_policy(self, workspace_id: str, module_type: str, policy_key: str, policy: dict[str, Any]) -> dict[str, Any]:
        current = await self.get_module_policy(workspace_id, module_type)
        if current and current.get("workspace_id") == workspace_id and current.get("policy_key") == policy_key:
            rows = await self._request_json(
                "PATCH",
                "simlab_module_policies",
                params={"id": f"eq.{current['id']}"},
                json_body={"policy_json": policy, "is_default": True, "is_active": True},
            )
            if not rows:
                raise SimlabRepositoryError("Could not update module policy.")
            return rows[0]

        rows = await self._request_json(
            "POST",
            "simlab_module_policies",
            json_body={
                "workspace_id": workspace_id,
                "module_type": module_type,
                "policy_key": policy_key,
                "policy_json": policy,
                "is_default": True,
                "is_active": True,
            },
        )
        if not rows:
            raise SimlabRepositoryError("Could not create module policy.")
        return rows[0]

    async def insert_character_bindings(self, rows: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
        if not rows:
            return []
        return await self._request_json("POST", "simlab_character_bindings", json_body=list(rows))
