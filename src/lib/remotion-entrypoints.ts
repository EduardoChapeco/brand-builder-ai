import {
  createLayerComposition,
  requestRemotionRender,
  type VideoJob,
  type VideoJobStatus,
} from "./video-studio";

export type RemotionCompositionKind =
  | "animated_post"
  | "animated_carousel"
  | "storyboard_animatic"
  | "video_summary";

export type RemotionSourceModule =
  | "generator_page"
  | "carousel_builder"
  | "blog_manager";

export type RemotionSceneInput = {
  id: string;
  kind: string;
  durationFrames?: number;
  payload: Record<string, unknown>;
};

export type LaunchRemotionCompositionInput = {
  workspaceId: string;
  title: string;
  promptOriginal: string;
  compositionKind: RemotionCompositionKind;
  sourceModule: RemotionSourceModule;
  canvasWidth: number;
  canvasHeight: number;
  fps?: number;
  projectId?: string | null;
  sourceRef?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  scenes: RemotionSceneInput[];
};

export type LaunchRemotionCompositionResult = {
  compositionId: string;
  jobId: string;
  status: VideoJobStatus;
  dispatchError: string | null;
};

const clampFrames = (value: number | undefined, fallback: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(30, Math.round(value));
};

export const launchRemotionComposition = async (
  input: LaunchRemotionCompositionInput,
): Promise<LaunchRemotionCompositionResult> => {
  const fps = typeof input.fps === "number" && Number.isFinite(input.fps) ? input.fps : 30;
  let cursorFrame = 0;

  const normalizedScenes = input.scenes.map((scene, index) => {
    const durationFrames = clampFrames(scene.durationFrames, index === 0 ? fps * 4 : fps * 3);
    const normalized = {
      id: scene.id,
      type: scene.kind,
      order: index,
      start_frame: cursorFrame,
      duration_frames: durationFrames,
      fps,
      content: scene.payload,
      metadata: {
        title: input.title,
        composition_kind: input.compositionKind,
        source_module: input.sourceModule,
        source_ref: input.sourceRef || {},
      },
    };
    cursorFrame += durationFrames;
    return normalized;
  });

  const props = {
    title: input.title,
    composition_kind: input.compositionKind,
    source_module: input.sourceModule,
    source_ref: input.sourceRef || {},
    metadata: input.metadata || {},
    canvas: {
      width: input.canvasWidth,
      height: input.canvasHeight,
      fps,
      total_frames: cursorFrame,
    },
    scenes: normalizedScenes,
  };

  const composition = await createLayerComposition({
    workspace_id: input.workspaceId,
    project_id: input.projectId || null,
    prompt_original: input.promptOriginal,
    layers: normalizedScenes,
    canvas_width: input.canvasWidth,
    canvas_height: input.canvasHeight,
    run_now: false,
  });

  const render = await requestRemotionRender({
    workspace_id: input.workspaceId,
    project_id: input.projectId || null,
    composition_id: composition.composition_id,
    props,
  });

  return {
    compositionId: composition.composition_id,
    jobId: render.job_id,
    status: render.status,
    dispatchError: render.dispatch_error || null,
  };
};

const extractUrl = (value: unknown): string | null => {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  return /^https?:\/\//i.test(value.trim()) ? value.trim() : null;
};

export const extractRemotionResultUrl = (job: Pick<VideoJob, "result_payload"> | null | undefined) => {
  const payload = job?.result_payload;
  if (!payload) return null;

  const directCandidates = [
    payload.output_url,
    payload.public_url,
    payload.asset_url,
    payload.render_url,
    payload.download_url,
  ];

  for (const candidate of directCandidates) {
    const url = extractUrl(candidate);
    if (url) return url;
  }

  if (typeof payload.output_asset === "object" && payload.output_asset) {
    const outputAsset = payload.output_asset as Record<string, unknown>;
    return extractUrl(outputAsset.public_url) || extractUrl(outputAsset.url);
  }

  return null;
};
