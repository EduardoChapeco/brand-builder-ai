import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  copyMediaAssetToVideoAsset,
  corsHeaders,
  createServiceClient,
  dispatchVideoRuntime,
  insertVideoJob,
  pickProviderName,
  safeJsonResponse,
} from "../_shared/video.ts";

type VideoTemplateRow = {
  id: string;
  name: string;
  style_module: Record<string, unknown>;
  camera_module: Record<string, unknown>;
  lighting_module: Record<string, unknown>;
  quality_module: Record<string, unknown>;
  negative_prompt: string | null;
};

const toRecord = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

const toText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const buildPromptComposition = (params: {
  promptOriginal: string;
  sceneContext?: string | null;
  styleTemplate?: string | null;
  cameraMovement?: string | null;
  lightingPreset?: string | null;
  template?: VideoTemplateRow | null;
}) => {
  const subject = params.promptOriginal.trim();
  const scene = toText(params.sceneContext) || "authentic brand-aligned environment";
  const templateStyle = toRecord(params.template?.style_module);
  const templateCamera = toRecord(params.template?.camera_module);
  const templateLighting = toRecord(params.template?.lighting_module);
  const templateQuality = toRecord(params.template?.quality_module);

  const style = {
    id: toText(params.styleTemplate) || toText(templateStyle.id) || "custom",
    prompt: toText(templateStyle.prompt) || "",
  };
  const camera = {
    id: toText(params.cameraMovement) || toText(templateCamera.id) || "static",
    prompt: toText(templateCamera.prompt) || "",
  };
  const lighting = {
    id: toText(params.lightingPreset) || toText(templateLighting.id) || "natural",
    prompt: toText(templateLighting.prompt) || "",
  };
  const quality = {
    ...templateQuality,
    prompt: toText(templateQuality.prompt) || "high fidelity, cinematic quality, consistent anatomy, premium visual finish",
  };
  const negative = toText(params.template?.negative_prompt) || "watermark, low quality, distorted anatomy, extra fingers, text overlay";

  const prompt = [
    subject,
    scene,
    style.prompt,
    camera.prompt,
    lighting.prompt,
    toText(quality.prompt),
  ].filter(Boolean).join(", ");

  return {
    subject,
    scene,
    style,
    camera,
    lighting,
    quality,
    negative,
    prompt,
  };
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();
    const body = await req.json() as {
      action?: "compose" | "attach_keyframe" | "request_render";
      workspace_id?: string;
      generation_id?: string;
      project_id?: string | null;
      prompt_original?: string;
      scene_context?: string | null;
      template_id?: string | null;
      style_template?: string | null;
      camera_movement?: string | null;
      lighting_preset?: string | null;
      duration_seconds?: number | null;
      source_media_asset_id?: string | null;
    };

    const action = body.action || "compose";
    if (!body.workspace_id) {
      return safeJsonResponse({ error: "workspace_id e obrigatorio." }, 400);
    }

    if (action === "compose") {
      if (!body.prompt_original?.trim()) {
        return safeJsonResponse({ error: "prompt_original e obrigatorio para compose." }, 400);
      }

      let template: VideoTemplateRow | null = null;
      if (body.template_id) {
        const { data } = await supabase
          .from("video_templates")
          .select("id,name,style_module,camera_module,lighting_module,quality_module,negative_prompt")
          .eq("id", body.template_id)
          .maybeSingle();
        template = data as VideoTemplateRow | null;
      }

      const composed = buildPromptComposition({
        promptOriginal: body.prompt_original,
        sceneContext: body.scene_context || null,
        styleTemplate: body.style_template || template?.name || null,
        cameraMovement: body.camera_movement || null,
        lightingPreset: body.lighting_preset || null,
        template,
      });

      const { data: generation, error } = await supabase
        .from("ai_generated_videos")
        .insert({
          workspace_id: body.workspace_id,
          video_project_id: body.project_id || null,
          title: body.prompt_original.trim().slice(0, 80),
          prompt_original: body.prompt_original.trim(),
          prompt_composed: composed,
          style_template: composed.style.id,
          camera_movement: composed.camera.id,
          lighting_preset: composed.lighting.id,
          quality_module: composed.quality,
          negative_prompt: composed.negative,
          duration_seconds: Math.max(3, Math.min(Number(body.duration_seconds) || 5, 10)),
          status: "draft",
        })
        .select("*")
        .single();

      if (error || !generation) {
        throw error || new Error("Nao foi possivel criar ai_generated_video.");
      }

      return safeJsonResponse({
        generation_id: generation.id,
        generation,
        prompt_composed: composed,
      });
    }

    if (!body.generation_id) {
      return safeJsonResponse({ error: "generation_id e obrigatorio." }, 400);
    }

    const { data: generation, error: generationError } = await supabase
      .from("ai_generated_videos")
      .select("*")
      .eq("id", body.generation_id)
      .eq("workspace_id", body.workspace_id)
      .single();

    if (generationError || !generation) {
      return safeJsonResponse({ error: "Geracao de video nao encontrada." }, 404);
    }

    if (action === "attach_keyframe") {
      if (!body.source_media_asset_id) {
        return safeJsonResponse({ error: "source_media_asset_id e obrigatorio para attach_keyframe." }, 400);
      }

      const mirroredAsset = await copyMediaAssetToVideoAsset(supabase, {
        workspaceId: body.workspace_id,
        videoProjectId: generation.video_project_id,
        mediaAssetId: body.source_media_asset_id,
        assetType: "generated_image",
      });

      const { data: updatedGeneration, error: updateError } = await supabase
        .from("ai_generated_videos")
        .update({
          keyframe_asset_id: mirroredAsset.id,
          status: "keyframe_ready",
          updated_at: new Date().toISOString(),
        })
        .eq("id", generation.id)
        .select("*")
        .single();

      if (updateError || !updatedGeneration) {
        throw updateError || new Error("Nao foi possivel anexar o keyframe.");
      }

      return safeJsonResponse({
        generation_id: updatedGeneration.id,
        generation: updatedGeneration,
        keyframe_asset: mirroredAsset,
      });
    }

    if (!generation.keyframe_asset_id) {
      return safeJsonResponse({ error: "A geracao precisa de um keyframe aprovado antes do render final." }, 400);
    }

    const providerName = await pickProviderName(supabase, body.workspace_id, ["runway", "kling", "luma", "minimax"]);
    if (!providerName) {
      return safeJsonResponse({ error: "Nenhum provider de video ativo encontrado (runway/kling/luma/minimax)." }, 400);
    }

    const job = await insertVideoJob(supabase, {
      workspaceId: body.workspace_id,
      videoProjectId: generation.video_project_id,
      generationId: generation.id,
      jobType: "render_generated_video",
      providerCapability: "image_to_video",
      providerName,
      requestPayload: {
        generation_id: generation.id,
        prompt_composed: generation.prompt_composed,
        keyframe_asset_id: generation.keyframe_asset_id,
        duration_seconds: generation.duration_seconds,
      },
      priority: 65,
    });

    await supabase
      .from("ai_generated_videos")
      .update({
        provider_name: providerName,
        latest_job_id: job.id,
        status: "rendering",
      })
      .eq("id", generation.id);

    const dispatch = await dispatchVideoRuntime(supabase, job.id);

    return safeJsonResponse({
      generation_id: generation.id,
      job_id: job.id,
      status: dispatch.dispatched ? "queued" : "failed",
      dispatch_error: dispatch.error || null,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
