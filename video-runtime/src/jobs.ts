import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildViralHeatmap } from "./analysis.js";
import { uploadFileAndPersistVideoAsset } from "./assets.js";
import { runFfmpeg, parseSilenceLog } from "./ffmpeg.js";
import { getProviderKey } from "./provider-router.js";
import { createSignedAssetUrl, supabase } from "./supabase.js";
import { renderRemotionJob } from "./remotion/adapter.js";

type VideoJobRow = {
  id: string;
  workspace_id: string;
  video_project_id: string | null;
  timeline_version_id: string | null;
  subtitle_track_id: string | null;
  export_id: string | null;
  generation_id: string | null;
  layer_composition_id: string | null;
  scroll_section_id: string | null;
  remotion_composition_id: string | null;
  output_asset_id: string | null;
  job_type: string;
  provider_capability: string | null;
  provider_name: string | null;
  model_name: string | null;
  status: string;
  priority: number;
  request_payload: Record<string, unknown>;
  result_payload: Record<string, unknown>;
  error_message: string | null;
};

const toRecord = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

const getSourceAssetForProject = async (projectId: string) => {
  const { data: project } = await supabase
    .from("video_projects")
    .select("latest_source_asset_id")
    .eq("id", projectId)
    .single();

  if (!project?.latest_source_asset_id) throw new Error("Project does not have a source asset.");

  const { data: asset, error } = await supabase
    .from("video_assets")
    .select("*")
    .eq("id", project.latest_source_asset_id)
    .single();
  if (error || !asset) throw error || new Error("Source asset not found.");
  return asset;
};

const resolveAssetUrl = async (asset: { public_url: string | null; bucket_name: string; storage_path: string }) => {
  if (asset.public_url) return asset.public_url;
  return createSignedAssetUrl(asset.bucket_name, asset.storage_path);
};

const updateJob = async (jobId: string, patch: Record<string, unknown>) => {
  await supabase.from("video_jobs").update(patch).eq("id", jobId);
};

const addStep = async (jobId: string, stepKey: string, patch: Record<string, unknown>) => {
  const { data: existing } = await supabase
    .from("video_job_steps")
    .select("id")
    .eq("video_job_id", jobId)
    .eq("step_key", stepKey)
    .maybeSingle();

  if (existing?.id) {
    await supabase.from("video_job_steps").update(patch).eq("id", existing.id);
    return existing.id;
  }

  const { data } = await supabase
    .from("video_job_steps")
    .insert({
      video_job_id: jobId,
      step_key: stepKey,
      ...patch,
    })
    .select("id")
    .single();
  return data?.id || null;
};

const markCompleted = async (jobId: string, resultPayload: Record<string, unknown>, patch: Record<string, unknown> = {}) => {
  await updateJob(jobId, {
    status: "completed",
    result_payload: resultPayload,
    finished_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...patch,
  });
};

