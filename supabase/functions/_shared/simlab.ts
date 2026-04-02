import { createServiceClient } from "./postgen.ts";

type SupabaseClient = ReturnType<typeof createServiceClient>;

export type SimlabValidationType = "content" | "journey" | "character" | "trend";
export type SimlabRunStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type SimlabRunVerdict = "approved" | "revise" | "blocked" | null;

export type SimlabTargetRef = {
  table: string;
  id: string;
} | null;

export type SimlabRunRow = {
  id: string;
  workspace_id: string;
  module_type: string;
  stimulus_type: string;
  objective: string;
  audience_hint: string | null;
  target_ref: SimlabTargetRef;
  status: SimlabRunStatus;
  verdict: SimlabRunVerdict;
  requested_by: string | null;
  request_payload: Record<string, unknown>;
  context_policy: Record<string, unknown>;
  provider_policy: Record<string, unknown>;
  n_personas: number;
  n_agents_per_persona: number;
  perturbation_rate: number;
  selected_persona_ids: string[];
  model_name: string | null;
  provider_name: string | null;
  winning_variant_id: string | null;
  failure_reason: string | null;
  total_cost: number | null;
  total_latency_ms: number | null;
  result_payload: Record<string, unknown>;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type SimlabVariantInput = {
  key: string;
  label: string;
  artifact: Record<string, unknown>;
};

export type SimlabVariantRow = {
  id: string;
  run_id: string;
  variant_key: string;
  variant_order: number;
  label: string | null;
  payload: Record<string, unknown>;
  rendered_text: string | null;
  score: number | null;
  verdict: SimlabRunVerdict;
  is_winner: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type SimlabInsightRow = {
  id: string;
  run_id: string;
  verdict: Exclude<SimlabRunVerdict, null>;
  executive_summary: string;
  aggregate_scores: Record<string, unknown>;
  segment_breakdown: Record<string, unknown>;
  trigger_map: Record<string, unknown>;
  zone_analysis: Record<string, unknown>;
  top_improvements: unknown[];
  variant_rankings: unknown[];
  risk_alert: Record<string, unknown>;
  synthesis_model: string | null;
  synthesis_prompt_snapshot: Record<string, unknown>;
  created_at?: string | null;
  updated_at?: string | null;
};

export type SimlabPersonaSummary = {
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
    created_at: string | null;
  } | null;
};

export type SimlabModulePolicyRow = {
  id: string;
  workspace_id: string | null;
  module_type: string;
  policy_key: string;
  policy_json: Record<string, unknown>;
  is_default: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type SimlabDispatchParams = {
  workspaceId: string;
  validationType: SimlabValidationType;
  moduleType: string;
  stimulusType: string;
  targetTable?: string | null;
  targetId?: string | null;
  objective?: string | null;
  audienceHint?: string | null;
  variants?: SimlabVariantInput[];
  requestPayload?: Record<string, unknown>;
  contextPolicy?: Record<string, unknown>;
  requestedBy?: string | null;
  waitForCompletion?: boolean;
  timeoutMs?: number;
};

export type SimlabDispatchResult = {
  run: SimlabRunRow;
  variants: SimlabVariantRow[];
  insight: SimlabInsightRow | null;
};

type SimlabRunInsertRow = Record<string, unknown>;
type RawVariantRow = Record<string, unknown>;
type RawInsightRow = Record<string, unknown>;
type RawPolicyRow = Record<string, unknown>;
type RawPersonaRow = Record<string, unknown>;

const RUN_LINK_COLUMNS: Record<string, { runId: string; status: string; validatedAt: string }> = {
  posts_v2: { runId: "latest_simlab_run_id", status: "simlab_status", validatedAt: "simlab_validated_at" },
  blog_articles: { runId: "latest_simlab_run_id", status: "simlab_status", validatedAt: "simlab_validated_at" },
  bio_links: { runId: "latest_simlab_run_id", status: "simlab_status", validatedAt: "simlab_validated_at" },
  brand_characters: { runId: "latest_simlab_run_id", status: "simlab_status", validatedAt: "simlab_validated_at" },
  news_items: { runId: "latest_simlab_run_id", status: "simlab_status", validatedAt: "simlab_validated_at" },
};

const textEncoder = new TextEncoder();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});

const toArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const toString = (value: unknown) => (typeof value === "string" && value.trim().length > 0 ? value.trim() : null);

const toNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const toVerdict = (value: unknown): SimlabRunVerdict => {
  const verdict = toString(value);
  if (verdict === "approved" || verdict === "revise" || verdict === "blocked") return verdict;
  return null;
};

const parseTargetRef = (value: unknown): SimlabTargetRef => {
  const direct = toRecord(value);
  if (toString(direct.table) && toString(direct.id)) {
    return {
      table: toString(direct.table)!,
      id: toString(direct.id)!,
    };
  }

  const raw = toString(value);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (toString(parsed.table) && toString(parsed.id)) {
      return {
        table: toString(parsed.table)!,
        id: toString(parsed.id)!,
      };
    }
  } catch {
    const [table, id] = raw.split(":");
    if (table && id) return { table, id };
  }

  return null;
};

const stringifyTargetRef = (targetTable?: string | null, targetId?: string | null) =>
  targetTable && targetId ? JSON.stringify({ table: targetTable, id: targetId }) : null;

const mapRunRow = (value: RawPolicyRow): SimlabRunRow => ({
  id: toString(value.id) || "",
  workspace_id: toString(value.workspace_id) || "",
  module_type: toString(value.module_type) || "",
  stimulus_type: toString(value.stimulus_type) || "",
  objective: toString(value.objective) || "",
  audience_hint: toString(value.audience_hint),
  target_ref: parseTargetRef(value.target_ref),
  status: (toString(value.status) || "queued") as SimlabRunStatus,
  verdict: toVerdict(value.verdict),
  requested_by: toString(value.requested_by),
  request_payload: toRecord(value.request_payload),
  context_policy: toRecord(value.context_policy),
  provider_policy: toRecord(value.provider_policy),
  n_personas: toNumber(value.n_personas) || 2,
  n_agents_per_persona: toNumber(value.n_agents_per_persona) || 5,
  perturbation_rate: toNumber(value.perturbation_rate) || 0.2,
  selected_persona_ids: toArray(value.selected_persona_ids).filter((item): item is string => typeof item === "string"),
  model_name: toString(value.model_name),
  provider_name: toString(value.provider_name),
  winning_variant_id: toString(value.winning_variant_id),
  failure_reason: toString(value.failure_reason),
  total_cost: toNumber(value.total_cost),
  total_latency_ms: toNumber(value.total_latency_ms),
  result_payload: toRecord(value.result_payload),
  completed_at: toString(value.completed_at),
  created_at: toString(value.created_at),
  updated_at: toString(value.updated_at),
});

const mapVariantRow = (value: RawVariantRow): SimlabVariantRow => ({
  id: toString(value.id) || "",
  run_id: toString(value.run_id) || "",
  variant_key: toString(value.variant_key) || "",
  variant_order: toNumber(value.variant_order) || 0,
  label: toString(value.label),
  payload: toRecord(value.payload),
  rendered_text: toString(value.rendered_text),
  score: toNumber(value.score),
  verdict: toVerdict(value.verdict),
  is_winner: value.is_winner === true,
  created_at: toString(value.created_at),
  updated_at: toString(value.updated_at),
});

const mapInsightRow = (value: RawInsightRow | null): SimlabInsightRow | null => {
  if (!value) return null;

  const verdict = toVerdict(value.verdict);
  if (!verdict) return null;

  return {
    id: toString(value.id) || "",
    run_id: toString(value.run_id) || "",
    verdict,
    executive_summary: toString(value.executive_summary) || "",
    aggregate_scores: toRecord(value.aggregate_scores),
    segment_breakdown: toRecord(value.segment_breakdown),
    trigger_map: toRecord(value.trigger_map),
    zone_analysis: toRecord(value.zone_analysis),
    top_improvements: toArray(value.top_improvements),
    variant_rankings: toArray(value.variant_rankings),
    risk_alert: toRecord(value.risk_alert),
    synthesis_model: toString(value.synthesis_model),
    synthesis_prompt_snapshot: toRecord(value.synthesis_prompt_snapshot),
    created_at: toString(value.created_at),
    updated_at: toString(value.updated_at),
  };
};

