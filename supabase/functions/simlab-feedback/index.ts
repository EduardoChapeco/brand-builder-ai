import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createServiceClient, safeJsonResponse } from "../_shared/postgen.ts";
import { callSimlabPath, recordSimlabObservation } from "../_shared/simlab.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      workspace_id,
      module_type,
      source_record_type,
      source_record_id,
      metric_key,
      metric_value,
      observation_payload,
      simlab_run_id,
      observed_at,
      forward_to_calibrator = true,
    } = await req.json() as {
      workspace_id?: string;
      module_type?: string;
      source_record_type?: string;
      source_record_id?: string;
      metric_key?: string;
      metric_value?: number | null;
      observation_payload?: Record<string, unknown>;
      simlab_run_id?: string | null;
      observed_at?: string | null;
      forward_to_calibrator?: boolean;
    };

    if (!workspace_id || !module_type || !source_record_type || !metric_key) {
      return safeJsonResponse({ error: "workspace_id, module_type, source_record_type e metric_key sao obrigatorios." }, 400);
    }

    const supabase = createServiceClient();
    const observation = await recordSimlabObservation(supabase, workspace_id, {
      simlab_run_id: simlab_run_id || null,
      source_module: module_type,
      source_record_type,
      source_record_id: source_record_id || null,
      metric_key,
      metric_value: typeof metric_value === "number" ? metric_value : null,
      observation_payload: observation_payload || {},
      observed_at: observed_at || null,
    });

    let calibration = null;
    if (forward_to_calibrator) {
      try {
        calibration = await callSimlabPath("/simlab/calibration/feedback", {
          workspace_id,
          module_type,
          run_id: simlab_run_id || null,
          observation_type: source_record_type,
          metrics: {
            [metric_key]: typeof metric_value === "number" ? metric_value : 0,
          },
          note: typeof observation_payload?.note === "string" ? observation_payload.note : null,
          observed_at: observed_at || null,
        });
      } catch (error) {
        return safeJsonResponse({
          observation,
          calibration_error: error instanceof Error ? error.message : String(error),
        }, 202);
      }
    }

    return safeJsonResponse({
      observation,
      calibration,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
