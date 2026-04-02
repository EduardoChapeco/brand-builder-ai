import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  buildInitialTimeline,
  corsHeaders,
  createServiceClient,
  safeJsonResponse,
} from "../_shared/video.ts";

const sanitizeFileName = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "upload.bin";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();
    const {
      workspace_id,
      project_id,
      project_name,
      ratio = "16:9",
      fps = 30,
      file_name,
      content_type,
      file_size_bytes,
      confirm_upload = false,
      asset_id,
    } = await req.json() as {
      workspace_id?: string;
      project_id?: string | null;
      project_name?: string | null;
      ratio?: string | null;
      fps?: number | null;
      file_name?: string | null;
      content_type?: string | null;
      file_size_bytes?: number | null;
      confirm_upload?: boolean;
      asset_id?: string | null;
    };

    if (!workspace_id) {
      return safeJsonResponse({ error: "workspace_id e obrigatorio." }, 400);
    }

    if (confirm_upload) {
      if (!asset_id) {
        return safeJsonResponse({ error: "asset_id e obrigatorio para confirm_upload." }, 400);
      }

      const { data: asset, error: assetError } = await supabase
        .from("video_assets")
        .update({
          status: "uploaded",
          updated_at: new Date().toISOString(),
        })
        .eq("id", asset_id)
        .eq("workspace_id", workspace_id)
        .select("*")
        .single();

      if (assetError || !asset) {
        return safeJsonResponse({ error: "Nao foi possivel confirmar o upload do asset." }, 400);
      }

      const { data: project } = await supabase
        .from("video_projects")
        .update({
          status: "ready",
          latest_source_asset_id: asset.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", asset.video_project_id)
        .eq("workspace_id", workspace_id)
        .select("*")
        .maybeSingle();

      if (project?.active_timeline_version_id) {
        const { data: timeline } = await supabase
          .from("video_timeline_versions")
          .select("*")
          .eq("id", project.active_timeline_version_id)
          .maybeSingle();

        if (timeline?.timeline_json && typeof timeline.timeline_json === "object") {
          const nextTimeline = structuredClone(timeline.timeline_json as Record<string, unknown>);
          const tracks = Array.isArray(nextTimeline.tracks) ? nextTimeline.tracks as Array<Record<string, unknown>> : [];
          const primaryTrack = tracks.find((track) => track.kind === "video");
          if (primaryTrack && (!Array.isArray(primaryTrack.clips) || primaryTrack.clips.length === 0)) {
            primaryTrack.clips = [{
              id: crypto.randomUUID(),
              asset_id: asset.id,
              start_ms: 0,
              end_ms: 0,
              trim_start_ms: 0,
              trim_end_ms: 0,
            }];

            await supabase
              .from("video_timeline_versions")
              .update({
                timeline_json: nextTimeline,
                updated_at: new Date().toISOString(),
              })
              .eq("id", timeline.id);
          }
        }
      }

      return safeJsonResponse({ project, asset });
    }

    if (!file_name) {
      return safeJsonResponse({ error: "file_name e obrigatorio." }, 400);
    }

    let activeProjectId = project_id || null;
    if (!activeProjectId) {
      const { data: project, error: projectError } = await supabase
        .from("video_projects")
        .insert({
          workspace_id,
          name: project_name?.trim() || "Novo projeto de video",
          ratio,
          fps,
          status: "ingesting",
          settings: {
            subtitle_style: "youtube_subtitle",
            export_quality: "1080p",
          },
        })
        .select("*")
        .single();

      if (projectError || !project) {
        throw projectError || new Error("Nao foi possivel criar video_project.");
      }

      const { data: timelineVersion, error: timelineError } = await supabase
        .from("video_timeline_versions")
        .insert({
          workspace_id,
          video_project_id: project.id,
          version_number: 1,
          is_active: true,
          timeline_json: buildInitialTimeline({ ratio, fps, sourceAssetId: null }),
          command_log: [],
          summary: "Versao inicial do projeto.",
        })
        .select("*")
        .single();

      if (timelineError || !timelineVersion) {
        throw timelineError || new Error("Nao foi possivel criar timeline inicial.");
      }

      await supabase
        .from("video_projects")
        .update({
          active_timeline_version_id: timelineVersion.id,
        })
        .eq("id", project.id);

      activeProjectId = project.id;
    }

    const safeName = sanitizeFileName(file_name);
    const storagePath = `${workspace_id}/${activeProjectId}/${Date.now()}-${safeName}`;

    const { data: signedUpload, error: signedUploadError } = await supabase.storage
      .from("video-assets")
      .createSignedUploadUrl(storagePath);

    if (signedUploadError || !signedUpload) {
      throw signedUploadError || new Error("Nao foi possivel gerar URL assinada para upload.");
    }

    const { data: publicAssetUrl } = supabase.storage
      .from("video-assets")
      .getPublicUrl(storagePath);

    const { data: asset, error: assetError } = await supabase
      .from("video_assets")
      .insert({
        workspace_id,
        video_project_id: activeProjectId,
        asset_type: content_type?.startsWith("audio/") ? "audio" : content_type?.startsWith("image/") ? "image" : "video",
        bucket_name: "video-assets",
        storage_path: storagePath,
        public_url: publicAssetUrl.publicUrl || null,
        mime_type: content_type || null,
        file_name: safeName,
        file_size_bytes: file_size_bytes || null,
        status: "pending_upload",
      })
      .select("*")
      .single();

    if (assetError || !asset) {
      throw assetError || new Error("Nao foi possivel criar video_asset.");
    }

    const { data: project } = await supabase
      .from("video_projects")
      .select("*")
      .eq("id", activeProjectId)
      .single();

    return safeJsonResponse({
      project,
      asset,
      upload: {
        bucket: "video-assets",
        path: signedUpload.path,
        token: signedUpload.token,
      },
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
