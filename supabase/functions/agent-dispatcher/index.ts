import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { processQueuedRuns } from "../_shared/agent-runtime.ts";
import { corsHeaders, createServiceClient, safeJsonResponse } from "../_shared/postgen.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { limit = 3 } = await req.json().catch(() => ({ limit: 3 })) as {
      limit?: number;
    };

    const supabase = createServiceClient();
    const results = await processQueuedRuns(supabase, Math.max(1, Math.min(Number(limit) || 3, 10)));

    return safeJsonResponse({
      processed: results.length,
      runs: results.map((entry) => ({
        prd_id: entry.run.id,
        status: entry.run.status,
      })),
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
