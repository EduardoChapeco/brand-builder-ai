import { createServiceClient } from "./postgen.ts";

export type BioLinkSnapshot = Record<string, unknown>;

const asObject = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asArray = (value: unknown) => (Array.isArray(value) ? value : []);

export const buildBlockPayload = (row: Record<string, unknown>) => ({
  id: row.id,
  type: row.block_type,
  size: row.size || "XL",
  position: row.position || 0,
  isVisible: row.is_visible !== false,
  draftOnly: row.draft_only === true,
  layoutSlot: row.layout_slot || null,
  visibilityRules: asObject(row.visibility_rules),
  config: asObject(row.config),
});

export const buildSnapshotFromRows = (
  bioLink: Record<string, unknown>,
  blockRows: Array<Record<string, unknown>>,
): BioLinkSnapshot => ({
  id: bioLink.id,
  workspaceId: bioLink.workspace_id,
  slug: bioLink.slug,
  status: bioLink.status || "draft",
  displayName: bioLink.display_name || bioLink.slug,
  username: bioLink.username || bioLink.slug,
  bioText: bioLink.bio_text || "",
  avatarUrl: bioLink.avatar_url || null,
  headerConfig: asObject(bioLink.header_config),
  background: asObject(bioLink.background_config),
  themeKey: bioLink.theme_key || "brand-auto",
  themeTokens: asObject(bioLink.theme_tokens),
  layoutTemplateKey: bioLink.layout_template_key || "creator-standard",
  socialLinks: asArray(bioLink.social_links),
  cta: {
    enabled: bioLink.cta_enabled === true,
    text: bioLink.cta_text || "",
    url: bioLink.cta_url || "",
  },
  seo: {
    title: bioLink.seo_title || bioLink.display_name || bioLink.slug,
    description: bioLink.seo_description || bioLink.bio_text || "",
    imageUrl: bioLink.seo_image_url || null,
  },
  tracking: {
    metaPixelId: bioLink.meta_pixel_id || null,
    ga4MeasurementId: bioLink.ga4_measurement_id || null,
    tiktokPixelId: bioLink.tiktok_pixel_id || null,
    gtmId: bioLink.gtm_id || null,
  },
  blocks: blockRows
    .map(buildBlockPayload)
    .sort((a, b) => Number(a.position || 0) - Number(b.position || 0)),
  publishedAt: bioLink.published_at || null,
});

export const getBioLinkWithBlocks = async (workspaceId: string, bioLinkId: string) => {
  const supabase = createServiceClient();
  const [{ data: bioLink, error: bioLinkError }, { data: blocks, error: blocksError }] = await Promise.all([
    supabase.from("bio_links").select("*").eq("id", bioLinkId).eq("workspace_id", workspaceId).single(),
    supabase.from("bio_link_blocks").select("*").eq("bio_link_id", bioLinkId).order("position", { ascending: true }),
  ]);

  if (bioLinkError || !bioLink) throw bioLinkError || new Error("Bio Link não encontrado.");
  if (blocksError) throw blocksError;

  return {
    supabase,
    bioLink: bioLink as Record<string, unknown>,
    blocks: ((blocks || []) as Array<Record<string, unknown>>),
  };
};

export const getPublicBioLinkUrl = (slug: string) => {
  const appUrl = Deno.env.get("PUBLIC_APP_URL") || Deno.env.get("SITE_URL") || "http://localhost:8080";
  return `${appUrl.replace(/\/$/, "")}/${slug}`;
};

export const findOrCreateContact = async (params: {
  workspaceId: string;
  sourceRecordId: string;
  sourceBlockId?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  metadata?: Record<string, unknown>;
}) => {
  const supabase = createServiceClient();
  const email = params.email?.trim().toLowerCase() || null;

  if (email) {
    const { data: existing } = await supabase
      .from("crm_contacts")
      .select("*")
      .eq("workspace_id", params.workspaceId)
      .ilike("primary_email", email)
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from("crm_contacts")
        .update({
          name: params.name || existing.name,
          phone: params.phone || existing.phone,
          source_block_id: params.sourceBlockId || existing.source_block_id,
          metadata: {
            ...(asObject(existing.metadata)),
            ...(params.metadata || {}),
          },
          last_interaction_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("*")
        .single();

      if (updateError || !updated) throw updateError || new Error("Falha ao atualizar contato.");
      return { supabase, contact: updated as Record<string, unknown> };
    }
  }

  const { data: inserted, error } = await supabase
    .from("crm_contacts")
    .insert({
      workspace_id: params.workspaceId,
      name: params.name || null,
      primary_email: email,
      phone: params.phone || null,
      source_module: "bio_link",
      source_record_id: params.sourceRecordId,
      source_block_id: params.sourceBlockId || null,
      metadata: params.metadata || {},
      last_interaction_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !inserted) throw error || new Error("Falha ao criar contato.");
  return { supabase, contact: inserted as Record<string, unknown> };
};
