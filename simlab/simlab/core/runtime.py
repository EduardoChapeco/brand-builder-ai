from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Any

from simlab.core.personas import PersonaCatalog, PersonaCandidate
from simlab.core.prompts import load_prompt
from simlab.core.settings import Settings
from simlab.models.contracts import (
    CalibrationFeedbackRequest,
    CharacterBindRequest,
    GeneratePersonaRequest,
    ModulePolicyRequest,
    PersonaDefinition,
    SimlabRunStatusResponse,
)
from simlab.providers.litellm_provider import LiteLLMProvider
from simlab.repositories.supabase import SimlabRepositoryError, SupabaseRepository


def _json_default(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    return value


def _serialize(value: Any) -> Any:
    return json.loads(json.dumps(value, default=_json_default))


def _as_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    return json.dumps(value, ensure_ascii=False)


class SimlabRuntime:
    def __init__(
        self,
        *,
        settings: Settings,
        repository: SupabaseRepository,
        provider: LiteLLMProvider | None,
        personas: PersonaCatalog,
    ) -> None:
        self.settings = settings
        self.repository = repository
        self.provider = provider
        self.personas = personas

    def _require_provider(self) -> LiteLLMProvider:
        if self.provider is None:
            raise RuntimeError("LLM provider is not configured.")
        return self.provider

    def _evaluation_prompt_name(self, stimulus_type: str) -> str:
        stimulus = stimulus_type.lower()
        if "journey" in stimulus or "bio" in stimulus:
            return "validate_journey.txt"
        if "character" in stimulus:
            return "validate_character.txt"
        if "trend" in stimulus or "news" in stimulus:
            return "validate_trend.txt"
        return "validate_content.txt"

    async def _load_personas_for_run(self, workspace_id: str) -> list[PersonaDefinition]:
        if self.repository.ready():
            personas = await self.repository.list_persona_definitions(workspace_id)
            if personas:
                return personas
        return self.personas.load_seed_personas()

    def _select_personas(self, run: dict[str, Any], variants: list[dict[str, Any]], personas: list[PersonaDefinition]) -> list[PersonaCandidate]:
        context = {
            "module_type": run.get("module_type"),
            "stimulus_type": run.get("stimulus_type"),
            "objective": run.get("objective"),
            "audience_hint": run.get("audience_hint"),
            "target_ref": run.get("target_ref"),
            "context_policy": run.get("context_policy") or {},
            "request_payload": {
                **(run.get("request_payload") or {}),
                "variants": [variant.get("payload") or {} for variant in variants],
            },
        }
        limit = int(run.get("n_personas") or self.settings.default_persona_count)
        return self.personas.select_from_context(context, personas, limit)

    def _build_agent_rows(
        self,
        run: dict[str, Any],
        selected_personas: list[PersonaCandidate],
    ) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        agents_per_persona = int(run.get("n_agents_per_persona") or self.settings.default_agents_per_persona)
        perturbation_rate = float(run.get("perturbation_rate") or 0.2)
        perturb_every = max(1, round(1 / perturbation_rate)) if perturbation_rate > 0 else 0

        for candidate in selected_personas:
            persona_id = candidate.persona.id
            persona_version_id = str(candidate.persona.calibration.get("version_id") or "")
            if not persona_version_id:
                raise RuntimeError(f"Persona version id missing for persona {persona_id}")
            for agent_index in range(agents_per_persona):
                jitter = {
                    "cynicism_delta": 2 if perturb_every and (agent_index + 1) % perturb_every == 0 else 0,
                    "self_control_delta": 2 if perturb_every and (agent_index + 2) % perturb_every == 0 else 0,
                }
                rows.append(
                    {
                        "run_id": run["id"],
                        "persona_id": persona_id,
                        "persona_version_id": persona_version_id,
                        "agent_index": agent_index + 1,
                        "perturbation_profile": jitter,
                        "context_snapshot": {
                            "persona_name": candidate.persona.name,
                            "persona_score": candidate.score,
                            "default_context": candidate.persona.default_context,
                        },
                        "prompt_snapshot": {},
                        "model_name": self.settings.litellm_model,
                        "status": "queued",
                    }
                )
        return rows

    async def process_run(self, run_id: str) -> dict[str, Any]:
        run = await self.repository.get_run(run_id)
        if run["status"] in {"completed", "failed", "cancelled"}:
            return run

        provider = self._require_provider()
        await self.repository.update_run(
            run_id,
            {
                "status": "running",
                "provider_name": "litellm",
                "model_name": self.settings.litellm_model,
            },
        )

        variants = await self.repository.list_run_variants(run_id)
        if not variants:
            raise RuntimeError("Run has no variants to evaluate.")

        persona_definitions = await self._load_personas_for_run(str(run["workspace_id"]))
        selected_personas = self._select_personas(run, variants, persona_definitions)

        existing_agents = await self.repository.list_run_agents(run_id)
        if not existing_agents:
            await self.repository.insert_run_agents(self._build_agent_rows(run, selected_personas))
            existing_agents = await self.repository.list_run_agents(run_id)

        persona_lookup = {persona.id: persona for persona in persona_definitions}
        responses: list[dict[str, Any]] = []
        scored_variants: dict[str, list[float]] = {}
        segment_breakdown: dict[str, dict[str, Any]] = {}
        started_at = datetime.now(timezone.utc)

        try:
            for agent in existing_agents:
                persona_id = str(agent["persona_id"])
                persona = persona_lookup.get(persona_id)
                if persona is None:
                    raise RuntimeError(f"Persona not found: {persona_id}")

                await self.repository.update_run_agent(
                    str(agent["id"]),
                    {
                        "status": "running",
                        "started_at": datetime.now(timezone.utc).isoformat(),
                    },
                )

                best_variant_id: str | None = None
                best_score = -1.0
                best_verdict: str | None = None
                best_message: str | None = None

                for variant in variants:
                    evaluation = await self._evaluate_variant(run, persona, variant, agent, provider)
                    variant_id = str(variant["id"])
                    response_row = {
                        "run_id": run_id,
                        "run_agent_id": agent["id"],
                        "persona_id": persona_id,
                        "persona_version_id": agent["persona_version_id"],
                        "variant_id": variant_id,
                        "response_text": evaluation["quote"],
                        "response_json": evaluation["detail"],
                        "sentiment_score": evaluation["score"] / 100,
                        "interest_score": evaluation["score"],
                        "action_intent": evaluation["action_intent"],
                        "trigger_scores": evaluation["trigger_scores"],
                        "barrier_scores": evaluation["barrier_scores"],
                        "latency_ms": None,
                        "token_usage": {},
                    }
                    responses.append(response_row)
                    scored_variants.setdefault(variant_id, []).append(float(evaluation["score"]))

                    persona_bucket = segment_breakdown.setdefault(
                        persona.name,
                        {
                            "persona_id": persona_id,
                            "scores": [],
                            "quotes": [],
                            "triggers": [],
                            "barriers": [],
                        },
                    )
                    persona_bucket["scores"].append(evaluation["score"])
                    persona_bucket["quotes"].append(evaluation["quote"])
                    if evaluation["main_trigger"]:
                        persona_bucket["triggers"].append(evaluation["main_trigger"])
                    if evaluation["main_barrier"]:
                        persona_bucket["barriers"].append(evaluation["main_barrier"])

                    if evaluation["score"] > best_score:
                        best_score = evaluation["score"]
                        best_variant_id = variant_id
                        best_verdict = evaluation["verdict"]
                        best_message = evaluation["quote"]

                await self.repository.update_run_agent(
                    str(agent["id"]),
                    {
                        "status": "completed",
                        "variant_id": best_variant_id,
                        "verdict": best_verdict,
                        "finished_at": datetime.now(timezone.utc).isoformat(),
                        "error_message": best_message,
                    },
                )

            if responses:
                await self.repository.insert_responses(responses)

            winner_variant_id, insight_payload = await self._synthesize_outcome(
                run,
                variants,
                scored_variants,
                responses,
                segment_breakdown,
                provider,
            )

            await self.repository.insert_or_update_insight(
                run_id,
                {
                    "run_id": run_id,
                    "verdict": insight_payload["verdict"],
                    "executive_summary": insight_payload["executive_summary"],
                    "aggregate_scores": insight_payload["aggregate_scores"],
                    "segment_breakdown": insight_payload["segment_breakdown"],
                    "trigger_map": insight_payload["trigger_map"],
                    "zone_analysis": insight_payload["zone_analysis"],
                    "top_improvements": insight_payload["top_improvements"],
                    "variant_rankings": insight_payload["variant_rankings"],
                    "risk_alert": insight_payload["risk_alert"],
                    "synthesis_model": self.settings.litellm_model,
                    "synthesis_prompt_snapshot": insight_payload["synthesis_prompt_snapshot"],
                },
            )

            completed_at = datetime.now(timezone.utc)
            return await self.repository.update_run(
                run_id,
                {
                    "status": "completed",
                    "verdict": insight_payload["verdict"],
                    "winning_variant_id": winner_variant_id,
                    "completed_at": completed_at.isoformat(),
                    "total_latency_ms": int((completed_at - started_at).total_seconds() * 1000),
                    "result_payload": {
                        "winner_variant_id": winner_variant_id,
                        "aggregate_scores": insight_payload["aggregate_scores"],
                    },
                    "selected_persona_ids": [candidate.persona.id for candidate in selected_personas],
                },
            )
        except Exception as exc:
            await self.repository.update_run(
                run_id,
                {
                    "status": "failed",
                    "verdict": "blocked",
                    "failure_reason": str(exc),
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                },
            )
            raise

    async def _evaluate_variant(
        self,
        run: dict[str, Any],
        persona: PersonaDefinition,
        variant: dict[str, Any],
        agent: dict[str, Any],
        provider: LiteLLMProvider,
    ) -> dict[str, Any]:
        system_prompt = load_prompt(self._evaluation_prompt_name(str(run.get("stimulus_type") or "")))
        variant_payload = variant.get("payload") or {}
        user_prompt = json.dumps(
            {
                "run": {
                    "id": run["id"],
                    "module_type": run["module_type"],
                    "stimulus_type": run["stimulus_type"],
                    "objective": run["objective"],
                    "audience_hint": run.get("audience_hint"),
                    "target_ref": run.get("target_ref"),
                },
                "persona": persona.model_dump(mode="json"),
                "variant": {
                    "id": variant["id"],
                    "label": variant.get("label"),
                    "payload": variant_payload,
                },
                "agent_context": {
                    "perturbation_profile": agent.get("perturbation_profile") or {},
                    "context_snapshot": agent.get("context_snapshot") or {},
                },
            },
            ensure_ascii=False,
            indent=2,
        )
        output = await provider.generate_json(system_prompt=system_prompt, user_prompt=user_prompt)
        score = max(0, min(int(output.get("score", 0)), 100))
        main_trigger = str(output.get("main_trigger", "") or "")
        main_barrier = str(output.get("main_barrier", "") or "")
        quote = str(output.get("quote", "") or "")
        verdict = str(output.get("verdict", "revise") or "revise")
        action_intent = (
            str(output.get("action_intent", "") or "")
            or ("compraria" if verdict == "approved" else "ignoraria" if verdict == "blocked" else "salvaria")
        )
        return {
            "score": score,
            "verdict": verdict,
            "interest_level": output.get("interest_level", "medium"),
            "main_trigger": main_trigger,
            "main_barrier": main_barrier,
            "action_intent": action_intent,
            "quote": quote,
            "trigger_scores": {main_trigger: 1} if main_trigger else {},
            "barrier_scores": {main_barrier: 1} if main_barrier else {},
            "detail": output,
        }

    async def _synthesize_outcome(
        self,
        run: dict[str, Any],
        variants: list[dict[str, Any]],
        scored_variants: dict[str, list[float]],
        responses: list[dict[str, Any]],
        segment_breakdown: dict[str, dict[str, Any]],
        provider: LiteLLMProvider,
    ) -> tuple[str | None, dict[str, Any]]:
        if not scored_variants:
            raise RuntimeError("Run completed without any variant scores.")

        averages = {
            variant_id: round(sum(scores) / max(len(scores), 1), 2)
            for variant_id, scores in scored_variants.items()
        }
        winner_variant_id = max(averages, key=averages.get)
        winner_variant = next((item for item in variants if str(item["id"]) == winner_variant_id), None)

        summary_prompt = load_prompt("insight_synthesizer.txt")
        user_prompt = json.dumps(
            {
                "run": {
                    "id": run["id"],
                    "module_type": run["module_type"],
                    "stimulus_type": run["stimulus_type"],
                    "objective": run["objective"],
                },
                "variant_scores": averages,
                "winner_variant": winner_variant,
                "responses": responses[:60],
            },
            ensure_ascii=False,
            indent=2,
        )
        summary = await provider.generate_json(
            system_prompt=summary_prompt,
            user_prompt=user_prompt,
            temperature=0.1,
        )

        normalized_segments: dict[str, Any] = {}
        trigger_counts: dict[str, int] = {}
        barrier_counts: dict[str, int] = {}

        for persona_name, bucket in segment_breakdown.items():
            scores = bucket["scores"] or []
            triggers = [item for item in bucket["triggers"] if item]
            barriers = [item for item in bucket["barriers"] if item]
            normalized_segments[persona_name] = {
                "persona_id": bucket["persona_id"],
                "interest_score": round(sum(scores) / max(len(scores), 1), 2) if scores else 0,
                "quotes": bucket["quotes"][:3],
                "top_triggers": triggers[:3],
                "top_barriers": barriers[:3],
            }
            for item in triggers:
                trigger_counts[item] = trigger_counts.get(item, 0) + 1
            for item in barriers:
                barrier_counts[item] = barrier_counts.get(item, 0) + 1

        variant_rankings = sorted(
            (
                {
                    "variant_id": variant_id,
                    "label": next((item.get("label") for item in variants if str(item["id"]) == variant_id), None),
                    "score": score,
                    "is_winner": variant_id == winner_variant_id,
                }
                for variant_id, score in averages.items()
            ),
            key=lambda item: item["score"],
            reverse=True,
        )

        score_values = list(averages.values())
        aggregate_scores = {
            "interest_score": round(sum(score_values) / max(len(score_values), 1), 2),
            "action_score": round(max(score_values), 2),
            "cynicism_rate": round((100 - min(score_values)) if score_values else 0, 2),
        }

        verdict = str(summary.get("verdict", "revise") or "revise")
        return winner_variant_id, {
            "verdict": verdict,
            "executive_summary": str(summary.get("summary", "") or ""),
            "aggregate_scores": aggregate_scores,
            "segment_breakdown": normalized_segments,
            "trigger_map": {
                "triggers": trigger_counts,
                "barriers": barrier_counts,
            },
            "zone_analysis": {},
            "top_improvements": summary.get("top_actions", []) or [],
            "variant_rankings": variant_rankings,
            "risk_alert": {
                "notes": summary.get("risk_notes", []) or [],
            },
            "synthesis_prompt_snapshot": {
                "system_prompt": summary_prompt,
                "user_prompt": user_prompt,
            },
        }

    async def generate_persona(self, request: GeneratePersonaRequest) -> dict[str, Any]:
        provider = self._require_provider()
        prompt = load_prompt("persona_generation.txt")
        payload = await provider.generate_json(
            system_prompt=prompt,
            user_prompt=json.dumps(
                {
                    "workspace_id": str(request.workspace_id),
                    "briefing": request.briefing,
                    "category": request.category,
                },
                ensure_ascii=False,
                indent=2,
            ),
            temperature=0.2,
        )
        return payload

    async def record_feedback(self, request: CalibrationFeedbackRequest | dict[str, Any]) -> dict[str, Any]:
        payload = request if isinstance(request, dict) else request.model_dump(mode="json")
        observed_at = payload.get("observed_at") or datetime.now(timezone.utc).isoformat()
        metrics = payload.get("metrics") or {}
        metric_key = next(iter(metrics.keys()), payload.get("observation_type", "feedback"))
        metric_value_raw = metrics.get(metric_key) if isinstance(metrics, dict) else None
        metric_value = float(metric_value_raw) if isinstance(metric_value_raw, (int, float)) else None
        return await self.repository.insert_observation(
            {
                "workspace_id": str(payload["workspace_id"]),
                "simlab_run_id": payload.get("run_id"),
                "source_module": payload.get("module_type") or "simlab_feedback",
                "source_record_type": payload.get("observation_type") or "feedback",
                "source_record_id": payload.get("persona_id"),
                "metric_key": metric_key,
                "metric_value": metric_value,
                "observation_payload": {
                    "metrics": metrics,
                    "note": payload.get("note"),
                    "source": payload.get("source"),
                    "persona_version_id": payload.get("persona_version_id"),
                },
                "observed_at": observed_at,
            }
        )

    async def bind_character(self, request: CharacterBindRequest) -> dict[str, Any]:
        rows = await self.repository.insert_character_bindings(
            [
                {
                    "workspace_id": str(request.workspace_id),
                    "character_id": str(request.character_id),
                    "persona_id": persona_id,
                    "persona_version_id": request.persona_version_id,
                    "binding_type": request.binding_type,
                    "alignment_score": request.alignment_score,
                    "binding_notes": request.binding_notes,
                    "is_active": True,
                }
                for persona_id in request.persona_ids
            ]
        )
        return {"bindings": rows}

    async def upsert_module_policy(self, request: ModulePolicyRequest) -> dict[str, Any]:
        row = await self.repository.upsert_module_policy(
            workspace_id=str(request.workspace_id),
            module_type=request.module_type,
            policy_key=request.policy_key,
            policy=request.policy,
        )
        return {"policy": row}

    async def get_run_status(self, run_id: str) -> SimlabRunStatusResponse:
        run = await self.repository.get_run(run_id)
        return SimlabRunStatusResponse.model_validate(
            {
                **run,
                "variants": await self.repository.list_run_variants(run_id),
                "agents": await self.repository.list_run_agents(run_id),
                "responses": await self.repository.list_responses(run_id),
                "insights": await self.repository.list_insights(run_id),
            }
        )

    def run_async(self, coro: Any) -> Any:
        return asyncio.run(coro)
