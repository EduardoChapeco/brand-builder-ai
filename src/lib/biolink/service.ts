import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import type { BrandKit, Briefing, Workspace } from "@/contexts/WorkspaceContext";
import {
  type BioLinkBlock,
  type BioLinkInsert,
  type BioLinkPublicSnapshot,
  type BioLinkRow,
  type BioLinkVersionRow,
  buildBioLinkSnapshot,
  buildDefaultBioLinkDraft,
  normalizeBioLinkBlocks,
  safeJsonObject,
  serializeBlockForInsert,
  slugifyBioLink,
} from "@/lib/biolink/registry";

type BioLinkClient = SupabaseClient<Database>;

// Explicit column selects — avoids loading heavy legacy JSONB on every request
const BIO_LINK_COLUMNS = [
  "id",
  "workspace_id",
  "slug",
  "status",
  "display_name",
  "username",
  "bio_text",
  "avatar_url",
  "header_config",
  "background_config",
  "theme_key",
  "theme_tokens",
  "layout_template_key",
  "social_links",
  "cta_enabled",
  "cta_text",
  "cta_url",
  "seo_title",
  "seo_description",
  "seo_image_url",
  "meta_pixel_id",
  "ga4_measurement_id",
  "tiktok_pixel_id",
  "gtm_id",
  "published_at",
  "published_version_id",
  "latest_version_number",
  // Legacy columns still needed for normalization / first-time backfill
  "profile",
  "links",
  "blocks",
  "theme_id",
  "theme_config",
  "seo_config",
  "is_published",
].join(",");

const BIO_LINK_BLOCK_COLUMNS = [
  "id",
  "bio_link_id",
  "workspace_id",
  "block_type",
  "size",
  "config",
  "position",
  "is_visible",
  "layout_slot",
  "visibility_rules",
  "draft_only",
  "created_at",
  "updated_at",
].join(",");

export type BioLinkWorkspaceState = {
  bioLink: BioLinkRow;
  blocks: BioLinkBlock[];
  versions: BioLinkVersionRow[];
};

const ensureBuilderRecord = async (
  client: BioLinkClient,
  workspace: Workspace,
  brandKit: BrandKit | null,
  briefing: Briefing | null,
) => {
  const draft = buildDefaultBioLinkDraft({
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    workspaceSlug: workspace.slug,
    brandKit,
    briefing,
  });

  const { data, error } = await client.from("bio_links").insert(draft.bioLink).select(BIO_LINK_COLUMNS).single();
  if (error || !data) throw error || new Error("Não foi possível inicializar o Bio Link.");

  const payload = draft.blocks.map((block) => serializeBlockForInsert(data.id, workspace.id, block));
  const { error: blockError } = await client.from("bio_link_blocks").upsert(payload);
  if (blockError) throw blockError;

  return { bioLink: data as unknown as BioLinkRow, blocks: draft.blocks };
};

export const loadWorkspaceBioLink = async (
  workspace: Workspace,
  brandKit: BrandKit | null,
  briefing: Briefing | null,
  client: BioLinkClient = supabase,
): Promise<BioLinkWorkspaceState> => {
  const { data: bioLink, error } = await client
    .from("bio_links")
    .select(BIO_LINK_COLUMNS)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (error) throw error;

  if (!bioLink) {
    const created = await ensureBuilderRecord(client, workspace, brandKit, briefing);
    return { bioLink: created.bioLink, blocks: created.blocks, versions: [] };
  }

  const [{ data: blockRows, error: blocksError }, { data: versions, error: versionsError }] = await Promise.all([
    client
      .from("bio_link_blocks")
      .select(BIO_LINK_BLOCK_COLUMNS)
      .eq("bio_link_id", (bioLink as unknown as BioLinkRow).id)
      .order("position", { ascending: true }),
    client
      .from("bio_link_versions")
      .select("id,bio_link_id,workspace_id,version_number,status,summary,created_at,created_by")
      .eq("bio_link_id", (bioLink as unknown as BioLinkRow).id)
      .order("version_number", { ascending: false })
      .limit(20),
  ]);

  if (blocksError) throw blocksError;
  if (versionsError) throw versionsError;

  const row = bioLink as unknown as BioLinkRow;
  return {
    bioLink: row,
    blocks: normalizeBioLinkBlocks(blockRows || [], row.blocks, row.links),
    versions: (versions || []) as unknown as BioLinkVersionRow[],
  };
};

