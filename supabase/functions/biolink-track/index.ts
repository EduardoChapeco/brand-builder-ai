import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createServiceClient, safeJsonResponse } from "../_shared/postgen.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as Record<string, unknown>;
    const slug = typeof payload.slug === "string" ? payload.slug.trim() : "";
    const eventType = typeof payload.event_type === "string" ? payload.event_type.trim() : "";

    if (!slug || !eventType) {
      return safeJsonResponse({ error: "slug e event_type são obrigatórios." }, 400);
    }

    const supabase = createServiceClient();
    const { data: bioLink, error: bioLinkError } = await supabase
      .from("bio_links")
      .select("id, workspace_id, published_version_id, total_views, total_clicks")
      .eq("slug", slug)
      .maybeSingle();

    if (bioLinkError || !bioLink) throw bioLinkError || new Error("Bio Link não encontrado.");

    const insertPayload = {
      workspace_id: bioLink.workspace_id,
      module_type: "bio_link",
      record_type: "bio_link",
      record_id: bioLink.id,
      published_version_id: bioLink.published_version_id,
      slug,
      event_type: eventType,
      block_id: typeof payload.block_id === "string" ? payload.block_id : null,
      block_type: typeof payload.block_type === "string" ? payload.block_type : null,
      target_url: typeof payload.target_url === "string" ? payload.target_url : null,
      session_id: typeof payload.session_id === "string" ? payload.session_id : null,
      visitor_id: typeof payload.visitor_id === "string" ? payload.visitor_id : null,
      referrer: typeof payload.referrer === "string" ? payload.referrer : null,
      user_agent: typeof payload.user_agent === "string" ? payload.user_agent : null,
      device_type: typeof payload.device_type === "string" ? payload.device_type : null,
      country: typeof payload.country === "string" ? payload.country : null,
      city: typeof payload.city === "string" ? payload.city : null,
      utm_source: typeof payload.utm_source === "string" ? payload.utm_source : null,
      utm_medium: typeof payload.utm_medium === "string" ? payload.utm_medium : null,
      utm_campaign: typeof payload.utm_campaign === "string" ? payload.utm_campaign : null,
      metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {},
    };

    const { error } = await supabase.from("public_page_events").insert(insertPayload);
    if (error) throw error;

    if (eventType === "page_view") {
      await supabase
        .from("bio_links")
        .update({ total_views: Number((bioLink as Record<string, unknown>).total_views || 0) + 1 })
        .eq("id", bioLink.id);
    }
    if (eventType === "block_click" || eventType === "cta_conversion") {
      await supabase
        .from("bio_links")
        .update({ total_clicks: Number((bioLink as Record<string, unknown>).total_clicks || 0) + 1 })
        .eq("id", bioLink.id);
    }

    return safeJsonResponse({ ok: true, event_type: eventType });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
