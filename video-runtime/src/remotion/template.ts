import { REMOTION_TEMPLATE_KEY } from "./constants.js";
import {
  RemotionCompositionRowSchema,
  RemotionRenderPropsSchema,
  type RemotionCompositionRow,
  type RemotionLayer,
  type RemotionRenderProps,
} from "./contracts.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const compactValue = (value: unknown, depth = 0): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const items = value.slice(0, 3).map((item) => compactValue(item, depth + 1)).filter(Boolean);
    return items.join(", ");
  }
  if (isRecord(value)) {
    const entries = Object.entries(value)
      .slice(0, depth > 0 ? 2 : 4)
      .map(([key, item]) => `${key}: ${compactValue(item, depth + 1)}`)
      .filter((item) => item.trim().length > 0);
    return `{ ${entries.join("; ")} }`;
  }
  return "";
};

const truncate = (value: string, max = 140) => (value.length > max ? `${value.slice(0, max - 1)}...` : value);

const normalizeUrl = (value: unknown) => {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
};

const getTextCandidate = (content: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = content[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return "";
};

export const summarizeLayer = (layer: RemotionLayer) => {
  const content = isRecord(layer.content) ? layer.content : {};
  const primaryText = getTextCandidate(content, ["headline", "title", "subtitle", "text", "body", "description", "copy", "caption", "cta", "label", "value"]);
  const secondaryText = getTextCandidate(content, ["supporting_text", "details", "note", "subcopy", "caption"]);
  const mediaUrl = normalizeUrl(content.image_url ?? content.video_url ?? content.media_url ?? content.asset_url ?? content.url);

  const tags = Object.entries(content)
    .filter(([key, value]) => {
      if (["headline", "title", "subtitle", "text", "body", "description", "copy", "caption", "cta", "label", "value", "supporting_text", "details", "note", "subcopy", "image_url", "video_url", "media_url", "asset_url", "url"].includes(key)) {
        return false;
      }
      return value !== null && value !== undefined;
    })
    .slice(0, 4)
    .map(([key, value]) => `${key}=${truncate(compactValue(value), 48)}`);

  return {
    title: primaryText || `Layer ${layer.order + 1}`,
    subtitle: secondaryText,
    tags,
    mediaUrl,
    contentPreview: truncate(compactValue(content), 180),
  };
};

const resolveFps = (_composition: RemotionCompositionRow, scenes: RemotionLayer[], props: RemotionRenderProps) => {
  if (props.canvas && typeof props.canvas.fps === "number") return props.canvas.fps;
  const layerFps = scenes.find((scene) => typeof scene.fps === "number" && scene.fps > 0)?.fps;
  return layerFps || 30;
};

export const computeDurationFrames = (scenes: RemotionLayer[], fallbackFrames = 90) => {
  if (scenes.length === 0) return fallbackFrames;
  return scenes.reduce((maxFrames, scene) => {
    const endFrame = scene.start_frame + scene.duration_frames;
    return endFrame > maxFrames ? endFrame : maxFrames;
  }, 0) || fallbackFrames;
};

export const buildRenderProps = (compositionInput: unknown, propsInput: unknown): RemotionRenderProps => {
  const composition = RemotionCompositionRowSchema.parse(compositionInput);
  const requestProps = RemotionRenderPropsSchema.parse(propsInput);
  const scenes = composition.layers.length > 0 ? composition.layers : requestProps.scenes;
  const fps = resolveFps(composition, scenes, requestProps);
  const durationFrames = requestProps.canvas?.total_frames || computeDurationFrames(scenes, fps * 3);

  return RemotionRenderPropsSchema.parse({
    ...requestProps,
    title: requestProps.title || composition.prompt_original || `Composition ${composition.id}`,
    composition_kind: requestProps.composition_kind || String(composition.metadata.composition_kind || ""),
    source_module: requestProps.source_module || String(composition.metadata.source_module || ""),
    source_ref: requestProps.source_ref || composition.metadata.source_ref || {},
    metadata: {
      ...composition.metadata,
      ...requestProps.metadata,
      template_key: requestProps.template_key || REMOTION_TEMPLATE_KEY,
      composition_id: composition.id,
      workspace_id: composition.workspace_id,
    },
    canvas: {
      width: requestProps.canvas?.width || composition.canvas_width,
      height: requestProps.canvas?.height || composition.canvas_height,
      fps,
      total_frames: durationFrames,
    },
    scenes,
    template_key: requestProps.template_key || REMOTION_TEMPLATE_KEY,
    codec: requestProps.codec || "h264",
    render_mode: requestProps.render_mode || "auto",
  });
};

export const validateRemotionTemplateKey = (value: unknown) => {
  if (value === undefined || value === null || value === "") return REMOTION_TEMPLATE_KEY;
  if (value !== REMOTION_TEMPLATE_KEY) {
    throw new Error(`Unsupported Remotion template: ${String(value)}. Only ${REMOTION_TEMPLATE_KEY} is allowed by default.`);
  }
  return REMOTION_TEMPLATE_KEY;
};
