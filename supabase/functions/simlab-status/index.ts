import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createServiceClient, safeJsonResponse } from "../_shared/postgen.ts";
import { getSimlabStatus, listWorkspaceSimlabRuns, syncTargetWithRun } from "../_shared/simlab.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { run_id, workspace_id, limit = 20 } = await req.json() as {
      run_id?: string;
      workspace_id?: string;
      limit?: number;
    };

    const supabase = createServiceClient();

    if (run_id) {
      const status = await getSimlabStatus(supabase, run_id);
      await syncTargetWithRun(supabase, status.run);
      return safeJsonResponse({
        run: status.run,
        variants: status.variants,
        insight: status.insight,
      });
    }

    if (!workspace_id) {
      return safeJsonResponse({ error: "run_id ou workspace_id e obrigatorio." }, 400);
    }

    const runs = await listWorkspaceSimlabRuns(supabase, workspace_id, typeof limit === "number" ? limit : 20);
    for (const run of runs) {
      await syncTargetWithRun(supabase, run);
    }

    return safeJsonResponse({ runs });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
