import { fromTable } from "@/integrations/supabase/db-custom";
import { supabase } from "@/integrations/supabase/client";
import type { BrandKit, Briefing, Workspace } from "@/contexts/WorkspaceContext";
import {
  type BioLinkBlock,
} from "@/lib/biolink/registry";

export function slugifyBioLink(text: string) {
  return (text || "").toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export type BioLinkInsert = any;
export type BioLinkPublicSnapshot = any;
export type BioLinkRow = any;
export type BioLinkVersionRow = any;

export function buildBioLinkSnapshot(bioLink: any, blocks: any) { return { bioLink, blocks }; }
export function buildDefaultBioLinkDraft(props: any): any { 
  return { bioLink: { slug: props.workspaceSlug + '-link' }, blocks: [] }; 
}
export function normalizeBioLinkBlocks(blocks: any, legacy1: any, legacy2: any) { return blocks || []; }
export function safeJsonObject(obj: any) { return typeof obj === 'string' ? JSON.parse(obj) : obj; }
export function serializeBlockForInsert(b: any) { return b; }

// --- Mappers to bridge Legacy Domain to Canonical Simwork DB Schema ---

function canonicalizeBioLinkInsert(bioLink: BioLinkInsert, workspaceId: string) {
  return {
    id: bioLink.id,
    workspace_id: workspaceId,
    title: bioLink.display_name || "BioLink",
    slug: slugifyBioLink(bioLink.slug),
    status: bioLink.status || "draft",
    theme: {
      theme_key: bioLink.theme_key,
      theme_tokens: bioLink.theme_tokens,
      layout_template_key: bioLink.layout_template_key,
      background_config: bioLink.background_config,
    },
    settings: {
      bio_text: bioLink.bio_text,
      avatar_url: bioLink.avatar_url,
      header_config: bioLink.header_config,
      social_links: bioLink.social_links,
      cta_enabled: bioLink.cta_enabled,
      cta_text: bioLink.cta_text,
      cta_url: bioLink.cta_url,
      seo_title: bioLink.seo_title,
      seo_description: bioLink.seo_description,
      seo_image_url: bioLink.seo_image_url,
      meta_pixel_id: bioLink.meta_pixel_id,
      ga4_measurement_id: bioLink.ga4_measurement_id,
      tiktok_pixel_id: bioLink.tiktok_pixel_id,
      gtm_id: bioLink.gtm_id,
    },
    published_at: bioLink.published_at,
  };
}

function parseCanonicalBioLink(row: any): BioLinkRow {
  const theme = row.theme || {};
  const settings = row.settings || {};
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    slug: row.slug,
    status: row.status,
    display_name: row.title,
    theme_key: theme.theme_key,
    theme_tokens: theme.theme_tokens,
    layout_template_key: theme.layout_template_key,
    background_config: theme.background_config,
    bio_text: settings.bio_text,
    avatar_url: settings.avatar_url,
    header_config: settings.header_config,
    social_links: settings.social_links || [],
    cta_enabled: settings.cta_enabled,
    cta_text: settings.cta_text,
    cta_url: settings.cta_url,
    seo_title: settings.seo_title,
    seo_description: settings.seo_description,
    seo_image_url: settings.seo_image_url,
    meta_pixel_id: settings.meta_pixel_id,
    ga4_measurement_id: settings.ga4_measurement_id,
    tiktok_pixel_id: settings.tiktok_pixel_id,
    gtm_id: settings.gtm_id,
    published_at: row.published_at,
    published_version_id: null,
    latest_version_number: 1,
    username: row.slug,
    is_published: row.status === 'published',
  } as unknown as BioLinkRow;
}

function canonicalizeBlockInsert(bioLinkId: string, block: BioLinkBlock) {
  return {
    id: block.id,
    biolink_id: bioLinkId,
    type: block.type,
    content: block.config || {},
    order_index: block.position || 0,
    visible: block.isVisible !== false,
  };
}

function parseCanonicalBlock(row: any): any {
  return {
    id: row.id,
    bio_link_id: row.biolink_id,
    block_type: row.type,
    config: row.content,
    position: row.order_index,
    is_visible: row.visible,
    size: null,
    visibility_rules: {},
    draft_only: false,
    layout_slot: null,
  };
}

// --- Data Operations Layer ---

export type BioLinkWorkspaceState = {
  bioLink: BioLinkRow;
  blocks: BioLinkBlock[];
  versions: BioLinkVersionRow[];
};

