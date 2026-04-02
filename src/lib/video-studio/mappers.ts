/**
 * video-studio/mappers.ts — Mapeadores de dados brutos para tipos do Video Studio
 *
 * Converte responses de Supabase/Edge Functions (unknown/JSON) em objetos tipados.
 * Nenhuma chamada de rede — puro mapeamento de dados.
 */

import type {
  AIGeneratedVideo,
  ScrollSection,
  ScrollSectionBackgroundKind,
  ScrollSectionMediaMode,
  ScrollSectionMotionComposition,
  ScrollSectionMotionContract,
  ScrollSectionMotionTheme,
  VideoAsset,
  VideoExport,
  VideoJob,
  VideoJobStatus,
  VideoProject,
  VideoSubtitleTrack,
  VideoTemplate,
} from "./types";

// ─── Primitivos ───────────────────────────────────────────────────────────────

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const toRecord = (value: unknown): Record<string, unknown> =>
  isRecord(value) ? value : {};

export const toArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

export const toString = (value: unknown): string =>
  typeof value === "string" ? value : "";

export const toNullableString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

export const toNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" ? value : fallback;

export const toBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;

export const toMediaMode = (
  value: unknown,
  fallback: ScrollSectionMediaMode,
): ScrollSectionMediaMode =>
  value === "timeline" || value === "background" ? value : fallback;

export const toBackgroundKind = (
  value: unknown,
  fallback: ScrollSectionBackgroundKind,
): ScrollSectionBackgroundKind =>
  value === "video" || value === "image" || value === "gradient" ? value : fallback;

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_THEME: ScrollSectionMotionTheme = {
  primary: "#7C3AED",
  secondary: "#18181B",
  accent: "#F59E0B",
  headline_font: "Space Grotesk",
  body_font: "DM Sans",
};

// ─── Entidade Mappers ──────────────────────────────────────────────────────────

export const toVideoProject = (value: unknown): VideoProject => {
  const record = toRecord(value);
  return {
    id: toString(record.id),
    workspace_id: toString(record.workspace_id),
    name: toString(record.name),
    description: toNullableString(record.description),
    ratio: toString(record.ratio) || "16:9",
    fps: toNumber(record.fps, 30),
    status: toString(record.status) || "draft",
    active_timeline_version_id: toNullableString(record.active_timeline_version_id),
    latest_export_id: toNullableString(record.latest_export_id),
    latest_subtitle_track_id: toNullableString(record.latest_subtitle_track_id),
    latest_source_asset_id: toNullableString(record.latest_source_asset_id),
    settings: toRecord(record.settings),
    metadata: toRecord(record.metadata),
    created_at: toNullableString(record.created_at) || undefined,
    updated_at: toNullableString(record.updated_at) || undefined,
  };
};

export const toVideoAsset = (value: unknown): VideoAsset => {
  const record = toRecord(value);
  return {
    id: toString(record.id),
    workspace_id: toString(record.workspace_id),
    video_project_id: toNullableString(record.video_project_id),
    asset_type: toString(record.asset_type),
    bucket_name: toString(record.bucket_name),
    storage_path: toString(record.storage_path),
    public_url: toNullableString(record.public_url),
    mime_type: toNullableString(record.mime_type),
    file_name: toNullableString(record.file_name),
    file_size_bytes: typeof record.file_size_bytes === "number" ? record.file_size_bytes : null,
    duration_ms: typeof record.duration_ms === "number" ? record.duration_ms : null,
    width: typeof record.width === "number" ? record.width : null,
    height: typeof record.height === "number" ? record.height : null,
    status: toString(record.status) || "uploaded",
    waveform_json: toArray(record.waveform_json),
    metadata: toRecord(record.metadata),
  };
};

export const toVideoJob = (value: unknown): VideoJob => {
  const record = toRecord(value);
  return {
    id: toString(record.id),
    workspace_id: toString(record.workspace_id),
    job_type: toString(record.job_type),
    status: (toString(record.status) || "queued") as VideoJobStatus,
    error_message: toNullableString(record.error_message),
    provider_name: toNullableString(record.provider_name),
    model_name: toNullableString(record.model_name),
    request_payload: toRecord(record.request_payload),
    result_payload: toRecord(record.result_payload),
    video_project_id: toNullableString(record.video_project_id),
    export_id: toNullableString(record.export_id),
    subtitle_track_id: toNullableString(record.subtitle_track_id),
    generation_id: toNullableString(record.generation_id),
    scroll_section_id: toNullableString(record.scroll_section_id),
    started_at: toNullableString(record.started_at),
    finished_at: toNullableString(record.finished_at),
    created_at: toNullableString(record.created_at) || undefined,
    updated_at: toNullableString(record.updated_at) || undefined,
  };
};

