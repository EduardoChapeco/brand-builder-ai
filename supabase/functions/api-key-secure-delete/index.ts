import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createServiceClient, safeJsonResponse } from "../_shared/postgen.ts";
import { validateWorkspaceAdminAccess } from "../_shared/workspace-access.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as {
      workspace_id?: string;
      key_id?: string;
    };

    const workspaceId = typeof body.workspace_id === "string" ? body.workspace_id : "";
    const keyId = typeof body.key_id === "string" ? body.key_id : "";

    if (!workspaceId || !keyId) {
      return safeJsonResponse({ error: "workspace_id e key_id sao obrigatorios." }, 400);
    }

    const supabase = createServiceClient();
    const user = await validateWorkspaceAdminAccess(req, supabase, workspaceId);
    if (!user) {
      return safeJsonResponse({ error: "Acesso negado ao workspace." }, 403);
    }

    const { error } = await supabase
      .from("api_keys")
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
      })
      .eq("id", keyId)
      .eq("workspace_id", workspaceId);

    if (error) throw error;
    return safeJsonResponse({ ok: true, key_id: keyId });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
