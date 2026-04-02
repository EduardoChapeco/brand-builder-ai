/**
 * video-studio/api.ts — Chamadas de API do Video Studio
 *
 * Todas as funções que fazem chamadas de rede (Supabase Storage + Edge Functions).
 * Depende de mappers para normalizar os responses.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  toArray,
  toGeneratedVideo,
  toRecord,
  toScrollSection,
  toString,
  toVideoAsset,
  toVideoExport,
  toVideoJob,
  toVideoProject,
  toVideoSubtitleTrack,
} from "./mappers";
import type { VideoJobStatus, VideoJobStatusPayload } from "./types";

// ─── Upload ───────────────────────────────────────────────────────────────────

export const createVideoUploadSession = async (payload: {
  workspace_id: string;
  project_id?: string | null;
  project_name?: string | null;
  ratio?: string;
  fps?: number;
  file_name: string;
  content_type?: string | null;
  file_size_bytes?: number | null;
}) => {
  const { data, error } = await supabase.functions.invoke("video-upload-handler", {
    body: payload,
  });
  if (error) throw error;
  return {
    project: toVideoProject(data?.project),
    asset: toVideoAsset(data?.asset),
    upload: {
      bucket: toString(data?.upload?.bucket),
      path: toString(data?.upload?.path),
      token: toString(data?.upload?.token),
    },
  };
};

export const confirmVideoUpload = async (payload: {
  workspace_id: string;
  asset_id: string;
}) => {
  const { data, error } = await supabase.functions.invoke("video-upload-handler", {
    body: { ...payload, confirm_upload: true },
  });
  if (error) throw error;
  return {
    project: data?.project ? toVideoProject(data.project) : null,
    asset: data?.asset ? toVideoAsset(data.asset) : null,
  };
};

export const uploadVideoAssetFile = async (params: {
  bucket: string;
  path: string;
  token: string;
  file: File;
}) => {
  const { error } = await supabase.storage
    .from(params.bucket)
    .uploadToSignedUrl(params.path, params.token, params.file);
  if (error) throw error;
};

// ─── Processamento de Vídeo ────────────────────────────────────────────────────

export const requestVideoSubtitles = async (payload: {
  workspace_id: string;
  project_id: string;
  asset_id: string;
  language_code?: string;
  style_preset?: string;
}) => {
  const { data, error } = await supabase.functions.invoke("generate-subtitles", { body: payload });
  if (error) throw error;
  return data as { subtitle_track_id: string; job_id: string; status: VideoJobStatus; dispatch_error?: string | null };
};

export const requestSilenceDetection = async (payload: {
  workspace_id: string;
  project_id: string;
  timeline_version_id?: string | null;
  threshold_seconds?: number;
  padding_ms?: number;
  keep_breaths?: boolean;
}) => {
  const { data, error } = await supabase.functions.invoke("video-silence-detector", { body: payload });
  if (error) throw error;
  return data as { job_id: string; status: VideoJobStatus; dispatch_error?: string | null };
};

export const requestViralityAnalysis = async (payload: {
  workspace_id: string;
  project_id: string;
  timeline_version_id?: string | null;
}) => {
  const { data, error } = await supabase.functions.invoke("virality-analyzer", { body: payload });
  if (error) throw error;
  return data as { job_id: string; status: VideoJobStatus; dispatch_error?: string | null };
};

export const requestVideoExport = async (payload: {
  workspace_id: string;
  project_id: string;
  export_preset: string;
  timeline_version_id?: string | null;
}) => {
  const { data, error } = await supabase.functions.invoke("video-export-processor", { body: payload });
  if (error) throw error;
  return data as { export_id: string; job_id: string; status: VideoJobStatus; dispatch_error?: string | null };
};

export const requestVideoEnhancement = async (payload: {
  workspace_id: string;
  project_id?: string | null;
  asset_id: string;
  operations: string[];
}) => {
  const { data, error } = await supabase.functions.invoke("video-quality-enhancer", { body: payload });
  if (error) throw error;
  return data as { job_id: string; status: VideoJobStatus; dispatch_error?: string | null };
};

// ─── IA Generativa ────────────────────────────────────────────────────────────

export const composeVideoPrompt = async (payload: {
  workspace_id: string;
  project_id?: string | null;
  prompt_original: string;
  scene_context?: string | null;
  template_id?: string | null;
  style_template?: string | null;
  camera_movement?: string | null;
  lighting_preset?: string | null;
  duration_seconds?: number | null;
}) => {
  const { data, error } = await supabase.functions.invoke("video-prompt-composer", {
    body: { action: "compose", ...payload },
  });
  if (error) throw error;
  return {
    generation_id: toString(data?.generation_id),
    generation: toGeneratedVideo(data?.generation),
    prompt_composed: toRecord(data?.prompt_composed),
  };
};

export const attachVideoKeyframe = async (payload: {
  workspace_id: string;
  generation_id: string;
  source_media_asset_id: string;
}) => {
  const { data, error } = await supabase.functions.invoke("video-prompt-composer", {
    body: { action: "attach_keyframe", ...payload },
  });
  if (error) throw error;
  return {
    generation: toGeneratedVideo(data?.generation),
    keyframe_asset: toVideoAsset(data?.keyframe_asset),
  };
};

export const requestGeneratedVideoRender = async (payload: {
  workspace_id: string;
  generation_id: string;
}) => {
  const { data, error } = await supabase.functions.invoke("video-prompt-composer", {
    body: { action: "request_render", ...payload },
  });
  if (error) throw error;
  return data as { generation_id: string; job_id: string; status: VideoJobStatus; dispatch_error?: string | null };
};

// ─── Compositor & Remotion ────────────────────────────────────────────────────

export const createLayerComposition = async (payload: {
  workspace_id: string;
  project_id?: string | null;
  prompt_original: string;
  layers: unknown[];
  canvas_width?: number;
  canvas_height?: number;
  run_now?: boolean;
}) => {
  const { data, error } = await supabase.functions.invoke("layer-compositor", { body: payload });
  if (error) throw error;
  return data as { composition_id: string; job_id?: string; status?: VideoJobStatus };
};

export const requestRemotionRender = async (payload: {
  workspace_id: string;
  project_id?: string | null;
  composition_id: string;
  props?: Record<string, unknown>;
}) => {
  const { data, error } = await supabase.functions.invoke("remotion-render", { body: payload });
  if (error) throw error;
  return data as { job_id: string; status: VideoJobStatus; dispatch_error?: string | null };
};

// ─── ScrollSection ─────────────────────────────────────────────────────────────

export const createScrollSection = async (payload: {
  workspace_id: string;
  site_id?: string | null;
  website_page_id?: string | null;
  objective: string;
  section_name?: string | null;
  scroll_effect_type: string;
  supporting_text?: string | null;
  cta_label?: string | null;
  background_video_asset_id?: string | null;
  background_image_asset_id?: string | null;
  attach_to_page?: boolean;
}) => {
  const { data, error } = await supabase.functions.invoke("scroll-section-generator", { body: payload });
  if (error) throw error;
  return {
    section_id: toString(data?.section_id),
    attached: data?.attached === true,
    section: toScrollSection(data?.section),
  };
};

// ─── Job Status ───────────────────────────────────────────────────────────────

export const getVideoJobStatus = async (payload: { job_id?: string; job_ids?: string[] }): Promise<VideoJobStatusPayload> => {
  const { data, error } = await supabase.functions.invoke("video-job-status", { body: payload });
  if (error) throw error;

  const jobs = toArray(data?.jobs).map((entry) => {
    const record = toRecord(entry);
    return {
      job: toVideoJob(record.job),
      export: record.export ? toVideoExport(record.export) : null,
      subtitle_track: record.subtitle_track ? toVideoSubtitleTrack(record.subtitle_track) : null,
      generation: record.generation ? toGeneratedVideo(record.generation) : null,
      scroll_section: record.scroll_section ? toScrollSection(record.scroll_section) : null,
    };
  });

  return {
    jobs,
    job: jobs[0] || null,
  };
};
