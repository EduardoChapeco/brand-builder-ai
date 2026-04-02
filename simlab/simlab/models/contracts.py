from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class StimulusVariant(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str | None = None
    label: str
    payload: dict[str, Any] = Field(default_factory=dict)


class BaseValidationRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    run_id: UUID | str | None = None
    workspace_id: UUID | str
    module_type: str
    stimulus_type: str
    objective: str
    audience_hint: str | None = None
    variants: list[StimulusVariant] = Field(default_factory=list)
    target_ref: dict[str, Any] = Field(default_factory=dict)
    n_personas: int = Field(default=4, ge=1, le=8)
    n_agents_per_persona: int = Field(default=5, ge=1, le=10)
    context_policy: dict[str, Any] = Field(default_factory=dict)
    request_payload: dict[str, Any] = Field(default_factory=dict)


class ValidateContentRequest(BaseValidationRequest):
    variants: list[StimulusVariant] = Field(default_factory=list)


class ValidateJourneyRequest(BaseValidationRequest):
    page_snapshot: dict[str, Any] = Field(default_factory=dict)


class ValidateCharacterRequest(BaseValidationRequest):
    character_draft: dict[str, Any] = Field(default_factory=dict)
    niche: str = ""
    business_type: str = ""


class ValidateTrendRequest(BaseValidationRequest):
    trend_signal: dict[str, Any] = Field(default_factory=dict)


class GeneratePersonaRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    workspace_id: UUID | str
    briefing: dict[str, Any] = Field(default_factory=dict)
    category: str = "custom"


class CalibrationFeedbackRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    workspace_id: UUID | str
    run_id: UUID | str | None = None
    persona_id: str | None = None
    persona_version_id: str | None = None
    module_type: str
    observation_type: str
    source: str = "first_party"
    metrics: dict[str, Any] = Field(default_factory=dict)
    note: str | None = None
    observed_at: datetime | None = None


class ModulePolicyRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    workspace_id: UUID | str
    module_type: str
    policy_key: str = "default"
    policy: dict[str, Any] = Field(default_factory=dict)


class CharacterBindRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    workspace_id: UUID | str
    character_id: UUID | str
    persona_ids: list[str] = Field(default_factory=list)
    persona_version_id: str | None = None
    binding_type: str = "validation"
    alignment_score: float | None = None
    binding_notes: str | None = None


class PersonaDefinition(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    demographic: dict[str, Any] = Field(default_factory=dict)
    psychography: dict[str, Any] = Field(default_factory=dict)
    digital_behavior: dict[str, Any] = Field(default_factory=dict)
    trigger_scores: dict[str, int | float] = Field(default_factory=dict)
    category_memory: dict[str, Any] = Field(default_factory=dict)
    default_context: str = ""
    source_refs: list[dict[str, Any] | str] = Field(default_factory=list)
    calibration: dict[str, Any] = Field(default_factory=dict)


class SimlabRunCreateResult(BaseModel):
    run_id: UUID | str
    status: str


class SimlabAgentResult(BaseModel):
    id: UUID | str
    run_id: UUID | str
    persona_id: str
    agent_index: int
    status: str
    variant_id: UUID | str | None = None
    score: float | None = None
    verdict: str | None = None
    message: str | None = None


class SimlabRunStatusResponse(BaseModel):
    id: UUID | str
    workspace_id: UUID | str
    module_type: str
    stimulus_type: str
    objective: str
    status: str
    verdict: str | None = None
    winning_variant_id: UUID | str | None = None
    failure_reason: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    completed_at: datetime | None = None
    variants: list[dict[str, Any]] = Field(default_factory=list)
    agents: list[SimlabAgentResult] = Field(default_factory=list)
    responses: list[dict[str, Any]] = Field(default_factory=list)
    insights: list[dict[str, Any]] = Field(default_factory=list)
