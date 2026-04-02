import {
  corsHeaders,
  createServiceClient,
  dispatchVideoRuntime,
  insertVideoJob,
  safeJsonResponse,
} from "./video.ts";

export { corsHeaders, createServiceClient, safeJsonResponse };

export type JsonRecord = Record<string, unknown>;
type SupabaseClient = ReturnType<typeof createServiceClient>;

export type RemotionTemplateRecord = {
  id: string;
  workspace_id: string | null;
  name: string;
  description: string | null;
  category: string;
  template_key: string;
  props_schema: JsonRecord;
  default_props: JsonRecord;
  renderer_contract: JsonRecord;
  tags: string[] | null;
  is_system: boolean | null;
  is_public: boolean | null;
  is_active: boolean | null;
};

export type RemotionCompositionRecord = {
  id: string;
  workspace_id: string;
  video_project_id: string | null;
  template_id: string | null;
  name: string;
  category: string;
  template_key: string;
  remotion_composition_key: string;
  props_schema: JsonRecord;
  default_props: JsonRecord;
  input_props: JsonRecord;
  timing_overrides: JsonRecord;
  brand_bindings: JsonRecord;
  asset_requirements: JsonRecord;
  render_preset: JsonRecord;
  metadata: JsonRecord;
  generated_by_ai: boolean;
  ai_prompt: string | null;
  experimental_code_path: boolean;
  tsx_code: string | null;
  status: string;
};

export type BrandBindings = {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  accentColor: string;
  textColor: string;
  headlineFont: string;
  bodyFont: string;
  accentFont: string;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  watermarkText: string | null;
};

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const toRecord = (value: unknown): JsonRecord => (isRecord(value) ? value : {});
export const toText = (value: unknown) => (typeof value === "string" ? value.trim() : "");
export const toOptionalText = (value: unknown) => {
  const text = toText(value);
  return text.length > 0 ? text : null;
};
export const toBoolean = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback;
export const toNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
export const toStringArray = (value: unknown) =>
  Array.isArray(value)
    ? Array.from(new Set(value.map((item) => toText(item)).filter(Boolean)))
    : [];

export const mergeRecords = (...values: unknown[]) =>
  values.reduce<JsonRecord>((acc, value) => (isRecord(value) ? { ...acc, ...value } : acc), {});

export const readJsonBody = async (req: Request) => {
  try {
    return toRecord(await req.json());
  } catch {
    throw new Error("Payload JSON invalido.");
  }
};

export const requireWorkspaceRow = async <T extends JsonRecord>(
  supabase: SupabaseClient,
  table: string,
  workspaceId: string,
  rowId: string,
  label: string,
) => {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("id", rowId)
    .eq("workspace_id", workspaceId)
    .single();

  if (error || !data) {
    throw error || new Error(`${label} nao encontrado(a).`);
  }

  return data as T;
};

