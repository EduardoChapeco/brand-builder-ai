import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createServiceClient, safeJsonResponse } from "../_shared/postgen.ts";
import { getPublicBioLinkUrl } from "../_shared/biolink.ts";

const asObject = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asArray = (value: unknown) => (Array.isArray(value) ? value : []);

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, biolink_id, version_id } = (await req.json()) as {
      workspace_id?: string;
      biolink_id?: string;
      version_id?: string;
    };

    if (!workspace_id || !biolink_id || !version_id) {
      return safeJsonResponse({ error: "workspace_id, biolink_id e version_id são obrigatórios." }, 400);
    }

    const supabase = createServiceClient();
    const { data: version, error: versionError } = await supabase
      .from("bio_link_versions")
      .select("*")
      .eq("id", version_id)
      .eq("bio_link_id", biolink_id)
      .eq("workspace_id", workspace_id)
      .single();

    if (versionError || !version) throw versionError || new Error("Versão não encontrada.");

    const snapshot = asObject(version.snapshot);
    const cta = asObject(snapshot.cta);
    const seo = asObject(snapshot.seo);
    const tracking = asObject(snapshot.tracking);

    const { error: rowError } = await supabase
      .from("bio_links")
      .update({
        status: "published",
        is_published: true,
        slug: String(snapshot.slug || ""),
        display_name: String(snapshot.displayName || snapshot.slug || ""),
        username: String(snapshot.username || snapshot.slug || ""),
        bio_text: String(snapshot.bioText || ""),
        avatar_url: snapshot.avatarUrl ? String(snapshot.avatarUrl) : null,
        header_config: asObject(snapshot.headerConfig),
        background_config: asObject(snapshot.background),
        theme_key: String(snapshot.themeKey || "brand-auto"),
        theme_tokens: asObject(snapshot.themeTokens),
        layout_template_key: String(snapshot.layoutTemplateKey || "creator-standard"),
        social_links: asArray(snapshot.socialLinks),
        cta_enabled: cta.enabled === true,
        cta_text: cta.text ? String(cta.text) : null,
        cta_url: cta.url ? String(cta.url) : null,
        seo_title: seo.title ? String(seo.title) : null,
        seo_description: seo.description ? String(seo.description) : null,
        seo_image_url: seo.imageUrl ? String(seo.imageUrl) : null,
        meta_pixel_id: tracking.metaPixelId ? String(tracking.metaPixelId) : null,
        ga4_measurement_id: tracking.ga4MeasurementId ? String(tracking.ga4MeasurementId) : null,
        tiktok_pixel_id: tracking.tiktokPixelId ? String(tracking.tiktokPixelId) : null,
        gtm_id: tracking.gtmId ? String(tracking.gtmId) : null,
        published_version_id: version.id,
        latest_version_number: Number(version.version_number || 1),
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", biolink_id)
      .eq("workspace_id", workspace_id);

    if (rowError) throw rowError;

    const { error: deleteBlocksError } = await supabase
      .from("bio_link_blocks")
      .delete()
      .eq("bio_link_id", biolink_id);
    if (deleteBlocksError) throw deleteBlocksError;

    const blocks = asArray(snapshot.blocks).map((item, index) => {
      const block = asObject(item);
      return {
        bio_link_id: biolink_id,
        workspace_id,
        block_type: String(block.type || "link_simple"),
        size: String(block.size || "XL"),
        config: asObject(block.config),
        position: typeof block.position === "number" ? block.position : index,
        is_visible: block.isVisible !== false,
        layout_slot: block.layoutSlot ? String(block.layoutSlot) : null,
        visibility_rules: asObject(block.visibilityRules),
        draft_only: block.draftOnly === true,
      };
    });

    if (blocks.length > 0) {
      const { error: insertBlocksError } = await supabase.from("bio_link_blocks").insert(blocks);
      if (insertBlocksError) throw insertBlocksError;
    }

    return safeJsonResponse({
      id: biolink_id,
      slug: String(snapshot.slug || ""),
      restored_version_id: version.id,
      public_url: getPublicBioLinkUrl(String(snapshot.slug || "")),
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
