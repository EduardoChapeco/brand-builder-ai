import { z } from "zod";
import { REMOTION_RENDER_MODES, REMOTION_VIDEO_CODECS } from "./constants.js";

const JsonRecordSchema = z.record(z.unknown());

export const RemotionTemplateKeySchema = z.enum(["layer_composition"]);
export const RemotionRenderModeSchema = z.enum(REMOTION_RENDER_MODES);
export const RemotionVideoCodecSchema = z.enum(REMOTION_VIDEO_CODECS);

export const RemotionLayerSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  order: z.number().int().nonnegative().default(0),
  start_frame: z.number().int().nonnegative().default(0),
  duration_frames: z.number().int().positive().default(60),
  fps: z.number().int().positive().default(30),
  content: JsonRecordSchema.default({}),
  metadata: JsonRecordSchema.default({}),
}).passthrough();

export const RemotionCompositionRowSchema = z.object({
  id: z.string().min(1),
  workspace_id: z.string().min(1),
  video_project_id: z.string().nullable().optional(),
  prompt_original: z.string().default(""),
  layers: z.array(RemotionLayerSchema).default([]),
  canvas_width: z.number().int().positive().default(1080),
  canvas_height: z.number().int().positive().default(1080),
  status: z.string().default("draft"),
  latest_job_id: z.string().nullable().optional(),
  metadata: JsonRecordSchema.default({}),
}).passthrough();

export const RemotionRenderPropsSchema = z.object({
  title: z.string().default("Video Studio Render"),
  composition_kind: z.string().optional(),
  source_module: z.string().optional(),
  source_ref: JsonRecordSchema.default({}),
  metadata: JsonRecordSchema.default({}),
  canvas: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    fps: z.number().int().positive(),
    total_frames: z.number().int().positive().optional(),
  }).optional(),
  scenes: z.array(RemotionLayerSchema).default([]),
  template_key: z.string().optional(),
  codec: z.string().optional(),
  render_mode: z.string().optional(),
}).passthrough();

export const RemotionRenderRequestSchema = z.object({
  composition_id: z.string().min(1),
  props: JsonRecordSchema.default({}),
  render_mode: RemotionRenderModeSchema.optional(),
  template_key: z.string().optional(),
  codec: z.string().optional(),
}).passthrough();

export type RemotionRenderMode = z.infer<typeof RemotionRenderModeSchema>;
export type RemotionVideoCodec = z.infer<typeof RemotionVideoCodecSchema>;
export type RemotionLayer = z.infer<typeof RemotionLayerSchema>;
export type RemotionCompositionRow = z.infer<typeof RemotionCompositionRowSchema>;
export type RemotionRenderProps = z.infer<typeof RemotionRenderPropsSchema>;
export type RemotionRenderRequest = z.infer<typeof RemotionRenderRequestSchema>;
