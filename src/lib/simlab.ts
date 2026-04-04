import { supabase } from "@/integrations/supabase/client";

export type SimlabRunStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type SimlabRunVerdict = "approved" | "revise" | "blocked" | null;
export type SimlabValidationType = "content" | "journey" | "character" | "trend";

export type SimlabTargetRef = {
  table: string;
  id: string;
} | null;

export type SimlabVariantArtifact = Record<string, unknown>;

export type SimlabVariant = {
  id: string;
  run_id?: string;
  variant_key: string;
  variant_order?: number;
  label: string | null;
  payload: SimlabVariantArtifact;
  rendered_text?: string | null;
  score?: number | null;
  verdict?: SimlabRunVerdict;
  is_winner?: boolean;
};

export type SimlabRun = {
  id: string;
  workspace_id: string;
  module_type: string;
  stimulus_type: string;
  objective: string;
  audience_hint?: string | null;
  target_ref?: SimlabTargetRef;
  status: SimlabRunStatus;
  verdict: SimlabRunVerdict;
  failure_reason?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
  n_personas?: number;
  n_agents_per_persona?: number;
  selected_persona_ids?: string[];
  model_name?: string | null;
  provider_name?: string | null;
  winning_variant_id?: string | null;
};

export type SimlabInsight = {
  executive_summary: string;
  aggregate_scores: Record<string, unknown>;
  segment_breakdown: Record<string, unknown>;
  trigger_map: Record<string, unknown>;
  zone_analysis: Record<string, unknown>;
  top_improvements: unknown[];
  variant_rankings: unknown[];
  risk_alert: Record<string, unknown>;
  synthesis_model?: string | null;
};

export type SimlabPersona = {
  id: string;
  slug: string;
  display_name: string;
  persona_code: string;
  persona_group: string;
  locale: string;
  workspace_id: string | null;
  is_system: boolean;
  status: string;
  notes: string | null;
  current_version: {
    id: string;
    version_number: number;
    version_label: string;
    summary: string;
    profile_json: Record<string, unknown>;
    source_refs: unknown[];
    trigger_scores: Record<string, unknown>;
    calibration_profile: Record<string, unknown>;
    prompt_template: string;
    created_at?: string | null;
  } | null;
};

export type SimlabModulePolicy = {
  id: string;
  workspace_id: string | null;
  module_type: string;
  policy_key: string;
  policy_json: Record<string, unknown>;
  is_default: boolean;
  is_active: boolean;
  updated_at?: string | null;
};

export type SimlabStatusPayload = {
  run: SimlabRun;
  variants: SimlabVariant[];
  insight: SimlabInsight | null;
};

export type SimlabDispatchInput = {
  workspace_id: string;
  validation_type: SimlabValidationType;
  module_type: string;
  stimulus_type: string;
  objective?: string;
  audience_hint?: string | null;
  target_ref?: { table?: string; id?: string } | null;
  variants: Array<{ key: string; label: string; artifact: SimlabVariantArtifact }>;
  request_payload?: Record<string, unknown>;
  context_policy?: Record<string, unknown>;
  requested_by?: string;
  wait_for_completion?: boolean;
  timeout_ms?: number;
};

type SimlabDispatchResponse = {
  run_id: string;
  status: SimlabRunStatus;
  verdict: SimlabRunVerdict;
  summary?: string | null;
  variants?: unknown[];
  insight?: unknown;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const toRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});
export const toString = (value: unknown) => (typeof value === "string" && value.trim().length > 0 ? value.trim() : null);
export const toArray = (value: unknown) => (Array.isArray(value) ? value : []);
export const toNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

export const toVerdict = (value: unknown): SimlabRunVerdict => {
  const verdict = toString(value);
  if (verdict === "approved" || verdict === "revise" || verdict === "blocked") return verdict;
  return null;
};

