import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAgentRunStatus } from "../_shared/agent-runtime.ts";
import { corsHeaders, createServiceClient, safeJsonResponse } from "../_shared/postgen.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prd_id } = await req.json() as {
      prd_id?: string;
    };

    if (!prd_id) {
      return safeJsonResponse({ error: "prd_id e obrigatorio." }, 400);
    }

    const supabase = createServiceClient();
    const status = await getAgentRunStatus(supabase, prd_id);
    return safeJsonResponse(status);
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
