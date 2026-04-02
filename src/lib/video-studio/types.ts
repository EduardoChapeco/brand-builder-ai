/**
 * video-studio/types.ts — Tipos canônicos do Video Studio
 *
 * Contém apenas definições de tipo TypeScript.
 * Nenhuma lógica de runtime — seguro para importar em contextos SSR e edge.
 */

// ─── Job ────────────────────────────────────────────────────────────────────────

export type VideoJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

// ─── Entidades Core ─────────────────────────────────────────────────────────────

export interface VideoProject {
  id: string;
  workspace_id: string;
  name: string;
  description?: string | null;
  ratio: string;
  fps: number;
  status: string;
  active_timeline_version_id?: string | null;
  latest_export_id?: string | null;
  latest_subtitle_track_id?: string | null;
  latest_source_asset_id?: string | null;
  settings: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface VideoAsset {
  id: string;
  workspace_id: string;
  video_project_id?: string | null;
  asset_type: string;
  bucket_name: string;
  storage_path: string;
  public_url?: string | null;
  mime_type?: string | null;
  file_name?: string | null;
  file_size_bytes?: number | null;
  duration_ms?: number | null;
  width?: number | null;
  height?: number | null;
  status: string;
  waveform_json: unknown[];
  metadata: Record<string, unknown>;
}

export interface VideoTimelineVersion {
  id: string;
  workspace_id: string;
  video_project_id: string;
  version_number: number;
  is_active: boolean;
  timeline_json: Record<string, unknown>;
  command_log: unknown[];
  summary?: string | null;
}

export interface VideoJob {
  id: string;
  workspace_id: string;
  job_type: string;
  status: VideoJobStatus;
  error_message?: string | null;
  provider_name?: string | null;
  model_name?: string | null;
  request_payload: Record<string, unknown>;
  result_payload: Record<string, unknown>;
  video_project_id?: string | null;
  export_id?: string | null;
  subtitle_track_id?: string | null;
  generation_id?: string | null;
  scroll_section_id?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface VideoSubtitleTrack {
  id: string;
  video_project_id: string;
  source_asset_id?: string | null;
  language_code: string;
  provider_name?: string | null;
  transcript_text?: string | null;
  words_json: unknown[];
  style_preset: string;
  style_overrides: Record<string, unknown>;
}

export interface VideoExport {
  id: string;
  video_project_id: string;
  export_preset: string;
  ratio: string;
  width: number;
  height: number;
  fps: number;
  format: string;
  codec: string;
  status: string;
  output_asset_id?: string | null;
}

export interface AIGeneratedVideo {
  id: string;
  workspace_id: string;
  video_project_id?: string | null;
  title?: string | null;
  prompt_original: string;
  prompt_composed: Record<string, unknown>;
  style_template?: string | null;
  camera_movement?: string | null;
  lighting_preset?: string | null;
  negative_prompt?: string | null;
  duration_seconds: number;
  status: string;
  keyframe_asset_id?: string | null;
  video_asset_id?: string | null;
  latest_job_id?: string | null;
  provider_name?: string | null;
}

export interface VideoTemplate {
  id: string;
  name: string;
  description?: string | null;
  template_kind: string;
  thumbnail_url?: string | null;
  preview_json: Record<string, unknown>;
  style_module: Record<string, unknown>;
  camera_module: Record<string, unknown>;
  lighting_module: Record<string, unknown>;
  quality_module: Record<string, unknown>;
  negative_prompt?: string | null;
}

export interface LayerComposition {
  id: string;
  workspace_id: string;
  video_project_id?: string | null;
  prompt_original: string;
  layers: unknown[];
  canvas_width: number;
  canvas_height: number;
  status: string;
  latest_job_id?: string | null;
}

// ─── ScrollSection & Motion ──────────────────────────────────────────────────────

export interface ScrollSection {
  id: string;
  workspace_id: string;
  site_id?: string | null;
  website_page_id?: string | null;
  name: string;
  scroll_effect_type: string;
  status: string;
  content: Record<string, unknown>;
  renderer_config: Record<string, unknown>;
  preview_data: Record<string, unknown>;
  background_video_asset_id?: string | null;
  background_image_asset_id?: string | null;
}

export type ScrollSectionBackgroundKind = "video" | "image" | "gradient";
export type ScrollSectionMediaMode = "background" | "timeline";

export interface ScrollSectionMotionTheme {
  primary: string;
  secondary: string;
  accent: string;
  headline_font: string;
  body_font: string;
}

export interface ScrollSectionMotionBackground {
  kind: ScrollSectionBackgroundKind;
  asset_id: string | null;
  opacity: number;
  blend_mode: string;
}

export interface ScrollSectionMotionTransition {
  kind: string;
  reveal: string;
  pin: boolean;
  intensity: number;
  media_mode: ScrollSectionMediaMode;
}

export interface ScrollSectionMotionComposition {
  version: number;
  source: "legacy" | "preset" | "remotion_composition";
  theme: ScrollSectionMotionTheme;
  background: ScrollSectionMotionBackground;
  transition: ScrollSectionMotionTransition;
  layout: Record<string, unknown>;
}

export interface ScrollSectionMotionContract {
  composition: ScrollSectionMotionComposition;
  backgroundKind: ScrollSectionBackgroundKind;
  backgroundAssetId: string | null;
  backgroundVideoUrl: string | null;
  backgroundImageUrl: string | null;
  effectLabel: string;
  transitionLabel: string;
}

// ─── Status Payload ──────────────────────────────────────────────────────────────

export interface VideoJobStatusEntry {
  job: VideoJob;
  export: VideoExport | null;
  subtitle_track: VideoSubtitleTrack | null;
  generation: AIGeneratedVideo | null;
  scroll_section: ScrollSection | null;
}

export interface VideoJobStatusPayload {
  job: VideoJobStatusEntry | null;
  jobs: VideoJobStatusEntry[];
}
