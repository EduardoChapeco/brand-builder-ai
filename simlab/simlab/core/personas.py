from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Sequence

from simlab.core.settings import Settings
from simlab.models.contracts import PersonaDefinition


def _normalize_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (list, tuple, set)):
        return " ".join(_normalize_text(item) for item in value)
    if isinstance(value, dict):
        return " ".join(f"{key} {_normalize_text(item)}" for key, item in value.items())
    return str(value).lower()


def _token_score(tokens: set[str], value: Any) -> int:
    text = _normalize_text(value)
    if not text:
        return 0
    score = 0
    for token in tokens:
        if token and token in text:
            score += 1
    return score


@dataclass(slots=True)
class PersonaCandidate:
    persona: PersonaDefinition
    score: float


class PersonaCatalog:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    @lru_cache(maxsize=1)
    def load_seed_personas(self) -> list[PersonaDefinition]:
        path = self.settings.seed_personas_path
        if not Path(path).exists():
            raise FileNotFoundError(f"Seed personas file not found: {path}")

        payload = json.loads(Path(path).read_text(encoding="utf-8"))
        if not isinstance(payload, list):
            raise ValueError("Seed personas file must contain a list.")
        return [PersonaDefinition.model_validate(item) for item in payload]

    def _build_tokens(self, context: dict[str, Any]) -> set[str]:
        values = [
            context.get("module_type", ""),
            context.get("stimulus_type", ""),
            context.get("objective", ""),
            context.get("audience_hint", ""),
            json.dumps(context.get("target_ref", {}), ensure_ascii=True),
            json.dumps(context.get("context_policy", {}), ensure_ascii=True),
            json.dumps(context.get("request_payload", {}), ensure_ascii=True),
        ]
        return {
            token
            for value in values
            for token in _normalize_text(value).replace("/", " ").replace("-", " ").split()
            if len(token) > 2
        }

    def _score_persona(self, persona: PersonaDefinition, context: dict[str, Any]) -> float:
        tokens = self._build_tokens(context)
        score = 0.0
        score += _token_score(tokens, persona.name) * 4
        score += _token_score(tokens, persona.demographic) * 2
        score += _token_score(tokens, persona.psychography) * 3
        score += _token_score(tokens, persona.digital_behavior) * 3
        score += _token_score(tokens, persona.category_memory) * 2
        score += _token_score(tokens, persona.trigger_scores) * 2

        objective_text = _normalize_text(context.get("objective", ""))
        for value in persona.psychography.get("values", []):
            if isinstance(value, str) and value.lower() in objective_text:
                score += 3

        stimulus_type = str(context.get("stimulus_type", "")).lower()
        if "character" in stimulus_type:
            score += _token_score(tokens, persona.category_memory.get("character", ""))
        if "journey" in stimulus_type or "bio" in stimulus_type:
            score += _token_score(tokens, persona.category_memory.get("journey", ""))
        if "trend" in stimulus_type or "news" in stimulus_type:
            score += _token_score(tokens, persona.category_memory.get("trend", ""))
        if "content" in stimulus_type or "blog" in stimulus_type or "post" in stimulus_type:
            score += _token_score(tokens, persona.category_memory.get("content", ""))

        return score

    def select_from_context(
        self,
        context: dict[str, Any],
        personas: Sequence[PersonaDefinition],
        limit: int,
    ) -> list[PersonaCandidate]:
        ranked = [
            PersonaCandidate(persona=persona, score=self._score_persona(persona, context))
            for persona in personas
        ]
        ranked.sort(key=lambda item: item.score, reverse=True)
        return ranked[: max(1, min(limit, self.settings.max_persona_count))]
