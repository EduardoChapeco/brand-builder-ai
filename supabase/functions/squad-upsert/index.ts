import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createServiceClient, safeJsonResponse } from "../_shared/postgen.ts";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

const toStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : [];

const getString = (record: Record<string, unknown>, key: string) => {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
};

const resolveSlug = async (
  supabase: ReturnType<typeof createServiceClient>,
  workspaceId: string,
  desiredName: string,
  existingId?: string | null,
) => {
  const base = slugify(desiredName) || "squad";

  if (existingId) {
    const { data: current } = await supabase
      .from("workspace_squads")
      .select("slug")
      .eq("id", existingId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (current?.slug) return current.slug;
  }

  const { data: matches, error } = await supabase
    .from("workspace_squads")
    .select("slug")
    .eq("workspace_id", workspaceId)
    .ilike("slug", `${base}%`);

  if (error) throw error;
  const used = new Set((matches || []).map((item) => item.slug));
  if (!used.has(base)) return base;

  let attempt = 2;
  while (used.has(`${base}-${attempt}`)) {
    attempt += 1;
  }
  return `${base}-${attempt}`;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as {
      workspace_id?: string;
      workspace_squad_id?: string | null;
      squad_template_id?: string | null;
      template_slug?: string | null;
      name?: string;
      onboarding_answers?: Record<string, unknown>;
      config?: Record<string, unknown>;
      is_default?: boolean;
      status?: string;
    };

    if (!body.workspace_id) {
      return safeJsonResponse({ error: "workspace_id e obrigatorio." }, 400);
    }

    const supabase = createServiceClient();
    const answers = toRecord(body.onboarding_answers);
    const config = toRecord(body.config);

    const templateQuery = body.squad_template_id
      ? supabase.from("squad_templates").select("*").eq("id", body.squad_template_id).eq("is_active", true).maybeSingle()
      : supabase.from("squad_templates").select("*").eq("slug", body.template_slug || "").eq("is_active", true).maybeSingle();

    const [{ data: workspace }, { data: template, error: templateError }] = await Promise.all([
      supabase.from("workspaces").select("id,name").eq("id", body.workspace_id).maybeSingle(),
      templateQuery,
    ]);

    if (!workspace) {
      return safeJsonResponse({ error: "Workspace nao encontrado." }, 404);
    }

    if (templateError || !template) {
      return safeJsonResponse({ error: "Template de squad nao encontrado." }, 404);
    }

    const resolvedName = (body.name || "").trim() || `${template.name} ${workspace.name}`;
    const resolvedSlug = await resolveSlug(
      supabase,
      body.workspace_id,
      resolvedName,
      body.workspace_squad_id || null,
    );

    const goal = getString(answers, "core_goal");
    const primaryOutcome = getString(answers, "primary_outcome");
    const channel = getString(answers, "primary_channel");
    const cadence = getString(answers, "cadence");
    const approvalMode = getString(answers, "approval_mode");
    const benchmarkUrls = toStringArray(answers.benchmark_urls);

    const payload = {
      workspace_id: body.workspace_id,
      squad_template_id: template.id,
      slug: resolvedSlug,
      name: resolvedName,
      status: body.status || "configured",
      goal,
      primary_outcome: primaryOutcome,
      channel,
      cadence,
      approval_mode: approvalMode,
      benchmark_urls: benchmarkUrls,
      onboarding_answers: answers,
      config,
      is_default: Boolean(body.is_default),
    };

    if (payload.is_default) {
      await supabase
        .from("workspace_squads")
        .update({ is_default: false })
        .eq("workspace_id", body.workspace_id)
        .neq("id", body.workspace_squad_id || "00000000-0000-0000-0000-000000000000");
    }

    const mutation = body.workspace_squad_id
      ? supabase.from("workspace_squads").update(payload).eq("id", body.workspace_squad_id).eq("workspace_id", body.workspace_id)
      : supabase.from("workspace_squads").insert(payload);

    const { data, error } = await mutation.select("*").single();
    if (error || !data) throw error || new Error("Nao foi possivel salvar o squad.");

    return safeJsonResponse({
      squad: data,
      template: {
        id: template.id,
        slug: template.slug,
        name: template.name,
        runtime_status: template.runtime_status,
        module_type: template.module_type,
      },
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