export const toVideoSubtitleTrack = (value: unknown): VideoSubtitleTrack => {
  const record = toRecord(value);
  return {
    id: toString(record.id),
    video_project_id: toString(record.video_project_id),
    source_asset_id: toNullableString(record.source_asset_id),
    language_code: toString(record.language_code) || "pt-BR",
    provider_name: toNullableString(record.provider_name),
    transcript_text: toNullableString(record.transcript_text),
    words_json: toArray(record.words_json),
    style_preset: toString(record.style_preset) || "youtube_subtitle",
    style_overrides: toRecord(record.style_overrides),
  };
};

export const toVideoExport = (value: unknown): VideoExport => {
  const record = toRecord(value);
  return {
    id: toString(record.id),
    video_project_id: toString(record.video_project_id),
    export_preset: toString(record.export_preset),
    ratio: toString(record.ratio),
    width: toNumber(record.width),
    height: toNumber(record.height),
    fps: toNumber(record.fps, 30),
    format: toString(record.format) || "mp4",
    codec: toString(record.codec) || "h264",
    status: toString(record.status),
    output_asset_id: toNullableString(record.output_asset_id),
  };
};

export const toGeneratedVideo = (value: unknown): AIGeneratedVideo => {
  const record = toRecord(value);
  return {
    id: toString(record.id),
    workspace_id: toString(record.workspace_id),
    video_project_id: toNullableString(record.video_project_id),
    title: toNullableString(record.title),
    prompt_original: toString(record.prompt_original),
    prompt_composed: toRecord(record.prompt_composed),
    style_template: toNullableString(record.style_template),
    camera_movement: toNullableString(record.camera_movement),
    lighting_preset: toNullableString(record.lighting_preset),
    negative_prompt: toNullableString(record.negative_prompt),
    duration_seconds: toNumber(record.duration_seconds, 5),
    status: toString(record.status),
    keyframe_asset_id: toNullableString(record.keyframe_asset_id),
    video_asset_id: toNullableString(record.video_asset_id),
    latest_job_id: toNullableString(record.latest_job_id),
    provider_name: toNullableString(record.provider_name),
  };
};

export const toVideoTemplate = (value: unknown): VideoTemplate => {
  const record = toRecord(value);
  return {
    id: toString(record.id),
    name: toString(record.name),
    description: toNullableString(record.description),
    template_kind: toString(record.template_kind) || "video_generation",
    thumbnail_url: toNullableString(record.thumbnail_url),
    preview_json: toRecord(record.preview_json),
    style_module: toRecord(record.style_module),
    camera_module: toRecord(record.camera_module),
    lighting_module: toRecord(record.lighting_module),
    quality_module: toRecord(record.quality_module),
    negative_prompt: toNullableString(record.negative_prompt),
  };
};

export const toScrollSection = (value: unknown): ScrollSection => {
  const record = toRecord(value);
  return {
    id: toString(record.id),
    workspace_id: toString(record.workspace_id),
    site_id: toNullableString(record.site_id),
    website_page_id: toNullableString(record.website_page_id),
    name: toString(record.name),
    scroll_effect_type: toString(record.scroll_effect_type),
    status: toString(record.status),
    content: toRecord(record.content),
    renderer_config: toRecord(record.renderer_config),
    preview_data: toRecord(record.preview_data),
    background_video_asset_id: toNullableString(record.background_video_asset_id),
    background_image_asset_id: toNullableString(record.background_image_asset_id),
  };
};

// ─── MotionContract resolver ───────────────────────────────────────────────────

/**
 * Resolve o contrato de animação de uma ScrollSection.
 * Normaliza config legada (preset) e moderna (remotion_composition) em um formato unificado.
 *
 * @performance Resultado deve ser memoizado via useMemo quando usado em render loops.
 * @see SiteEditorPage.motionContracts
 */
