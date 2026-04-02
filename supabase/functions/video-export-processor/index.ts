import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createServiceClient,
  dispatchVideoRuntime,
  getVideoExportPreset,
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
      export_preset = "youtube",
      timeline_version_id,
    } = await req.json() as {
      workspace_id?: string;
      project_id?: string;
      export_preset?: string;
      timeline_version_id?: string | null;
    };

    if (!workspace_id || !project_id) {
      return safeJsonResponse({ error: "workspace_id e project_id sao obrigatorios." }, 400);
    }

    const preset = getVideoExportPreset(export_preset);
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

    const { data: exportRow, error: exportError } = await supabase
      .from("video_exports")
      .insert({
        workspace_id,
        video_project_id: project_id,
        export_preset: preset.key,
        ratio: preset.ratio,
        width: preset.width,
        height: preset.height,
        fps: preset.fps,
        format: preset.format,
        codec: preset.codec,
        status: "queued",
      })
      .select("*")
      .single();

    if (exportError || !exportRow) {
      throw exportError || new Error("Nao foi possivel criar video_export.");
    }

    const job = await insertVideoJob(supabase, {
      workspaceId: workspace_id,
      videoProjectId: project_id,
      timelineVersionId: activeTimelineId,
      exportId: exportRow.id,
      jobType: "export_video",
      requestPayload: {
        project_id,
        timeline_version_id: activeTimelineId,
        export_preset: preset.key,
        export_config: preset,
      },
      priority: 70,
    });

    await supabase
      .from("video_exports")
      .update({ latest_job_id: job.id, status: "rendering" })
      .eq("id", exportRow.id);

    await supabase
      .from("video_projects")
      .update({ latest_export_id: exportRow.id, status: "processing" })
      .eq("id", project_id);

    const dispatch = await dispatchVideoRuntime(supabase, job.id);

    return safeJsonResponse({
      export_id: exportRow.id,
      job_id: job.id,
      status: dispatch.dispatched ? "queued" : "failed",
      dispatch_error: dispatch.error || null,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
