import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createServiceClient,
  readJsonBody,
  safeJsonResponse,
  toOptionalText,
} from "../_shared/remotion.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminToken = Deno.env.get("REMOTION_ADMIN_TOKEN");
    if (!adminToken) {
      return safeJsonResponse({ error: "REMOTION_ADMIN_TOKEN nao configurado." }, 501);
    }

    const body = await readJsonBody(req);
    const providedToken = toOptionalText(body.admin_token);
    if (providedToken !== adminToken) {
      return safeJsonResponse({ error: "Acesso negado." }, 403);
    }

    const supabase = createServiceClient();
    const refreshedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from("remotion_component_presets")
      .select("id, metadata")
      .eq("is_system", true);

    if (error) throw error;

    for (const preset of data || []) {
      await supabase
        .from("remotion_component_presets")
        .update({
          metadata: {
            ...(preset.metadata || {}),
            bundle_refreshed_at: refreshedAt,
            bundle_reason: toOptionalText(body.reason) || "manual_admin_refresh",
          },
          updated_at: refreshedAt,
        })
        .eq("id", preset.id);
    }

    return safeJsonResponse({
      refreshed_at: refreshedAt,
      presets_updated: (data || []).length,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