export const saveWorkspaceBioLink = async (params: {
  bioLinkId?: string | null;
  workspaceId: string;
  bioLink: BioLinkInsert;
  blocks: BioLinkBlock[];
  client?: BioLinkClient;
}) => {
  const client = params.client || supabase;
  const payload: BioLinkInsert = {
    ...params.bioLink,
    slug: slugifyBioLink(params.bioLink.slug),
    social_links: params.bioLink.social_links ?? [],
  };

  const rowQuery = params.bioLinkId
    ? client.from("bio_links").update(payload).eq("id", params.bioLinkId).select(BIO_LINK_COLUMNS).single()
    : client.from("bio_links").insert(payload).select(BIO_LINK_COLUMNS).single();

  const { data: row, error } = await rowQuery;
  if (error || !row) throw error || new Error("Falha ao salvar Bio Link.");

  const bioLinkRow = row as unknown as BioLinkRow;

  const normalizedBlocks = params.blocks.map((block, index) => ({ ...block, position: index }));
  const upsertPayload = normalizedBlocks.map((block) => serializeBlockForInsert(bioLinkRow.id, params.workspaceId, block));

  const { error: blockError } = await client.from("bio_link_blocks").upsert(upsertPayload);
  if (blockError) throw blockError;

  // Prune blocks removed in the editor
  const { data: dbBlocks, error: currentBlocksError } = await client
    .from("bio_link_blocks")
    .select("id")
    .eq("bio_link_id", bioLinkRow.id);
  if (currentBlocksError) throw currentBlocksError;

  const keepIds = new Set(normalizedBlocks.map((block) => block.id));
  const deleteIds = (dbBlocks || []).map((item) => item.id).filter((id) => !keepIds.has(id));
  if (deleteIds.length > 0) {
    const { error: deleteError } = await client.from("bio_link_blocks").delete().in("id", deleteIds);
    if (deleteError) throw deleteError;
  }

  return { bioLink: bioLinkRow, blocks: normalizedBlocks };
};

export const publishBioLink = async (workspaceId: string, bioLinkId: string) => {
  const { data, error } = await supabase.functions.invoke("biolink-publish", {
    body: {
      workspace_id: workspaceId,
      biolink_id: bioLinkId,
    },
  });
  if (error) throw error;
  return data as {
    id: string;
    slug: string;
    version_id: string;
    version_number: number;
    public_url: string;
    published_at: string;
  };
};

export const restoreBioLinkVersion = async (workspaceId: string, bioLinkId: string, versionId: string) => {
  const { data, error } = await supabase.functions.invoke("biolink-restore-version", {
    body: {
      workspace_id: workspaceId,
      biolink_id: bioLinkId,
      version_id: versionId,
    },
  });
  if (error) throw error;
  return data as {
    id: string;
    slug: string;
    restored_version_id: string;
    public_url: string;
  };
};

export const loadPublishedBioLinkBySlug = async (slug: string, client: BioLinkClient = supabase): Promise<BioLinkPublicSnapshot | null> => {
  // Allow any status — if a published_version_id exists we serve that snapshot
  // even if the workspace later moved back to draft
  const { data: row, error } = await client
    .from("bio_links")
    .select(BIO_LINK_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!row) return null;

  const bioLinkRow = row as unknown as BioLinkRow;

  // If there is a published snapshot, always serve it (even if status is now draft)
  if (bioLinkRow.published_version_id) {
    const { data: version, error: versionError } = await client
      .from("bio_link_versions")
      .select("id,snapshot,status")
      .eq("id", bioLinkRow.published_version_id)
      .maybeSingle();

    if (versionError) throw versionError;
    if (version?.snapshot) {
      return safeJsonObject(version.snapshot) as unknown as BioLinkPublicSnapshot;
    }
  }

  // No published version — only show if status = published
  if (bioLinkRow.status !== "published") return null;

  const { data: blocks, error: blocksError } = await client
    .from("bio_link_blocks")
    .select(BIO_LINK_BLOCK_COLUMNS)
    .eq("bio_link_id", bioLinkRow.id)
    .order("position", { ascending: true });
  if (blocksError) throw blocksError;

  return buildBioLinkSnapshot(bioLinkRow, normalizeBioLinkBlocks(blocks || [], bioLinkRow.blocks, bioLinkRow.links));
};
