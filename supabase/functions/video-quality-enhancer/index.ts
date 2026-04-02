import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createServiceClient,
  dispatchVideoRuntime,
  insertVideoJob,
  pickProviderName,
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
      asset_id,
      operations = ["upscale"],
    } = await req.json() as {
      workspace_id?: string;
      project_id?: string | null;
      asset_id?: string;
      operations?: string[];
    };

    if (!workspace_id || !asset_id) {
      return safeJsonResponse({ error: "workspace_id e asset_id sao obrigatorios." }, 400);
    }

    const providerName = await pickProviderName(supabase, workspace_id, ["replicate"]);
    if (!providerName) {
      return safeJsonResponse({ error: "Nenhuma chave ativa de Replicate encontrada para enhancement." }, 400);
    }

    const job = await insertVideoJob(supabase, {
      workspaceId: workspace_id,
      videoProjectId: project_id || null,
      jobType: "enhance_video",
      providerCapability: "quality_enhancement",
      providerName,
      requestPayload: {
        asset_id,
        operations: Array.isArray(operations) ? operations : ["upscale"],
      },
      priority: 75,
    });

    const dispatch = await dispatchVideoRuntime(supabase, job.id);

    return safeJsonResponse({
      job_id: job.id,
      status: dispatch.dispatched ? "queued" : "failed",
      dispatch_error: dispatch.error || null,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
