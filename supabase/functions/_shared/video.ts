import {
  corsHeaders,
  createServiceClient,
  listWorkspaceKeys,
  safeJsonResponse,
} from "./postgen.ts";

export { corsHeaders, createServiceClient, safeJsonResponse };

export type VideoRuntimeDispatchResult = {
  dispatched: boolean;
  error?: string;
};

export type VideoExportPreset = {
  key: string;
  ratio: string;
  width: number;
  height: number;
  fps: number;
  format: string;
  codec: string;
};

export const VIDEO_EXPORT_PRESETS: Record<string, VideoExportPreset> = {
  reels: { key: "reels", ratio: "9:16", width: 1080, height: 1920, fps: 30, format: "mp4", codec: "h264" },
  tiktok: { key: "tiktok", ratio: "9:16", width: 1080, height: 1920, fps: 30, format: "mp4", codec: "h264" },
  shorts: { key: "shorts", ratio: "9:16", width: 1080, height: 1920, fps: 30, format: "mp4", codec: "h264" },
  youtube: { key: "youtube", ratio: "16:9", width: 1920, height: 1080, fps: 30, format: "mp4", codec: "h264" },
  linkedin: { key: "linkedin", ratio: "16:9", width: 1920, height: 1080, fps: 30, format: "mp4", codec: "h264" },
  x: { key: "x", ratio: "16:9", width: 1280, height: 720, fps: 30, format: "mp4", codec: "h264" },
  gif_preview: { key: "gif_preview", ratio: "1:1", width: 480, height: 480, fps: 15, format: "gif", codec: "gif" },
};

const encoder = new TextEncoder();

export const getVideoExportPreset = (preset: string) =>
  VIDEO_EXPORT_PRESETS[preset] || VIDEO_EXPORT_PRESETS.youtube;

export const buildInitialTimeline = (params: {
  ratio?: string | null;
  fps?: number | null;
  sourceAssetId?: string | null;
}) => ({
  canvas: {
    ratio: params.ratio || "16:9",
    width: params.ratio === "9:16" ? 1080 : 1920,
    height: params.ratio === "9:16" ? 1920 : 1080,
  },
  duration_ms: 0,
  fps: params.fps || 30,
  tracks: [
    {
      id: crypto.randomUUID(),
      kind: "video",
      label: "Primary Video",
      clips: params.sourceAssetId
        ? [{ id: crypto.randomUUID(), asset_id: params.sourceAssetId, start_ms: 0, end_ms: 0, trim_start_ms: 0, trim_end_ms: 0 }]
        : [],
    },
    { id: crypto.randomUUID(), kind: "overlay", label: "B-Roll / Overlay", clips: [] },
    { id: crypto.randomUUID(), kind: "audio", label: "Audio / Music", clips: [] },
    { id: crypto.randomUUID(), kind: "subtitle", label: "Subtitles", clips: [] },
  ],
  markers: [],
  silence_cuts: [],
  viral_heatmap: [],
  subtitle_track_id: null,
  selection: null,
  history_meta: {
    source: "video-studio",
    version: 1,
  },
});

const buildSignaturePayload = (timestamp: string, path: string, body: string) =>
  `${timestamp}.${path}.${body}`;

export const signInternalRuntimeBody = async (
  secret: string,
  path: string,
  body: string,
  timestamp: string,
) => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(buildSignaturePayload(timestamp, path, body)),
  );
  return Array.from(new Uint8Array(signature))
    .map((part) => part.toString(16).padStart(2, "0"))
    .join("");
};

