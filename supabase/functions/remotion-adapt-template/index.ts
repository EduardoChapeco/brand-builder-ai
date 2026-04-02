import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createServiceClient,
  readJsonBody,
  resolveTemplateByHint,
  resolveWorkspaceBrandBindings,
  safeJsonResponse,
  toOptionalText,
} from "../_shared/remotion.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await readJsonBody(req);
    const workspaceId = toOptionalText(body.workspace_id);
    if (!workspaceId) {
      return safeJsonResponse({ error: "workspace_id e obrigatorio." }, 400);
    }

    const supabase = createServiceClient();
    const source = await resolveTemplateByHint(supabase, workspaceId, body);
    const brand = await resolveWorkspaceBrandBindings(supabase, workspaceId);
    const name = toOptionalText(body.name) || `${source.name} Adapted`;

    const { data, error } = await supabase
      .from("remotion_templates")
      .insert({
        workspace_id: workspaceId,
        name,
        description: toOptionalText(body.description) || source.description,
        category: source.category,
        template_key: source.template_key,
        props_schema: source.props_schema,
        default_props: {
          ...(source.default_props || {}),
          brand,
        },
        renderer_contract: source.renderer_contract,
        tags: source.tags || [],
        is_system: false,
        is_public: false,
        is_active: true,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw error || new Error("Nao foi possivel criar a adaptacao do template Remotion.");
    }

    return safeJsonResponse({
      template_id: data.id,
      template: data,
      source_template_id: source.id,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
