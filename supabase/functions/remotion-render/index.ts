import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createServiceClient,
  queueRemotionRenderJob,
  readJsonBody,
  requireWorkspaceRow,
  respondForQueuedJob,
  safeJsonResponse,
  toOptionalText,
  toRecord,
} from "../_shared/remotion.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await readJsonBody(req);
    const workspaceId = toOptionalText(body.workspace_id);
    const compositionId = toOptionalText(body.composition_id);
    if (!workspaceId || !compositionId) {
      return safeJsonResponse({ error: "workspace_id e composition_id sao obrigatorios." }, 400);
    }

    const supabase = createServiceClient();
    const composition = await requireWorkspaceRow(
      supabase,
      "remotion_compositions",
      workspaceId,
      compositionId,
      "Composicao Remotion",
    );

    const { job, dispatch } = await queueRemotionRenderJob(supabase, {
      workspaceId,
      composition,
      videoProjectId: toOptionalText(body.project_id) || composition.video_project_id || null,
      inputProps: toRecord(body.props || body.inputProps || body.input_props),
      renderOptions: toRecord(body.renderOptions || body.render_options),
    });

    return respondForQueuedJob({
      jobId: String(job.id),
      accepted: dispatch.dispatched,
      dispatchError: dispatch.error || null,
      composition,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
