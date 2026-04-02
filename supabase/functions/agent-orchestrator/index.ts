import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAgentRun } from "../_shared/agent-runtime.ts";
import { corsHeaders, createServiceClient, safeJsonResponse } from "../_shared/postgen.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, prompt, module_type, mode = "balanced", config, squad_template_id, workspace_squad_id } = await req.json() as {
      workspace_id?: string;
      prompt?: string;
      module_type?: string;
      mode?: "fast" | "balanced" | "full";
      config?: Record<string, unknown>;
      squad_template_id?: string;
      workspace_squad_id?: string;
    };

    if (!workspace_id || !prompt || !module_type) {
      return safeJsonResponse({ error: "workspace_id, prompt e module_type sao obrigatorios." }, 400);
    }

    const supabase = createServiceClient();
    const prd = await createAgentRun(supabase, {
      workspaceId: workspace_id,
      moduleType: module_type,
      prompt,
      mode,
      config: config || {},
      squadTemplateId: squad_template_id,
      workspaceSquadId: workspace_squad_id,
      identification: {
        queued_by: "agent-orchestrator",
      },
    });

    return safeJsonResponse({
      prd_id: prd.id,
      status: prd.status,
      module_type: prd.module_type,
      mode: prd.mode,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