export const resolveWorkspaceBrandBindings = async (
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<BrandBindings> => {
  const { data } = await supabase
    .from("brand_kits")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  return {
    primaryColor: typeof data?.color_primary === "string" ? data.color_primary : "#7C3AED",
    secondaryColor: typeof data?.color_secondary === "string" ? data.color_secondary : "#0F172A",
    backgroundColor: typeof data?.color_bg_dark === "string" ? data.color_bg_dark : "#09090B",
    accentColor: typeof data?.color_accent === "string" ? data.color_accent : "#F59E0B",
    textColor: typeof data?.color_text_light === "string" ? data.color_text_light : "#F8FAFC",
    headlineFont: typeof data?.font_headline === "string" ? data.font_headline : "Inter",
    bodyFont: typeof data?.font_body === "string" ? data.font_body : "Inter",
    accentFont: typeof data?.font_accent === "string" ? data.font_accent : "Inter",
    logoUrl: typeof data?.logo_url === "string" ? data.logo_url : null,
    logoDarkUrl: typeof data?.logo_dark_url === "string" ? data.logo_dark_url : null,
    watermarkText: typeof data?.watermark_text === "string" ? data.watermark_text : null,
  };
};

export const resolveTemplateByHint = async (
  supabase: SupabaseClient,
  workspaceId: string,
  body: JsonRecord,
) => {
  const templateId = toOptionalText(body.template_id);
  const templateKey = toOptionalText(body.template_key) || toOptionalText(body.templateHint);
  const category = toOptionalText(body.category) || toOptionalText(body.composition_category);

  if (templateId) {
    const { data, error } = await supabase
      .from("remotion_templates")
      .select("*")
      .eq("id", templateId)
      .maybeSingle();
    if (error || !data) throw error || new Error("Template Remotion nao encontrado.");

    const allowed = data.workspace_id === workspaceId || data.is_public === true || data.is_system === true;
    if (!allowed) throw new Error("Template Remotion fora do escopo deste workspace.");
    return data as RemotionTemplateRecord;
  }

  let query = supabase
    .from("remotion_templates")
    .select("*")
    .eq("is_active", true)
    .or(`workspace_id.eq.${workspaceId},is_public.eq.true,is_system.eq.true`);

  if (templateKey) query = query.eq("template_key", templateKey);
  if (category) query = query.eq("category", category);

  const { data, error } = await query
    .order("is_system", { ascending: false })
    .order("is_public", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Nenhum template Remotion elegivel foi encontrado para este contexto.");
  }

  return data as RemotionTemplateRecord;
};

export const createRemotionComposition = async (
  supabase: SupabaseClient,
  params: {
    workspaceId: string;
    videoProjectId?: string | null;
    sourcePostId?: string | null;
    sourceStoryboardId?: string | null;
    sourceScrollSectionId?: string | null;
    sourceSimlabRunId?: string | null;
    name: string;
    category: string;
    template: RemotionTemplateRecord;
    inputProps?: JsonRecord;
    timingOverrides?: JsonRecord;
    brandBindings?: JsonRecord;
    assetRequirements?: JsonRecord;
    renderPreset?: JsonRecord;
    metadata?: JsonRecord;
    generatedByAi?: boolean;
    aiPrompt?: string | null;
    experimentalCodePath?: boolean;
    tsxCode?: string | null;
  }) => {
    const { data, error } = await supabase
      .from("remotion_compositions")
      .insert({
        workspace_id: params.workspaceId,
        video_project_id: params.videoProjectId || null,
        source_post_id: params.sourcePostId || null,
        source_storyboard_id: params.sourceStoryboardId || null,
        source_scroll_section_id: params.sourceScrollSectionId || null,
        source_simlab_run_id: params.sourceSimlabRunId || null,
        template_id: params.template.id,
        name: params.name,
        category: params.category,
        template_key: params.template.template_key,
        remotion_composition_key: "CerebroMotionTemplate",
        props_schema: params.template.props_schema || {},
        default_props: params.template.default_props || {},
        input_props: params.inputProps || {},
        timing_overrides: params.timingOverrides || {},
        brand_bindings: params.brandBindings || {},
        asset_requirements: params.assetRequirements || {},
        render_preset: params.renderPreset || params.template.renderer_contract || {},
        metadata: params.metadata || {},
        generated_by_ai: params.generatedByAi === true,
        ai_prompt: params.aiPrompt || null,
        experimental_code_path: params.experimentalCodePath === true,
        tsx_code: params.tsxCode || null,
        status: "draft",
      })
      .select("*")
      .single();

    if (error || !data) {
      throw error || new Error("Nao foi possivel persistir a composicao Remotion.");
    }

    return data as RemotionCompositionRecord;
  };

export const logRemotionGeneration = async (
  supabase: SupabaseClient,
  params: {
    workspaceId: string;
    compositionId: string;
    templateId?: string | null;
    promptOriginal: string;
    promptEnriched?: string | null;
    providerName?: string | null;
    modelName?: string | null;
    tokensIn?: number | null;
    tokensOut?: number | null;
    generationMs?: number | null;
    requestPayload?: JsonRecord;
    resultPayload?: JsonRecord;
  },
) => {
    const { data, error } = await supabase
      .from("remotion_ai_generations")
      .insert({
        workspace_id: params.workspaceId,
        composition_id: params.compositionId,
        template_id: params.templateId || null,
        prompt_original: params.promptOriginal,
        prompt_enriched: params.promptEnriched || null,
        provider_name: params.providerName || "cerebro",
        model_name: params.modelName || "template-guardrails",
        tokens_in: params.tokensIn || null,
        tokens_out: params.tokensOut || null,
        generation_ms: params.generationMs || null,
        request_payload: params.requestPayload || {},
        result_payload: params.resultPayload || {},
      })
      .select("*")
      .single();

    if (error || !data) {
      throw error || new Error("Nao foi possivel registrar a geracao Remotion.");
    }

    return data;
};

export const queueRemotionRenderJob = async (
  supabase: SupabaseClient,
  params: {
    workspaceId: string;
    composition: RemotionCompositionRecord;
    videoProjectId?: string | null;
    exportId?: string | null;
    scrollSectionId?: string | null;
    inputProps?: JsonRecord;
    renderOptions?: JsonRecord;
  },
) => {
  const job = await insertVideoJob(supabase, {
    workspaceId: params.workspaceId,
    jobType: "remotion_render",
    providerCapability: "programmatic_video",
    providerName: "video-runtime",
    modelName: "remotion",
    priority: 70,
    videoProjectId: params.videoProjectId || params.composition.video_project_id || null,
    exportId: params.exportId || null,
    scrollSectionId: params.scrollSectionId || null,
    remotionCompositionId: params.composition.id,
    requestPayload: {
      composition_id: params.composition.id,
      input_props: params.inputProps || {},
      render_options: params.renderOptions || {},
      template_key: params.composition.template_key,
    },
  });

  await supabase
    .from("remotion_compositions")
    .update({
      status: "rendering",
      metadata: {
        ...(params.composition.metadata || {}),
        latest_job_id: job.id,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.composition.id);

  const dispatch = await dispatchVideoRuntime(supabase, String(job.id));
  return { job, dispatch };
};

export const loadRemotionJobStatus = async (
  supabase: SupabaseClient,
  jobIds: string[],
) => {
  const { data: jobs, error } = await supabase
    .from("video_jobs")
    .select("*")
    .in("id", jobIds);
  if (error) throw error;

  const compositionIds = Array.from(new Set((jobs || []).map((job) => job.remotion_composition_id).filter(Boolean)));
  const assetIds = Array.from(new Set((jobs || []).map((job) => job.output_asset_id).filter(Boolean)));

  const [{ data: compositions }, { data: outputAssets }] = await Promise.all([
    compositionIds.length
      ? supabase.from("remotion_compositions").select("*").in("id", compositionIds)
      : Promise.resolve({ data: [] }),
    assetIds.length
      ? supabase.from("video_assets").select("*").in("id", assetIds)
      : Promise.resolve({ data: [] }),
  ]);

  return (jobs || []).map((job) => ({
    job,
    composition: (compositions || []).find((item) => item.id === job.remotion_composition_id) || null,
    output_asset: (outputAssets || []).find((item) => item.id === job.output_asset_id) || null,
  }));
};

export const respondForQueuedJob = (params: {
  jobId: string;
  accepted: boolean;
  dispatchError?: string | null;
  composition?: RemotionCompositionRecord | null;
}) =>
  safeJsonResponse({
    job_id: params.jobId,
    status: params.accepted ? "queued" : "failed",
    dispatch_error: params.dispatchError || null,
    composition: params.composition || null,
  }, params.accepted ? 200 : 500);
