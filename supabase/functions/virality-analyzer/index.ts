import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createServiceClient,
  dispatchVideoRuntime,
  insertVideoJob,
  safeJsonResponse,
} from "../_shared/video.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();
    const {
      workspace_id,
      project_id,
      timeline_version_id,
    } = await req.json() as {
      workspace_id?: string;
      project_id?: string;
      timeline_version_id?: string | null;
    };

    if (!workspace_id || !project_id) {
      return safeJsonResponse({ error: "workspace_id e project_id sao obrigatorios." }, 400);
    }

    let activeTimelineId = timeline_version_id || null;
    if (!activeTimelineId) {
      const { data: project } = await supabase
        .from("video_projects")
        .select("active_timeline_version_id")
        .eq("id", project_id)
        .eq("workspace_id", workspace_id)
        .single();
      activeTimelineId = project?.active_timeline_version_id || null;
    }

    if (!activeTimelineId) {
      return safeJsonResponse({ error: "Nenhuma timeline ativa encontrada para o projeto." }, 400);
    }

    const job = await insertVideoJob(supabase, {
      workspaceId: workspace_id,
      videoProjectId: project_id,
      timelineVersionId: activeTimelineId,
      jobType: "analyze_viral",
      requestPayload: {
        project_id,
        timeline_version_id: activeTimelineId,
      },
      priority: 55,
    });

    await supabase
      .from("video_projects")
      .update({ latest_analysis_job_id: job.id, status: "processing" })
      .eq("id", project_id);

    const dispatch = await dispatchVideoRuntime(supabase, job.id);

    return safeJsonResponse({
      job_id: job.id,
      status: dispatch.dispatched ? "queued" : "failed",
      dispatch_error: dispatch.error || null,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
