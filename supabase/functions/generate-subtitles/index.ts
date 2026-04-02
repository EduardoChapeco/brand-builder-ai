import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createServiceClient,
  dispatchVideoRuntime,
  insertVideoJob,
  pickProviderName,
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
      asset_id,
      language_code = "pt-BR",
      style_preset = "youtube_subtitle",
    } = await req.json() as {
      workspace_id?: string;
      project_id?: string;
      asset_id?: string;
      language_code?: string;
      style_preset?: string;
    };

    if (!workspace_id || !project_id || !asset_id) {
      return safeJsonResponse({ error: "workspace_id, project_id e asset_id sao obrigatorios." }, 400);
    }

    const providerName = await pickProviderName(supabase, workspace_id, ["elevenlabs"]);
    if (!providerName) {
      return safeJsonResponse({ error: "Nenhuma chave ativa de ElevenLabs encontrada." }, 400);
    }

    const { data: subtitleTrack, error: subtitleError } = await supabase
      .from("video_subtitle_tracks")
      .insert({
        workspace_id,
        video_project_id: project_id,
        source_asset_id: asset_id,
        language_code,
        provider_name: providerName,
        style_preset,
        style_overrides: {},
      })
      .select("*")
      .single();

    if (subtitleError || !subtitleTrack) {
      throw subtitleError || new Error("Nao foi possivel criar subtitle_track.");
    }

    const job = await insertVideoJob(supabase, {
      workspaceId: workspace_id,
      videoProjectId: project_id,
      subtitleTrackId: subtitleTrack.id,
      jobType: "generate_subtitles",
      providerCapability: "speech_to_text",
      providerName,
      requestPayload: {
        project_id,
        asset_id,
        language_code,
        style_preset,
      },
      priority: 40,
    });

    await supabase
      .from("video_subtitle_tracks")
      .update({ latest_job_id: job.id })
      .eq("id", subtitleTrack.id);

    await supabase
      .from("video_projects")
      .update({ latest_subtitle_track_id: subtitleTrack.id, status: "processing" })
      .eq("id", project_id);

    const dispatch = await dispatchVideoRuntime(supabase, job.id);

    return safeJsonResponse({
      subtitle_track_id: subtitleTrack.id,
      job_id: job.id,
      status: dispatch.dispatched ? "queued" : "failed",
      dispatch_error: dispatch.error || null,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
