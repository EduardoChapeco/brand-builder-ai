/**
 * video-studio/index.ts — Barrel export
 *
 * Re-exporta tudo dos 3 sub-módulos.
 * Todos os imports existentes `@/lib/video-studio` continuam funcionando.
 *
 * Estrutura:
 *   types.ts   → definições TypeScript puras
 *   mappers.ts → normalização de dados brutos (to* functions)
 *   api.ts     → chamadas de rede (Edge Functions + Supabase Storage)
 */

// Tipos
export type {
  AIGeneratedVideo,
  LayerComposition,
  ScrollSection,
  ScrollSectionBackgroundKind,
  ScrollSectionMediaMode,
  ScrollSectionMotionBackground,
  ScrollSectionMotionComposition,
  ScrollSectionMotionContract,
  ScrollSectionMotionTheme,
  ScrollSectionMotionTransition,
  VideoAsset,
  VideoExport,
  VideoJob,
  VideoJobStatus,
  VideoJobStatusEntry,
  VideoJobStatusPayload,
  VideoProject,
  VideoSubtitleTrack,
  VideoTemplate,
  VideoTimelineVersion,
} from "./types";

// Mappers (re-exportados para compatibilidade com código que os importa diretamente)
export {
  DEFAULT_THEME,
  isRecord,
  resolveScrollSectionMotionContract,
  toArray,
  toBackgroundKind,
  toBoolean,
  toGeneratedVideo,
  toMediaMode,
  toNullableString,
  toNumber,
  toRecord,
  toScrollSection,
  toString,
  toVideoAsset,
  toVideoExport,
  toVideoJob,
  toVideoProject,
  toVideoSubtitleTrack,
  toVideoTemplate,
} from "./mappers";

// API (chamadas de rede)
export {
  attachVideoKeyframe,
  composeVideoPrompt,
  confirmVideoUpload,
  createLayerComposition,
  createScrollSection,
  createVideoUploadSession,
  getVideoJobStatus,
  requestGeneratedVideoRender,
  requestRemotionRender,
  requestSilenceDetection,
  requestVideoEnhancement,
  requestVideoExport,
  requestVideoSubtitles,
  requestViralityAnalysis,
  uploadVideoAssetFile,
} from "./api";
