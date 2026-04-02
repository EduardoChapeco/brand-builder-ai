import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createServiceClient, safeJsonResponse } from "../_shared/postgen.ts";
import { getModulePolicy, listWorkspaceModulePolicies, upsertModulePolicy } from "../_shared/simlab.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, module_type, policy } = await req.json() as {
      workspace_id?: string;
      module_type?: string;
      policy?: Record<string, unknown>;
    };

    if (!workspace_id) {
      return safeJsonResponse({ error: "workspace_id e obrigatorio." }, 400);
    }

    const supabase = createServiceClient();

    if (policy && Object.keys(policy).length > 0) {
      if (!module_type) {
        return safeJsonResponse({ error: "module_type e obrigatorio para salvar policy." }, 400);
      }
      const saved = await upsertModulePolicy(supabase, workspace_id, module_type, policy);
      return safeJsonResponse({ policy: saved });
    }

    if (!module_type) {
      const policies = await listWorkspaceModulePolicies(supabase, workspace_id);
      return safeJsonResponse({ policies });
    }

    const current = await getModulePolicy(supabase, workspace_id, module_type);
    return safeJsonResponse({ policy: current });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
