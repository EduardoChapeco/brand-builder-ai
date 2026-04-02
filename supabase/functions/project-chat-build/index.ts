import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, safeJsonResponse } from "../_shared/postgen.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  return safeJsonResponse(
    {
      error:
        "project-chat-build foi descontinuada para o fluxo de sites. Use agent-orchestrator com module_type=website_spec e aprove a spec antes de iniciar o website_build.",
      replacement: {
        create_spec: "agent-orchestrator",
        approve_spec: "agent-run-approve",
        execute_build: "agent-worker",
        check_status: "agent-status",
      },
    },
    410,
  );
});
