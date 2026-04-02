import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createServiceClient,
  loadRemotionJobStatus,
  readJsonBody,
  safeJsonResponse,
  toOptionalText,
  toStringArray,
} from "../_shared/remotion.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await readJsonBody(req);
    const ids = Array.from(
      new Set([
        toOptionalText(body.job_id),
        toOptionalText(body.video_job_id),
        ...toStringArray(body.job_ids),
      ].filter((value): value is string => Boolean(value))),
    );

    if (ids.length === 0) {
      return safeJsonResponse({ error: "job_id ou job_ids sao obrigatorios." }, 400);
    }

    const supabase = createServiceClient();
    const jobs = await loadRemotionJobStatus(supabase, ids);

    return safeJsonResponse({
      jobs,
      job: jobs[0] || null,
      job_id: jobs[0]?.job?.id || null,
      status: jobs[0]?.job?.status || null,
      output_asset: jobs[0]?.output_asset || null,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