const markFailed = async (jobId: string, errorMessage: string, resultPayload: Record<string, unknown> = {}) => {
  await updateJob(jobId, {
    status: "failed",
    error_message: errorMessage,
    result_payload: {
      ...resultPayload,
      error_message: errorMessage,
    },
    finished_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
};

const handleGenerateSubtitles = async (job: VideoJobRow) => {
  if (!job.subtitle_track_id) throw new Error("Subtitle track is required.");

  const { data: track, error: trackError } = await supabase
    .from("video_subtitle_tracks")
    .select("*")
    .eq("id", job.subtitle_track_id)
    .single();
  if (trackError || !track) throw trackError || new Error("Subtitle track not found.");

  const { data: asset, error: assetError } = await supabase
    .from("video_assets")
    .select("*")
    .eq("id", track.source_asset_id)
    .single();
  if (assetError || !asset) throw assetError || new Error("Source asset not found for subtitles.");

  const providerKey = await getProviderKey(job.workspace_id, "speech_to_text", job.provider_name);
  if (!providerKey) throw new Error("No active ElevenLabs key found.");

  const sourceUrl = await resolveAssetUrl(asset);
  const form = new FormData();
  form.set("model_id", "scribe_v2");
  form.set("source_url", sourceUrl);
  form.set("timestamps_granularity", "word");
  form.set("language_code", String(track.language_code || "pt-BR"));

  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: {
      "xi-api-key": String(providerKey.key_value),
    },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs speech-to-text failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  const words = Array.isArray(payload.words) ? payload.words : [];
  const transcriptText = typeof payload.text === "string" ? payload.text : "";

  await supabase
    .from("video_subtitle_tracks")
    .update({
      transcript_text: transcriptText,
      words_json: words,
      updated_at: new Date().toISOString(),
    })
    .eq("id", track.id);

  if (job.video_project_id) {
    const { data: project } = await supabase
      .from("video_projects")
      .select("active_timeline_version_id")
      .eq("id", job.video_project_id)
      .single();

    if (project?.active_timeline_version_id) {
      const { data: timeline } = await supabase
        .from("video_timeline_versions")
        .select("*")
        .eq("id", project.active_timeline_version_id)
        .single();

      const timelineJson = toRecord(timeline?.timeline_json);
      timelineJson.subtitle_track_id = track.id;
      await supabase
        .from("video_timeline_versions")
        .update({ timeline_json: timelineJson })
        .eq("id", project.active_timeline_version_id);
    }

    await supabase
      .from("video_projects")
      .update({ latest_subtitle_track_id: track.id, status: "ready" })
      .eq("id", job.video_project_id);
  }

  await markCompleted(job.id, {
    subtitle_track_id: track.id,
    transcript_text: transcriptText,
    words_count: words.length,
  });
};

const handleDetectSilence = async (job: VideoJobRow) => {
  if (!job.video_project_id) throw new Error("video_project_id is required.");
  const asset = await getSourceAssetForProject(job.video_project_id);
  const sourceUrl = await resolveAssetUrl(asset);
  const thresholdSeconds = Number(job.request_payload.threshold_seconds || 0.8);
  const paddingMs = Number(job.request_payload.padding_ms || 120);

  const { stderr } = await runFfmpeg([
    "-hide_banner",
    "-i",
    sourceUrl,
    "-af",
    `silencedetect=n=-35dB:d=${thresholdSeconds}`,
    "-f",
    "null",
    "-",
  ]);

  const cuts = parseSilenceLog(stderr, paddingMs);
  if (!job.timeline_version_id) throw new Error("timeline_version_id is required.");

  const { data: timeline, error } = await supabase
    .from("video_timeline_versions")
    .select("*")
    .eq("id", job.timeline_version_id)
    .single();
  if (error || !timeline) throw error || new Error("Timeline not found.");

  const nextTimeline = toRecord(timeline.timeline_json);
  nextTimeline.silence_cuts = cuts;

  await supabase
    .from("video_timeline_versions")
    .update({ timeline_json: nextTimeline })
    .eq("id", timeline.id);

  await supabase
    .from("video_projects")
    .update({ status: "ready" })
    .eq("id", job.video_project_id);

  await markCompleted(job.id, {
    silence_cuts: cuts,
    count: cuts.length,
  });
};

const handleAnalyzeViral = async (job: VideoJobRow) => {
  if (!job.timeline_version_id) throw new Error("timeline_version_id is required.");
  if (!job.video_project_id) throw new Error("video_project_id is required.");

  const { data: project } = await supabase
    .from("video_projects")
    .select("latest_subtitle_track_id")
    .eq("id", job.video_project_id)
    .single();

  if (!project?.latest_subtitle_track_id) {
    throw new Error("Project does not have a subtitle track for virality analysis.");
  }

  const { data: subtitleTrack, error: subtitleError } = await supabase
    .from("video_subtitle_tracks")
    .select("*")
    .eq("id", project.latest_subtitle_track_id)
    .single();
  if (subtitleError || !subtitleTrack) throw subtitleError || new Error("Subtitle track not found.");

  const heatmap = buildViralHeatmap(Array.isArray(subtitleTrack.words_json) ? subtitleTrack.words_json as Array<Record<string, unknown>> : []);
  const recommendedSegments = heatmap
    .filter((item) => item.score >= 0.7)
    .slice(0, 3)
    .map((item) => ({
      start_second: item.second,
      end_second: item.second + 3,
      reason: item.recommendation,
    }));

  const { data: timeline, error } = await supabase
    .from("video_timeline_versions")
    .select("*")
    .eq("id", job.timeline_version_id)
    .single();
  if (error || !timeline) throw error || new Error("Timeline not found.");

  const nextTimeline = toRecord(timeline.timeline_json);
  nextTimeline.viral_heatmap = heatmap;
  nextTimeline.markers = recommendedSegments.map((segment) => ({
    id: randomUUID(),
    type: "viral_candidate",
    ...segment,
  }));

  await supabase
    .from("video_timeline_versions")
    .update({ timeline_json: nextTimeline })
    .eq("id", timeline.id);

  await supabase
    .from("video_projects")
    .update({ status: "ready" })
    .eq("id", job.video_project_id);

  await markCompleted(job.id, {
    heatmap,
    recommended_segments: recommendedSegments,
  });
};

const uploadRuntimeAsset = async (params: {
  workspaceId: string;
  projectId: string | null;
  filePath: string;
  fileName: string;
  mimeType: string;
  assetType: "generated_video" | "video";
}) => {
  const storagePath = `${params.workspaceId}/${params.projectId || "orphan"}/exports/${Date.now()}-${params.fileName}`;
  return uploadFileAndPersistVideoAsset({
    workspaceId: params.workspaceId,
    projectId: params.projectId,
    assetType: params.assetType,
    bucketName: "video-assets",
    storagePath,
    filePath: params.filePath,
    fileName: params.fileName,
    mimeType: params.mimeType,
    status: "uploaded",
  });
};

const handleExportVideo = async (job: VideoJobRow) => {
  if (!job.video_project_id) throw new Error("video_project_id is required.");
  if (!job.export_id) throw new Error("export_id is required.");
  const asset = await getSourceAssetForProject(job.video_project_id);
  const sourceUrl = await resolveAssetUrl(asset);
  const exportConfig = toRecord(job.request_payload.export_config);
  const width = Number(exportConfig.width || 1920);
  const height = Number(exportConfig.height || 1080);
  const fps = Number(exportConfig.fps || 30);
  const format = String(exportConfig.format || "mp4");
  const tempFile = path.join(os.tmpdir(), `${job.id}.${format}`);

  await runFfmpeg([
    "-y",
    "-i",
    sourceUrl,
    "-vf",
    `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
    "-r",
    String(fps),
    "-c:v",
    format === "gif" ? "gif" : "libx264",
    tempFile,
  ]);

  const outputAsset = await uploadRuntimeAsset({
    workspaceId: job.workspace_id,
    projectId: job.video_project_id,
    filePath: tempFile,
    fileName: `${job.id}.${format}`,
    mimeType: format === "gif" ? "image/gif" : "video/mp4",
    assetType: "generated_video",
  });

  await fs.rm(tempFile, { force: true });

  await supabase
    .from("video_exports")
    .update({
      output_asset_id: outputAsset.id,
      status: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.export_id);

  await supabase
    .from("video_projects")
    .update({
      latest_export_id: job.export_id,
      status: "ready",
    })
    .eq("id", job.video_project_id);

  await markCompleted(job.id, {
    export_id: job.export_id,
    output_asset_id: outputAsset.id,
  });
};

const failUnsupported = async (job: VideoJobRow, label: string) => {
  throw new Error(`${label} ainda nao possui adapter de producao configurado no video-runtime.`);
};

export const executeJob = async (jobId: string) => {
  const { data: job, error } = await supabase
    .from("video_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error || !job) throw error || new Error("Job not found.");

  await updateJob(job.id, {
    status: "running",
    started_at: new Date().toISOString(),
    locked_at: new Date().toISOString(),
    locked_by: "video-runtime",
    last_heartbeat_at: new Date().toISOString(),
  });
  await addStep(job.id, "dispatch", {
    status: "completed",
    finished_at: new Date().toISOString(),
  });

  try {
    switch (job.job_type) {
      case "generate_subtitles":
        await addStep(job.id, "speech_to_text", { status: "running", started_at: new Date().toISOString() });
        await handleGenerateSubtitles(job as VideoJobRow);
        await addStep(job.id, "speech_to_text", { status: "completed", finished_at: new Date().toISOString() });
        break;
      case "detect_silence":
        await addStep(job.id, "silence_detect", { status: "running", started_at: new Date().toISOString() });
        await handleDetectSilence(job as VideoJobRow);
        await addStep(job.id, "silence_detect", { status: "completed", finished_at: new Date().toISOString() });
        break;
      case "analyze_viral":
        await addStep(job.id, "viral_analysis", { status: "running", started_at: new Date().toISOString() });
        await handleAnalyzeViral(job as VideoJobRow);
        await addStep(job.id, "viral_analysis", { status: "completed", finished_at: new Date().toISOString() });
        break;
      case "export_video":
        await addStep(job.id, "video_export", { status: "running", started_at: new Date().toISOString() });
        await handleExportVideo(job as VideoJobRow);
        await addStep(job.id, "video_export", { status: "completed", finished_at: new Date().toISOString() });
        break;
      case "render_generated_video":
        await failUnsupported(job as VideoJobRow, "render_generated_video");
        break;
      case "render_layer_composition":
        await addStep(job.id, "remotion_render", { status: "running", started_at: new Date().toISOString() });
        await renderRemotionJob(job as VideoJobRow);
        await addStep(job.id, "remotion_render", { status: "completed", finished_at: new Date().toISOString() });
        break;
      case "remotion_render":
        await addStep(job.id, "remotion_render", { status: "running", started_at: new Date().toISOString() });
        await renderRemotionJob(job as VideoJobRow);
        await addStep(job.id, "remotion_render", { status: "completed", finished_at: new Date().toISOString() });
        break;
      case "enhance_video":
        await failUnsupported(job as VideoJobRow, "enhance_video");
        break;
      default:
        throw new Error(`Unsupported job_type: ${job.job_type}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if ((job as VideoJobRow).remotion_composition_id) {
      await supabase
        .from("remotion_compositions")
        .update({
          status: "error",
          updated_at: new Date().toISOString(),
        })
        .eq("id", (job as VideoJobRow).remotion_composition_id);
    }
    await markFailed(job.id, message, {
      job_type: job.job_type,
      provider_name: job.provider_name,
      provider_capability: job.provider_capability,
    });
    await addStep(job.id, "failure", {
      status: "failed",
      error_message: message,
      finished_at: new Date().toISOString(),
    });
    throw error;
  }
};