export const loadWorkspaceBioLink = async (
  workspace: Workspace,
  brandKit: BrandKit | null,
  briefing: Briefing | null,
): Promise<BioLinkWorkspaceState> => {
  const { data: row, error } = await fromTable("sw_biolinks")
    .select("*")
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (error) throw error;

  let bioLinkRow: BioLinkRow;
  let legacyBlocks: any[] = [];

  if (!row) {
    const draft = buildDefaultBioLinkDraft({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      workspaceSlug: workspace.slug,
      brandKit,
      briefing,
    });

    const payload = canonicalizeBioLinkInsert(draft.bioLink, workspace.id);
    const { data: created, error: createError } = await fromTable("sw_biolinks").insert(payload).select().single();
    if (createError || !created) throw createError || new Error("Não foi possível inicializar o Bio Link.");

    const blockPayloads = draft.blocks.map((b) => canonicalizeBlockInsert(created.id, b));
    const { error: blockError } = await fromTable("sw_biolink_blocks").upsert(blockPayloads);
    if (blockError) throw blockError;

    bioLinkRow = parseCanonicalBioLink(created);
    legacyBlocks = (blockPayloads || []).map(parseCanonicalBlock);
  } else {
    bioLinkRow = parseCanonicalBioLink(row);

    const { data: blockRows, error: blocksError } = await fromTable("sw_biolink_blocks")
      .select("*")
      .eq("biolink_id", row.id)
      .order("order_index", { ascending: true });

    if (blocksError) throw blocksError;
    legacyBlocks = (blockRows || []).map(parseCanonicalBlock);
  }

  return {
    bioLink: bioLinkRow,
    blocks: normalizeBioLinkBlocks(legacyBlocks, (bioLinkRow as any).blocks, (bioLinkRow as any).links),
    versions: [],
  };
};

export const saveWorkspaceBioLink = async (params: {
  bioLinkId?: string | null;
  workspaceId: string;
  bioLink: BioLinkInsert;
  blocks: BioLinkBlock[];
}) => {
  const payload = canonicalizeBioLinkInsert(params.bioLink, params.workspaceId);

  let rowQuery;
  if (params.bioLinkId) {
    rowQuery = fromTable("sw_biolinks").update(payload).eq("id", params.bioLinkId).select().single();
  } else {
    rowQuery = fromTable("sw_biolinks").insert(payload).select().single();
  }

  const { data: row, error } = await rowQuery;
  if (error || !row) throw error || new Error("Falha ao salvar Bio Link.");

  const bioLinkRow = parseCanonicalBioLink(row);

  const normalizedBlocks = params.blocks.map((b, idx) => ({ ...b, position: idx }));
  const upsertPayload = normalizedBlocks.map((b) => canonicalizeBlockInsert(bioLinkRow.id, b));

  const { error: blockError } = await fromTable("sw_biolink_blocks").upsert(upsertPayload);
  if (blockError) throw blockError;

  const { data: dbBlocks } = await fromTable("sw_biolink_blocks").select("id").eq("biolink_id", bioLinkRow.id);
  const keepIds = new Set(normalizedBlocks.map((b) => b.id));
  const deleteIds = (dbBlocks || []).map((item: any) => item.id).filter((id: string) => !keepIds.has(id));
  
  if (deleteIds.length > 0) {
    await fromTable("sw_biolink_blocks").delete().in("id", deleteIds);
  }

  return { bioLink: bioLinkRow, blocks: normalizedBlocks };
};

export const publishBioLink = async (workspaceId: string, bioLinkId: string) => {
  // Triggers Edge Function as normally, as the Edge function can be updated independently to logic
  const { data, error } = await supabase.functions.invoke("biolink-publish", {
    body: { workspace_id: workspaceId, biolink_id: bioLinkId },
  });
  if (error) throw error;
  return data;
};

export const restoreBioLinkVersion = async (workspaceId: string, bioLinkId: string, versionId: string) => {
  const { data, error } = await supabase.functions.invoke("biolink-restore-version", {
    body: { workspace_id: workspaceId, biolink_id: bioLinkId, version_id: versionId },
  });
  if (error) throw error;
  return data;
};

export const loadPublishedBioLinkBySlug = async (slug: string): Promise<BioLinkPublicSnapshot | null> => {
  const { data: row, error } = await fromTable("sw_biolinks").select("*").eq("slug", slug).maybeSingle();
  if (error || !row) return null;

  if (row.status !== "published") return null;

  const bioLinkRow = parseCanonicalBioLink(row);

  const { data: blocks, error: blocksError } = await fromTable("sw_biolink_blocks")
    .select("*")
    .eq("biolink_id", row.id)
    .order("order_index", { ascending: true });
    
  if (blocksError) throw blocksError;

  const legacyBlocks = (blocks || []).map(parseCanonicalBlock);
  return buildBioLinkSnapshot(bioLinkRow, normalizeBioLinkBlocks(legacyBlocks, [], []));
};
