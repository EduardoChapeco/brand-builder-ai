import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAgentRun } from "../_shared/agent-runtime.ts";
import { corsHeaders, createServiceClient, safeJsonResponse } from "../_shared/postgen.ts";

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as {
      prd_id?: string;
      project_id?: string | null;
      website_id?: string | null;
      build_target?: string | null;
      project_name?: string | null;
    };

    if (!body.prd_id) {
      return safeJsonResponse({ error: "prd_id e obrigatorio." }, 400);
    }

    const supabase = createServiceClient();
    const { data: run, error: runError } = await supabase
      .from("agent_prds")
      .select("id,workspace_id,module_type,status,identification,original_prompt,mode")
      .eq("id", body.prd_id)
      .single();

    if (runError || !run) {
      return safeJsonResponse({ error: "Run nao encontrado." }, 404);
    }

    if (run.module_type !== "website_spec") {
      return safeJsonResponse({ error: "Apenas runs de website_spec podem ser aprovados por esta rota." }, 400);
    }

    if (run.status !== "completed") {
      return safeJsonResponse({ error: "A spec ainda nao terminou; nao e possivel aprovar antes do status completed." }, 400);
    }

    const { data: latestSpecArtifact, error: artifactError } = await supabase
      .from("agent_artifacts")
      .select("id,prd_id,workspace_id,artifact_kind,version_number,status")
      .eq("prd_id", run.id)
      .eq("workspace_id", run.workspace_id)
      .eq("artifact_kind", "spec")
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (artifactError) throw artifactError;
    if (!latestSpecArtifact) {
      return safeJsonResponse({ error: "A run nao possui artefato de spec para aprovar." }, 400);
    }

    const approvedAt = new Date().toISOString();
    const { error: approvalError } = await supabase
      .from("agent_artifacts")
      .update({
        status: "approved",
        approved_at: approvedAt,
      })
      .eq("id", latestSpecArtifact.id);

    if (approvalError) throw approvalError;

    const existingConfig = toRecord(toRecord(run.identification).config);
    const buildRun = await createAgentRun(supabase, {
      workspaceId: run.workspace_id,
      moduleType: "website_build",
      prompt: run.original_prompt,
      mode: run.mode,
      config: {
        ...existingConfig,
        project_id: body.project_id || existingConfig.project_id || null,
        website_id: body.website_id || existingConfig.website_id || null,
        build_target: body.build_target || existingConfig.build_target || "project_vfs",
        project_name: body.project_name || existingConfig.project_name || null,
        source_prd_id: run.id,
      },
      identification: {
        queued_by: "agent-run-approve",
        source_prd_id: run.id,
      },
    });

    return safeJsonResponse({
      approved_spec_artifact_id: latestSpecArtifact.id,
      approved_at: approvedAt,
      build_prd_id: buildRun.id,
      build_status: buildRun.status,
      module_type: buildRun.module_type,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
