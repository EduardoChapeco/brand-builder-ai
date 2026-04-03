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
      provider?: string;
      alias?: string | null;
      key_value?: string;
      daily_limit?: number;
      monthly_limit?: number;
    };

    const workspaceId = typeof body.workspace_id === "string" ? body.workspace_id : "";
    const provider = typeof body.provider === "string" ? body.provider.trim() : "";
    const keyValue = typeof body.key_value === "string" ? body.key_value.trim() : "";

    if (!workspaceId || !provider || !keyValue) {
      return safeJsonResponse({ error: "workspace_id, provider e key_value sao obrigatorios." }, 400);
    }

    const supabase = createServiceClient();
    const user = await validateWorkspaceAdminAccess(req, supabase, workspaceId);
    if (!user) {
      return safeJsonResponse({ error: "Acesso negado ao workspace." }, 403);
    }

    const appSecret = Deno.env.get("APP_ENCRYPTION_SECRET");
    if (!appSecret) {
      return safeJsonResponse({ error: "APP_ENCRYPTION_SECRET nao configurado." }, 500);
    }

    const { data, error } = await supabase.rpc("secure_store_api_key", {
      p_workspace_id: workspaceId,
      p_provider: provider,
      p_alias: typeof body.alias === "string" ? body.alias : null,
      p_key_value: keyValue,
      p_app_secret: appSecret,
      p_daily_limit: typeof body.daily_limit === "number" ? body.daily_limit : 200,
      p_monthly_limit: typeof body.monthly_limit === "number" ? body.monthly_limit : 5000,
    });

    if (error) throw error;

    const record = Array.isArray(data) ? data[0] : data;
    return safeJsonResponse(record ?? { ok: true });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
