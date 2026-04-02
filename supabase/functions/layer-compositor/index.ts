import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createServiceClient,
  dispatchVideoRuntime,
  insertVideoJob,
  safeJsonResponse,
} from "../_shared/video.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();
    const {
      workspace_id,
      project_id,
      prompt_original,
      layers = [],
      canvas_width = 1080,
      canvas_height = 1080,
      run_now = false,
    } = await req.json() as {
      workspace_id?: string;
      project_id?: string | null;
      prompt_original?: string;
      layers?: unknown[];
      canvas_width?: number;
      canvas_height?: number;
      run_now?: boolean;
    };

    if (!workspace_id || !prompt_original?.trim()) {
      return safeJsonResponse({ error: "workspace_id e prompt_original sao obrigatorios." }, 400);
    }

    const { data: composition, error } = await supabase
      .from("layer_compositions")
      .insert({
        workspace_id,
        video_project_id: project_id || null,
        prompt_original: prompt_original.trim(),
        layers: Array.isArray(layers) ? layers : [],
        canvas_width,
        canvas_height,
        status: run_now ? "processing" : "draft",
      })
      .select("*")
      .single();

    if (error || !composition) {
      throw error || new Error("Nao foi possivel criar layer_composition.");
    }

    if (!run_now) {
      return safeJsonResponse({
        composition_id: composition.id,
        composition,
      });
    }

    const job = await insertVideoJob(supabase, {
      workspaceId: workspace_id,
      videoProjectId: project_id || null,
      layerCompositionId: composition.id,
      jobType: "render_layer_composition",
      requestPayload: {
        composition_id: composition.id,
        layers,
        canvas_width,
        canvas_height,
      },
      priority: 60,
    });

    await supabase
      .from("layer_compositions")
      .update({ latest_job_id: job.id })
      .eq("id", composition.id);

    const dispatch = await dispatchVideoRuntime(supabase, job.id);

    return safeJsonResponse({
      composition_id: composition.id,
      job_id: job.id,
      status: dispatch.dispatched ? "queued" : "failed",
      dispatch_error: dispatch.error || null,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