export const resolveScrollSectionMotionContract = (
  section: ScrollSection,
  assets?: {
    backgroundVideoUrl?: string | null;
    backgroundImageUrl?: string | null;
  },
): ScrollSectionMotionContract => {
  const rendererConfig = toRecord(section.renderer_config);
  const legacyPreset = toRecord(rendererConfig.preset);
  const remotionComposition = toRecord(rendererConfig.remotion_composition);
  const remotionBackground = toRecord(remotionComposition.background);
  const remotionTransition = toRecord(remotionComposition.transition);
  const remotionTheme = toRecord(remotionComposition.theme);
  const legacyTheme = toRecord(rendererConfig.theme);
  const presetTheme = toRecord(legacyPreset.theme);
  const legacyBackground = toRecord(legacyPreset.background);
  const legacyTransition = toRecord(legacyPreset.transition);
  const backgroundVideoUrl = assets?.backgroundVideoUrl || null;
  const backgroundImageUrl = assets?.backgroundImageUrl || null;

  const fallbackBackgroundKind: ScrollSectionBackgroundKind = backgroundVideoUrl
    ? "video"
    : backgroundImageUrl
      ? "image"
      : "gradient";

  const backgroundKind = toBackgroundKind(
    remotionBackground.kind ?? legacyBackground.kind,
    fallbackBackgroundKind,
  );

  const mediaMode = toMediaMode(
    remotionComposition.media_mode ?? legacyPreset.media_mode,
    section.scroll_effect_type === "video_scrub" ? "timeline" : "background",
  );

  const theme: ScrollSectionMotionTheme = {
    primary: toString(remotionTheme.primary) || toString(legacyTheme.primary) || toString(presetTheme.primary) || DEFAULT_THEME.primary,
    secondary: toString(remotionTheme.secondary) || toString(legacyTheme.secondary) || toString(presetTheme.secondary) || DEFAULT_THEME.secondary,
    accent: toString(remotionTheme.accent) || toString(legacyTheme.accent) || toString(presetTheme.accent) || DEFAULT_THEME.accent,
    headline_font: toString(remotionTheme.headline_font) || toString(legacyTheme.headline_font) || toString(presetTheme.headline_font) || DEFAULT_THEME.headline_font,
    body_font: toString(remotionTheme.body_font) || toString(legacyTheme.body_font) || toString(presetTheme.body_font) || DEFAULT_THEME.body_font,
  };

  const composition: ScrollSectionMotionComposition = {
    version: typeof remotionComposition.version === "number"
      ? remotionComposition.version
      : typeof legacyPreset.version === "number"
        ? legacyPreset.version
        : 1,
    source: Object.keys(remotionComposition).length > 0
      ? "remotion_composition"
      : Object.keys(legacyPreset).length > 0
        ? "preset"
        : "legacy",
    theme,
    background: {
      kind: backgroundKind,
      asset_id: backgroundKind === "video"
        ? section.background_video_asset_id || toNullableString(remotionBackground.asset_id) || null
        : backgroundKind === "image"
          ? section.background_image_asset_id || toNullableString(remotionBackground.asset_id) || null
          : toNullableString(remotionBackground.asset_id) || null,
      opacity: typeof remotionBackground.opacity === "number"
        ? remotionBackground.opacity
        : backgroundKind === "video"
          ? 0.4
          : 1,
      blend_mode: toString(remotionBackground.blend_mode) || "normal",
    },
    transition: {
      kind: toString(remotionTransition.kind) || toString(legacyTransition.kind) || section.scroll_effect_type,
      reveal: toString(remotionTransition.reveal) || toString(legacyPreset.reveal) || "fade",
      pin: toBoolean(
        remotionTransition.pin,
        Boolean(legacyPreset.pin) ||
        section.scroll_effect_type === "sticky" ||
        section.scroll_effect_type === "video_scrub",
      ),
      intensity: typeof remotionTransition.intensity === "number"
        ? remotionTransition.intensity
        : typeof legacyPreset.intensity === "number"
          ? legacyPreset.intensity
          : 0.2,
      media_mode: mediaMode,
    },
    layout: toRecord(remotionComposition.layout),
  };

  return {
    composition,
    backgroundKind,
    backgroundAssetId: composition.background.asset_id,
    backgroundVideoUrl: backgroundKind === "video" ? backgroundVideoUrl : null,
    backgroundImageUrl: backgroundKind === "image" ? backgroundImageUrl : null,
    effectLabel: section.scroll_effect_type.replace(/_/g, " "),
    transitionLabel: composition.transition.kind.replace(/_/g, " "),
  };
};