const mapPolicyRow = (value: RawPolicyRow): SimlabModulePolicyRow => ({
  id: toString(value.id) || "",
  workspace_id: toString(value.workspace_id),
  module_type: toString(value.module_type) || "",
  policy_key: toString(value.policy_key) || "default",
  policy_json: toRecord(value.policy_json),
  is_default: value.is_default === true,
  is_active: value.is_active !== false,
  created_by: toString(value.created_by),
  created_at: toString(value.created_at),
  updated_at: toString(value.updated_at),
});

const mapPersonaRow = (value: RawPersonaRow): SimlabPersonaSummary => {
  const version = toRecord(value.current_version);

  return {
    id: toString(value.id) || "",
    slug: toString(value.slug) || "",
    display_name: toString(value.display_name) || "",
    persona_code: toString(value.persona_code) || "",
    persona_group: toString(value.persona_group) || "",
    locale: toString(value.locale) || "pt-BR",
    workspace_id: toString(value.workspace_id),
    is_system: value.is_system === true,
    status: toString(value.status) || "active",
    notes: toString(value.notes),
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

const requireEnv = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} nao configurada.`);
  return value;
};

const resolvePath = (validationType: SimlabValidationType) => {
  const mapping: Record<SimlabValidationType, string> = {
    content: "/simlab/validate-content",
    journey: "/simlab/validate-journey",
    character: "/simlab/validate-character",
    trend: "/simlab/validate-trend",
  };
  return mapping[validationType];
};

const hex = (bytes: Uint8Array) => Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");

const signPayload = async (timestamp: string, path: string, body: string) => {
  const secret = requireEnv("SIMLAB_INTERNAL_SECRET");
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(`${timestamp}.${path}.${body}`));
  return hex(new Uint8Array(signature));
};

export const callSimlabPath = async (path: string, payload: Record<string, unknown>) => {
  const baseUrl = requireEnv("SIMLAB_INTERNAL_URL").replace(/\/+$/, "");
  const body = JSON.stringify(payload);
  const timestamp = new Date().toISOString();
  const signature = await signPayload(timestamp, path, body);

  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-simlab-timestamp": timestamp,
      "x-simlab-signature": signature,
    },
    body,
  });

  const text = await response.text();
  const parsed = text ? JSON.parse(text) as Record<string, unknown> : {};

  if (!response.ok) {
    const detail = toString(parsed.detail) || toString(parsed.error) || `SimLab ${response.status}`;
    throw new Error(detail);
  }

  return parsed;
};

const callSimlabApi = async (validationType: SimlabValidationType, payload: Record<string, unknown>) =>
  callSimlabPath(resolvePath(validationType), payload);

const choosePolicyNumbers = (policyJson: Record<string, unknown>) => {
  const minSample = Math.max(1, toNumber(policyJson.persona_sample_size_min) || 2);
  const maxSample = Math.max(minSample, toNumber(policyJson.persona_sample_size_max) || 4);
  const agentsPerPersona = Math.max(1, toNumber(policyJson.agents_per_persona) || 5);
  const perturbationRate = Math.max(0, Math.min(1, toNumber(policyJson.perturbation_rate) || 0.2));

  return {
    nPersonas: Math.max(minSample, Math.min(maxSample, 3)),
    agentsPerPersona,
    perturbationRate,
  };
};

const pickPolicy = (rows: RawPolicyRow[]) => {
  const mapped = rows.map(mapPolicyRow).filter((row) => row.is_active);
  const workspacePolicy = mapped.find((row) => row.workspace_id);
  if (workspacePolicy) return workspacePolicy;
  return mapped.find((row) => row.is_default) || mapped[0] || null;
};

const loadPolicyForModule = async (supabase: SupabaseClient, workspaceId: string, moduleType: string) => {
  const { data, error } = await supabase
    .from("simlab_module_policies")
    .select("*")
    .eq("module_type", moduleType)
    .eq("is_active", true)
    .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return pickPolicy((data || []) as RawPolicyRow[]);
};

export const createSimlabRun = async (
  supabase: SupabaseClient,
  params: SimlabDispatchParams,
) => {
  const policy = await loadPolicyForModule(supabase, params.workspaceId, params.moduleType);
  const resolvedPolicy = policy?.policy_json || {};
  const numericPolicy = choosePolicyNumbers(resolvedPolicy);

  const runInsert: SimlabRunInsertRow = {
    workspace_id: params.workspaceId,
    module_type: params.moduleType,
    stimulus_type: params.stimulusType,
    objective: params.objective || params.moduleType,
    audience_hint: params.audienceHint || null,
    target_ref: stringifyTargetRef(params.targetTable, params.targetId),
    status: "queued",
    verdict: null,
    requested_by: params.requestedBy || null,
    request_payload: params.requestPayload || {},
    context_policy: params.contextPolicy || {},
    provider_policy: resolvedPolicy,
    n_personas: numericPolicy.nPersonas,
    n_agents_per_persona: numericPolicy.agentsPerPersona,
    perturbation_rate: numericPolicy.perturbationRate,
    selected_persona_ids: [],
    result_payload: {},
  };

  const { data: run, error: runError } = await supabase
    .from("simlab_runs")
    .insert(runInsert)
    .select("*")
    .single();

  if (runError || !run) throw runError || new Error("Nao foi possivel criar simlab_run.");

  const normalizedVariants = (params.variants || []).map((variant, index) => ({
    run_id: run.id,
    variant_key: variant.key,
    variant_order: index,
    label: variant.label,
    payload: variant.artifact,
    rendered_text: typeof variant.artifact.rendered_text === "string" ? variant.artifact.rendered_text : null,
  }));

  const variants = normalizedVariants.length > 0
    ? await supabase.from("simlab_variants").insert(normalizedVariants).select("*")
    : { data: [], error: null };

  if (variants.error) throw variants.error;

  return {
    run: mapRunRow(run as RawPolicyRow),
    variants: ((variants.data || []) as RawVariantRow[]).map(mapVariantRow),
  };
};

export const linkRunToTarget = async (
  supabase: SupabaseClient,
  targetRef: SimlabTargetRef,
  runId: string,
  status: SimlabRunStatus,
) => {
  if (!targetRef?.table || !targetRef.id) return;
  const mapping = RUN_LINK_COLUMNS[targetRef.table];
  if (!mapping) return;

  const payload: Record<string, unknown> = {
    [mapping.runId]: runId,
    [mapping.status]: status,
  };

  if (status === "completed" || status === "failed" || status === "cancelled") {
    payload[mapping.validatedAt] = new Date().toISOString();
  }

  const { error } = await supabase
    .from(targetRef.table)
    .update(payload)
    .eq("id", targetRef.id);

  if (error) throw error;
};

export const getSimlabStatus = async (supabase: SupabaseClient, runId: string) => {
  const [{ data: run, error: runError }, { data: variants, error: variantsError }, { data: insight, error: insightError }] = await Promise.all([
    supabase.from("simlab_runs").select("*").eq("id", runId).single(),
    supabase.from("simlab_variants").select("*").eq("run_id", runId).order("variant_order"),
    supabase.from("simlab_insights").select("*").eq("run_id", runId).maybeSingle(),
  ]);

  if (runError || !run) throw runError || new Error("SimLab run nao encontrado.");
  if (variantsError) throw variantsError;
  if (insightError) throw insightError;

  return {
    run: mapRunRow(run as RawPolicyRow),
    variants: ((variants || []) as RawVariantRow[]).map(mapVariantRow),
    insight: mapInsightRow((insight || null) as RawInsightRow | null),
  };
};

export const syncTargetWithRun = async (supabase: SupabaseClient, run: SimlabRunRow) => {
  await linkRunToTarget(supabase, run.target_ref, run.id, run.status);
};

const patchRunFailure = async (supabase: SupabaseClient, runId: string, errorMessage: string) => {
  const { error } = await supabase
    .from("simlab_runs")
    .update({
      status: "failed",
      verdict: "blocked",
      failure_reason: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId);

  if (error) throw error;
};

export const awaitSimlabCompletion = async (
  supabase: SupabaseClient,
  runId: string,
  timeoutMs = 90_000,
) => {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const status = await getSimlabStatus(supabase, runId);
    if (status.run.status === "completed" || status.run.status === "failed" || status.run.status === "cancelled") {
      return status;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_200));
  }

  await patchRunFailure(supabase, runId, "Tempo limite excedido aguardando conclusao do SimLab.");
  return getSimlabStatus(supabase, runId);
};

export const dispatchSimlabRun = async (
  supabase: SupabaseClient,
  params: SimlabDispatchParams,
): Promise<SimlabDispatchResult> => {
  const created = await createSimlabRun(supabase, params);
  await linkRunToTarget(supabase, created.run.target_ref, created.run.id, "queued");

  try {
    await callSimlabApi(params.validationType, {
      run_id: created.run.id,
      workspace_id: params.workspaceId,
      module_type: params.moduleType,
      stimulus_type: params.stimulusType,
      objective: created.run.objective,
      audience_hint: params.audienceHint || null,
      target_ref: created.run.target_ref,
      variants: created.variants.map((variant) => ({
        id: variant.id,
        label: variant.label || variant.variant_key,
        payload: variant.payload,
      })),
      request_payload: params.requestPayload || {},
      context_policy: params.contextPolicy || {},
      n_personas: created.run.n_personas,
      n_agents_per_persona: created.run.n_agents_per_persona,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await patchRunFailure(supabase, created.run.id, message);
    throw error;
  }

  if (params.waitForCompletion) {
    const completed = await awaitSimlabCompletion(supabase, created.run.id, params.timeoutMs);
    await syncTargetWithRun(supabase, completed.run);
    return completed;
  }

  return {
    run: created.run,
    variants: created.variants,
    insight: null,
  };
};

export const listWorkspaceSimlabRuns = async (supabase: SupabaseClient, workspaceId: string, limit = 30) => {
  const { data, error } = await supabase
    .from("simlab_runs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, limit));

  if (error) throw error;
  return ((data || []) as RawPolicyRow[]).map(mapRunRow);
};

export const listWorkspacePersonas = async (supabase: SupabaseClient, workspaceId: string) => {
  const { data, error } = await supabase
    .from("simlab_personas")
    .select(`
      id,
      slug,
      display_name,
      persona_code,
      persona_group,
      locale,
      workspace_id,
      is_system,
      status,
      notes,
      current_version:simlab_persona_versions!simlab_personas_current_version_fkey(
        id,
        version_number,
        version_label,
        summary,
        profile_json,
        source_refs,
        trigger_scores,
        calibration_profile,
        prompt_template,
        created_at
      )
    `)
    .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
    .eq("status", "active")
    .order("display_name");

  if (error) throw error;
  return ((data || []) as RawPersonaRow[]).map(mapPersonaRow);
};

export const listWorkspaceModulePolicies = async (supabase: SupabaseClient, workspaceId: string) => {
  const { data, error } = await supabase
    .from("simlab_module_policies")
    .select("*")
    .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
    .eq("is_active", true)
    .order("module_type")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return ((data || []) as RawPolicyRow[]).map(mapPolicyRow);
};

export const getModulePolicy = async (supabase: SupabaseClient, workspaceId: string, moduleType: string) => {
  const { data, error } = await supabase
    .from("simlab_module_policies")
    .select("*")
    .eq("module_type", moduleType)
    .eq("is_active", true)
    .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return pickPolicy((data || []) as RawPolicyRow[]);
};

export const upsertModulePolicy = async (
  supabase: SupabaseClient,
  workspaceId: string,
  moduleType: string,
  policy: Record<string, unknown>,
) => {
  const policyKey = toString(policy.policy_key) || "default";
  const current = await getModulePolicy(supabase, workspaceId, moduleType);

  if (current && current.workspace_id === workspaceId && current.policy_key === policyKey) {
    const { data, error } = await supabase
      .from("simlab_module_policies")
      .update({
        policy_json: policy,
        is_default: policy.is_default !== false,
        is_active: policy.is_active !== false,
      })
      .eq("id", current.id)
      .select("*")
      .single();

    if (error || !data) throw error || new Error("Nao foi possivel atualizar policy do SimLab.");
    return mapPolicyRow(data as RawPolicyRow);
  }

  const { data, error } = await supabase
    .from("simlab_module_policies")
    .insert({
      workspace_id: workspaceId,
      module_type: moduleType,
      policy_key: policyKey,
      policy_json: policy,
      is_default: policy.is_default !== false,
      is_active: policy.is_active !== false,
    })
    .select("*")
    .single();

  if (error || !data) throw error || new Error("Nao foi possivel criar policy do SimLab.");
  return mapPolicyRow(data as RawPolicyRow);
};

export const recordSimlabObservation = async (
  supabase: SupabaseClient,
  workspaceId: string,
  payload: {
    simlab_run_id?: string | null;
    source_module: string;
    source_record_type: string;
    source_record_id?: string | null;
    metric_key: string;
    metric_value?: number | null;
    observation_payload?: Record<string, unknown>;
    created_by?: string | null;
    observed_at?: string | null;
  },
) => {
  const { data, error } = await supabase
    .from("simlab_observations")
    .insert({
      workspace_id: workspaceId,
      simlab_run_id: payload.simlab_run_id || null,
      source_module: payload.source_module,
      source_record_type: payload.source_record_type,
      source_record_id: payload.source_record_id || null,
      metric_key: payload.metric_key,
      metric_value: typeof payload.metric_value === "number" ? payload.metric_value : null,
      observation_payload: payload.observation_payload || {},
      created_by: payload.created_by || null,
      observed_at: payload.observed_at || new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) throw error || new Error("Nao foi possivel registrar observacao do SimLab.");
  return data;
};

export const upsertCharacterBindings = async (
  supabase: SupabaseClient,
  workspaceId: string,
  characterId: string,
  bindings: Array<{
    persona_id: string;
    persona_version_id?: string | null;
    binding_type?: string | null;
    alignment_score?: number | null;
    binding_notes?: string | null;
    created_by?: string | null;
  }>,
) => {
  const results: Record<string, unknown>[] = [];

  for (const binding of bindings) {
    const bindingType = toString(binding.binding_type) || "validation";
    const existingQuery = await supabase
      .from("simlab_character_bindings")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("character_id", characterId)
      .eq("persona_id", binding.persona_id)
      .eq("binding_type", bindingType)
      .maybeSingle();

    if (existingQuery.error) throw existingQuery.error;

    if (existingQuery.data) {
      const { data, error } = await supabase
        .from("simlab_character_bindings")
        .update({
          persona_version_id: binding.persona_version_id || null,
          alignment_score: typeof binding.alignment_score === "number" ? binding.alignment_score : null,
          binding_notes: binding.binding_notes || null,
          created_by: binding.created_by || null,
          is_active: true,
        })
        .eq("id", existingQuery.data.id)
        .select("*")
        .single();

      if (error || !data) throw error || new Error("Nao foi possivel atualizar binding do SimLab.");
      results.push(data as Record<string, unknown>);
      continue;
    }

    const { data, error } = await supabase
      .from("simlab_character_bindings")
      .insert({
        workspace_id: workspaceId,
        character_id: characterId,
        persona_id: binding.persona_id,
        persona_version_id: binding.persona_version_id || null,
        binding_type: bindingType,
        alignment_score: typeof binding.alignment_score === "number" ? binding.alignment_score : null,
        binding_notes: binding.binding_notes || null,
        created_by: binding.created_by || null,
        is_active: true,
      })
      .select("*")
      .single();

    if (error || !data) throw error || new Error("Nao foi possivel criar binding do SimLab.");
    results.push(data as Record<string, unknown>);
  }

  return results;
};