export const failVideoJob = async (
  supabase: ReturnType<typeof createServiceClient>,
  jobId: string,
  errorMessage: string,
) => {
  await supabase
    .from("video_jobs")
    .update({
      status: "failed",
      error_message: errorMessage,
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
};

export const dispatchVideoRuntime = async (
  supabase: ReturnType<typeof createServiceClient>,
  jobId: string,
): Promise<VideoRuntimeDispatchResult> => {
  const runtimeUrl = Deno.env.get("VIDEO_RUNTIME_URL");
  const runtimeSecret = Deno.env.get("VIDEO_RUNTIME_SECRET");
  if (!runtimeUrl || !runtimeSecret) {
    const error = "VIDEO_RUNTIME_URL ou VIDEO_RUNTIME_SECRET nao configurados.";
    await failVideoJob(supabase, jobId, error);
    return { dispatched: false, error };
  }

  const path = "/internal/jobs/dispatch";
  const timestamp = new Date().toISOString();
  const body = JSON.stringify({ job_id: jobId });
  const signature = await signInternalRuntimeBody(runtimeSecret, path, body, timestamp);

  try {
    const response = await fetch(`${runtimeUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-video-runtime-ts": timestamp,
        "x-video-runtime-signature": signature,
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      const error = `Falha ao despachar job para o runtime: ${response.status} ${text}`;
      await failVideoJob(supabase, jobId, error);
      return { dispatched: false, error };
    }

    return { dispatched: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await failVideoJob(supabase, jobId, message);
    return { dispatched: false, error: message };
  }
};

export const insertVideoJob = async (
  supabase: ReturnType<typeof createServiceClient>,
  params: {
    workspaceId: string;
    jobType: string;
    requestPayload?: Record<string, unknown>;
    providerCapability?: string | null;
    providerName?: string | null;
    modelName?: string | null;
    priority?: number;
    videoProjectId?: string | null;
    timelineVersionId?: string | null;
    subtitleTrackId?: string | null;
    exportId?: string | null;
    generationId?: string | null;
    layerCompositionId?: string | null;
    scrollSectionId?: string | null;
    remotionCompositionId?: string | null;
  },
) => {
  const { data, error } = await supabase
    .from("video_jobs")
    .insert({
      workspace_id: params.workspaceId,
      video_project_id: params.videoProjectId || null,
      timeline_version_id: params.timelineVersionId || null,
      subtitle_track_id: params.subtitleTrackId || null,
      export_id: params.exportId || null,
      generation_id: params.generationId || null,
      layer_composition_id: params.layerCompositionId || null,
      scroll_section_id: params.scrollSectionId || null,
      remotion_composition_id: params.remotionCompositionId || null,
      job_type: params.jobType,
      provider_capability: params.providerCapability || null,
      provider_name: params.providerName || null,
      model_name: params.modelName || null,
      priority: params.priority || 100,
      request_payload: params.requestPayload || {},
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error || new Error("Nao foi possivel criar video_job.");
  }

  return data;
};

export const pickProviderName = async (
  supabase: ReturnType<typeof createServiceClient>,
  workspaceId: string,
  providersByPriority: string[],
) => {
  const keys = await listWorkspaceKeys(supabase, workspaceId, providersByPriority);
  for (const provider of providersByPriority) {
    const candidate = keys.find((item) => item.provider === provider && (item.calls_today || 0) < (item.daily_limit || 0));
    if (candidate) return candidate.provider;
  }
  return null;
};

export const copyMediaAssetToVideoAsset = async (
  supabase: ReturnType<typeof createServiceClient>,
  params: {
    workspaceId: string;
    videoProjectId?: string | null;
    mediaAssetId: string;
    assetType: "generated_image" | "image" | "video" | "audio";
  },
) => {
  const { data: sourceAsset, error: sourceError } = await supabase
    .from("media_assets")
    .select("*")
    .eq("id", params.mediaAssetId)
    .eq("workspace_id", params.workspaceId)
    .single();

  if (sourceError || !sourceAsset) {
    throw sourceError || new Error("Media asset nao encontrado.");
  }

  const { data: inserted, error: insertError } = await supabase
    .from("video_assets")
    .insert({
      workspace_id: params.workspaceId,
      video_project_id: params.videoProjectId || null,
      asset_type: params.assetType,
      source_asset_id: sourceAsset.id,
      bucket_name: "generated-assets",
      storage_path: sourceAsset.storage_path || `mirrored/${sourceAsset.id}`,
      public_url: sourceAsset.public_url,
      mime_type: typeof sourceAsset.metadata === "object" && sourceAsset.metadata && "content_type" in sourceAsset.metadata
        ? String(sourceAsset.metadata.content_type || "")
        : null,
      file_name: sourceAsset.storage_path ? sourceAsset.storage_path.split("/").pop() || sourceAsset.id : sourceAsset.id,
      status: "uploaded",
      metadata: {
        mirrored_from_media_asset: sourceAsset.id,
        ...(typeof sourceAsset.metadata === "object" && sourceAsset.metadata ? sourceAsset.metadata : {}),
      },
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    throw insertError || new Error("Nao foi possivel espelhar o asset para video_assets.");
  }

  return inserted;
};