export const toTargetRef = (value: unknown): SimlabTargetRef => {
  const record = toRecord(value);
  if (toString(record.table) && toString(record.id)) {
    return {
      table: toString(record.table)!,
      id: toString(record.id)!,
    };
  }
  return null;
};

export const toRun = (value: unknown): SimlabRun => {
  const record = toRecord(value);
  return {
    id: toString(record.id) || "",
    workspace_id: toString(record.workspace_id) || "",
    module_type: toString(record.module_type) || "",
    stimulus_type: toString(record.stimulus_type) || "",
    objective: toString(record.objective) || "",
    audience_hint: toString(record.audience_hint),
    target_ref: toTargetRef(record.target_ref),
    status: (toString(record.status) || "queued") as SimlabRunStatus,
    verdict: toVerdict(record.verdict),
    failure_reason: toString(record.failure_reason),
    created_at: toString(record.created_at),
    updated_at: toString(record.updated_at),
    completed_at: toString(record.completed_at),
    n_personas: toNumber(record.n_personas) || undefined,
    n_agents_per_persona: toNumber(record.n_agents_per_persona) || undefined,
    selected_persona_ids: toArray(record.selected_persona_ids).filter((item): item is string => typeof item === "string"),
    model_name: toString(record.model_name),
    provider_name: toString(record.provider_name),
    winning_variant_id: toString(record.winning_variant_id),
  };
};

export const toVariant = (value: unknown): SimlabVariant => {
  const record = toRecord(value);
  return {
    id: toString(record.id) || crypto.randomUUID(),
    run_id: toString(record.run_id) || undefined,
    variant_key: toString(record.variant_key) || "variant",
    variant_order: toNumber(record.variant_order) || undefined,
    label: toString(record.label),
    payload: toRecord(record.payload),
    rendered_text: toString(record.rendered_text),
    score: toNumber(record.score),
    verdict: toVerdict(record.verdict),
    is_winner: record.is_winner === true,
  };
};

export const toInsight = (value: unknown): SimlabInsight | null => {
  const record = toRecord(value);
  if (Object.keys(record).length === 0) return null;
  return {
    executive_summary: toString(record.executive_summary) || "",
    aggregate_scores: toRecord(record.aggregate_scores),
    segment_breakdown: toRecord(record.segment_breakdown),
    trigger_map: toRecord(record.trigger_map),
    zone_analysis: toRecord(record.zone_analysis),
    top_improvements: toArray(record.top_improvements),
    variant_rankings: toArray(record.variant_rankings),
    risk_alert: toRecord(record.risk_alert),
    synthesis_model: toString(record.synthesis_model),
  };
};

export const toPersona = (value: unknown): SimlabPersona => {
  const record = toRecord(value);
  const version = toRecord(record.current_version);
  return {
    id: toString(record.id) || "",
    slug: toString(record.slug) || "",
    display_name: toString(record.display_name) || "",
    persona_code: toString(record.persona_code) || "",
    persona_group: toString(record.persona_group) || "",
    locale: toString(record.locale) || "pt-BR",
    workspace_id: toString(record.workspace_id),
    is_system: record.is_system === true,
    status: toString(record.status) || "active",
    notes: toString(record.notes),
    current_version: version.id
      ? {
          id: toString(version.id) || "",
          version_number: toNumber(version.version_number) || 1,
          version_label: toString(version.version_label) || "v1",
          summary: toString(version.summary) || "",
          profile_json: toRecord(version.profile_json),
          source_refs: toArray(version.source_refs),
          trigger_scores: toRecord(version.trigger_scores),
          calibration_profile: toRecord(version.calibration_profile),
          prompt_template: toString(version.prompt_template) || "",
          created_at: toString(version.created_at),
        }
      : null,
  };
};

