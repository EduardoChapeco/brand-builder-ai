import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createRemotionComposition,
  createServiceClient,
  logRemotionGeneration,
  queueRemotionRenderJob,
  readJsonBody,
  requireWorkspaceRow,
  resolveTemplateByHint,
  resolveWorkspaceBrandBindings,
  respondForQueuedJob,
  safeJsonResponse,
  toBoolean,
  toOptionalText,
} from "../_shared/remotion.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await readJsonBody(req);
    const workspaceId = toOptionalText(body.workspace_id);
    const projectId = toOptionalText(body.project_id);
    const title = toOptionalText(body.title) || "Data Video";
    const dataPoints = Array.isArray(body.dataPoints)
      ? body.dataPoints
      : Array.isArray(body.data)
        ? body.data
        : [];

    if (!workspaceId) {
      return safeJsonResponse({ error: "workspace_id e obrigatorio." }, 400);
    }

    if (dataPoints.length === 0) {
      return safeJsonResponse({ error: "dataPoints e obrigatorio." }, 400);
    }

    const supabase = createServiceClient();
    if (projectId) {
      await requireWorkspaceRow(supabase, "video_projects", workspaceId, projectId, "Projeto de video");
    }

    const template = await resolveTemplateByHint(supabase, workspaceId, {
      ...body,
      category: "data_video",
      template_key: toOptionalText(body.template_key) || "data_summary",
    });
    const brand = await resolveWorkspaceBrandBindings(supabase, workspaceId);

    const composition = await createRemotionComposition(supabase, {
      workspaceId,
      videoProjectId: projectId,
      name: title,
      category: "data_video",
      template,
      inputProps: {
        templateKey: template.template_key,
        title,
        subtitle: toOptionalText(body.subtitle),
        dataPoints,
        dimensions: { width: 1920, height: 1080 },
        durationInFrames: 180,
        fps: 30,
        brand,
      },
      brandBindings: brand,
      metadata: {
        source_module: toOptionalText(body.source_module) || "simlab_or_report",
        narrative: body.narrative || null,
      },
      generatedByAi: true,
      aiPrompt: title,
    });

    await logRemotionGeneration(supabase, {
      workspaceId,
      compositionId: composition.id,
      templateId: template.id,
      promptOriginal: title,
      promptEnriched: JSON.stringify(composition.input_props),
      providerName: "cerebro",
      modelName: "template-guardrails",
      requestPayload: body,
      resultPayload: { data_points_count: dataPoints.length },
    });

    if (toBoolean(body.run_now, false)) {
      const { job, dispatch } = await queueRemotionRenderJob(supabase, {
        workspaceId,
        composition,
        videoProjectId: projectId,
      });

      return respondForQueuedJob({
        jobId: String(job.id),
        accepted: dispatch.dispatched,
        dispatchError: dispatch.error || null,
        composition,
      });
    }

    return safeJsonResponse({
      composition_id: composition.id,
      composition,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
