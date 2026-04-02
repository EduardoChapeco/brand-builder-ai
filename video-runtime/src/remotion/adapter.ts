import { promises as fs } from "node:fs";
import { uploadFileAndPersistVideoAsset } from "../assets.js";
import { supabase } from "../supabase.js";
import { renderMotionComposition, type RenderFormat } from "./render.js";

type JsonRecord = Record<string, unknown>;

type RemotionJobRow = {
  id: string;
  workspace_id: string;
  video_project_id: string | null;
  export_id: string | null;
  scroll_section_id: string | null;
  remotion_composition_id: string | null;
  request_payload: JsonRecord;
};

type RemotionCompositionRow = {
  id: string;
  workspace_id: string;
  video_project_id: string | null;
  source_post_id: string | null;
  source_storyboard_id: string | null;
  source_scroll_section_id: string | null;
  template_key: string;
  remotion_composition_key: string;
  default_props: JsonRecord;
  input_props: JsonRecord;
  brand_bindings: JsonRecord;
  render_preset: JsonRecord;
  metadata: JsonRecord;
};

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toRecord = (value: unknown): JsonRecord => (isRecord(value) ? value : {});
const toNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const toFormat = (value: unknown): RenderFormat => {
  if (value === "gif" || value === "webm") return value;
  return "mp4";
};

const loadComposition = async (job: RemotionJobRow) => {
  if (!job.remotion_composition_id) {
    throw new Error("remotion_composition_id is required for remotion_render jobs.");
  }

  const { data, error } = await supabase
    .from("remotion_compositions")
    .select("*")
    .eq("id", job.remotion_composition_id)
    .eq("workspace_id", job.workspace_id)
    .single();

  if (error || !data) {
    throw error || new Error("Remotion composition not found.");
  }

  return data as RemotionCompositionRow;
};

const buildMergedProps = (composition: RemotionCompositionRow, requestPayload: JsonRecord) => {
  const inputProps = toRecord(requestPayload.input_props);
  const renderOptions = toRecord(requestPayload.render_options);

  const merged = {
    ...composition.default_props,
    ...composition.input_props,
    ...inputProps,
  } as JsonRecord;

  if (!isRecord(merged.brand) || Object.keys(toRecord(merged.brand)).length === 0) {
    merged.brand = composition.brand_bindings || {};
  }

  const dimensions = {
    ...toRecord(isRecord(merged.dimensions) ? merged.dimensions : {}),
    ...toRecord(renderOptions.dimensions),
  };

  const width = toNumber(dimensions.width, 1920);
  const height = toNumber(dimensions.height, 1080);
  const fps = toNumber(merged.fps, 30);
  const durationInFrames = toNumber(
    merged.durationInFrames,
    toNumber(toRecord(composition.render_preset).durationInFrames, 150),
  );

  merged.dimensions = { width, height };
  merged.fps = fps;
  merged.durationInFrames = durationInFrames;
  merged.templateKey = typeof merged.templateKey === "string" ? merged.templateKey : composition.template_key;

  return {
    props: merged,
    width,
    height,
    fps,
    durationInFrames,
    format: toFormat(renderOptions.format),
  };
};

const touchRemotionSources = async (
  composition: RemotionCompositionRow,
  assetId: string,
) => {
  const now = new Date().toISOString();

  await supabase
    .from("remotion_compositions")
    .update({
      status: "ready",
      metadata: {
        ...(composition.metadata || {}),
        latest_output_asset_id: assetId,
      },
      updated_at: now,
    })
    .eq("id", composition.id);

  if (composition.source_post_id) {
    await supabase
      .from("posts_v2")
      .update({ remotion_composition_id: composition.id })
      .eq("id", composition.source_post_id);
  }

  if (composition.source_storyboard_id) {
    await supabase
      .from("carousel_storyboards")
      .update({ remotion_composition_id: composition.id })
      .eq("id", composition.source_storyboard_id);
  }

  if (composition.source_scroll_section_id) {
    await supabase
      .from("scroll_sections")
      .update({
        remotion_composition_id: composition.id,
        background_video_asset_id: assetId,
        updated_at: now,
      })
      .eq("id", composition.source_scroll_section_id);
  }
};

export const renderRemotionJob = async (job: RemotionJobRow) => {
  const composition = await loadComposition(job);
  const merged = buildMergedProps(composition, job.request_payload);
  const startedAt = new Date().toISOString();

  const render = await renderMotionComposition({
    compositionKey: composition.remotion_composition_key || "CerebroMotionTemplate",
    inputProps: merged.props,
    format: merged.format,
    width: merged.width,
    height: merged.height,
    fps: merged.fps,
    durationInFrames: merged.durationInFrames,
    jobId: job.id,
  });

  const storagePath = `${job.workspace_id}/${composition.id}/${job.id}.${render.extension}`;
  const outputAsset = await uploadFileAndPersistVideoAsset({
    workspaceId: job.workspace_id,
    projectId: job.video_project_id || composition.video_project_id || null,
    assetType: "generated_video",
    bucketName: "video-assets",
    storagePath,
    filePath: render.outputFilePath,
    fileName: `${job.id}.${render.extension}`,
    mimeType: render.mimeType,
    status: "completed",
    metadata: {
      render_backend: render.mode,
      remotion_composition_id: composition.id,
      remotion_template_key: composition.template_key,
      job_id: job.id,
      ...render.providerMetadata,
    },
  });

  await fs.rm(render.outputFilePath, { force: true }).catch(() => null);

  await touchRemotionSources(composition, outputAsset.id);

  if (job.export_id) {
    await supabase
      .from("video_exports")
      .update({
        output_asset_id: outputAsset.id,
        remotion_composition_id: composition.id,
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.export_id);
  }

  if (job.scroll_section_id) {
    await supabase
      .from("scroll_sections")
      .update({
        remotion_composition_id: composition.id,
        background_video_asset_id: outputAsset.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.scroll_section_id);
  }

  if (job.video_project_id) {
    await supabase
      .from("video_projects")
      .update({
        latest_export_id: job.export_id || null,
        status: "ready",
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.video_project_id);
  }

  const finishedAt = new Date().toISOString();
  const latencyMs = Date.parse(finishedAt) - Date.parse(startedAt);

  await supabase
    .from("video_jobs")
    .update({
      status: "completed",
      output_asset_id: outputAsset.id,
      result_payload: {
        remotion_composition_id: composition.id,
        template_key: composition.template_key,
        output_asset: {
          id: outputAsset.id,
          public_url: outputAsset.public_url,
          storage_path: outputAsset.storage_path,
        },
        render_mode: render.mode,
        dimensions: {
          width: merged.width,
          height: merged.height,
          fps: merged.fps,
          durationInFrames: merged.durationInFrames,
        },
        ...render.providerMetadata,
      },
      latency_ms: latencyMs,
      started_at: startedAt,
      finished_at: finishedAt,
      updated_at: finishedAt,
    })
    .eq("id", job.id);

  return {
    outputAsset,
    compositionId: composition.id,
    renderMode: render.mode,
  };
};