export const toPolicy = (value: unknown): SimlabModulePolicy => {
  const record = toRecord(value);
  return {
    id: toString(record.id) || "",
    workspace_id: toString(record.workspace_id),
    module_type: toString(record.module_type) || "",
    policy_key: toString(record.policy_key) || "default",
    policy_json: toRecord(record.policy_json),
    is_default: record.is_default === true,
    is_active: record.is_active !== false,
    updated_at: toString(record.updated_at),
  };
};


export const dispatchSimlabValidation = async (payload: SimlabDispatchInput) => {
  const { data, error } = await supabase.functions.invoke("simlab-dispatch", { body: payload });
  if (error) throw new Error(error.message);
  const typed = (data || {}) as SimlabDispatchResponse;
  if (!typed.run_id) throw new Error("SimLab nao retornou run_id.");
  return typed;
};

export const fetchSimlabStatus = async (runId: string) => {
  const { data, error } = await supabase.functions.invoke("simlab-status", {
    body: { run_id: runId },
  });
  if (error) throw new Error(error.message);
  const payload = toRecord(data);
  return {
    run: toRun(payload.run),
    variants: toArray(payload.variants).map(toVariant),
    insight: toInsight(payload.insight),
  } satisfies SimlabStatusPayload;
};

export const fetchWorkspaceSimlabRuns = async (workspaceId: string, limit = 20) => {
  const { data, error } = await supabase.functions.invoke("simlab-status", {
    body: { workspace_id: workspaceId, limit },
  });
  if (error) throw new Error(error.message);
  const payload = toRecord(data);
  return toArray(payload.runs).map(toRun);
};

export const fetchWorkspacePersonas = async (workspaceId: string) => {
  const { data, error } = await supabase.functions.invoke("simlab-personas", {
    body: { workspace_id: workspaceId },
  });
  if (error) throw new Error(error.message);
  const payload = toRecord(data);
  return toArray(payload.personas).map(toPersona);
};

export const fetchModulePolicy = async (workspaceId: string, moduleType: string) => {
  const { data, error } = await supabase.functions.invoke("simlab-module-policy", {
    body: { workspace_id: workspaceId, module_type: moduleType },
  });
  if (error) throw new Error(error.message);
  return toPolicy(toRecord(toRecord(data).policy));
};

export const fetchWorkspaceModulePolicies = async (workspaceId: string) => {
  const { data, error } = await supabase.functions.invoke("simlab-module-policy", {
    body: { workspace_id: workspaceId },
  });
  if (error) throw new Error(error.message);
  const payload = toRecord(data);
  return toArray(payload.policies).map(toPolicy);
};

export const saveModulePolicy = async (workspaceId: string, moduleType: string, policy: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("simlab-module-policy", {
    body: { workspace_id: workspaceId, module_type: moduleType, policy },
  });
  if (error) throw new Error(error.message);
  return toPolicy(toRecord(toRecord(data).policy));
};

export const submitSimlabFeedback = async (payload: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("simlab-feedback", { body: payload });
  if (error) throw new Error(error.message);
  return toRecord(data);
};

export const bindSimlabCharacter = async (
  workspaceId: string,
  characterId: string,
  binding: Record<string, unknown>,
) => {
  const { data, error } = await supabase.functions.invoke("simlab-character-bind", {
    body: {
      workspace_id: workspaceId,
      character_id: characterId,
      binding,
    },
  });
  if (error) throw new Error(error.message);
  return toRecord(data);
};

export const awaitSimlabCompletion = async (runId: string, timeoutMs = 90_000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const status = await fetchSimlabStatus(runId);
    if (status.run.status === "completed" || status.run.status === "failed" || status.run.status === "cancelled") {
      return status;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }
  throw new Error("Tempo limite excedido aguardando a conclusao do SimLab.");
};

export const getSimlabVerdictLabel = (verdict: SimlabRunVerdict) => {
  if (verdict === "approved") return "Approved";
  if (verdict === "revise") return "Revise";
  if (verdict === "blocked") return "Blocked";
  return "Pending";
};
