/**
 * src/lib/biolink/service.ts
 * SDD-1.0 — SW-020: BioLink Service
 * 
 * REGRA: Usa EXCLUSIVAMENTE as tabelas canônicas:
 *   - publications (type = 'biolink')
 *   - publication_blocks
 * 
 * NÃO usar: sw_biolinks, sw_biolink_blocks, bio_links (tabelas legadas extintas)
 */
import { supabase } from "@/lib/supabase";
import type { Publication, PublicationBlock } from "@/types/app.types";

// Re-export types that BioLinkPage and hook expect
export type BioLinkRow = Publication & {
  // Extended local state for the editor
  theme_id?: string;
  display_name?: string;
};
export type BioLinkVersionRow = { id: string; created_at: string };

export type BioLinkBlock = {
  id: string;
  publication_id: string;
  workspace_id: string;
  type: string;
  config: Record<string, unknown>;
  position: number;
  isVisible: boolean;
};

export type BioLinkInsert = Partial<BioLinkRow>;

export type BioLinkWorkspaceState = {
  bioLink: BioLinkRow;
  blocks: BioLinkBlock[];
  versions: BioLinkVersionRow[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function slugifyBioLink(text: string): string {
  return (text || "")
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

function blockRowToLocal(row: PublicationBlock): BioLinkBlock {
  return {
    id: row.id,
    publication_id: row.publication_id,
    workspace_id: row.workspace_id,
    type: row.block_type,
    config: row.content as Record<string, unknown>,
    position: row.position,
    isVisible: row.is_active,
  };
}

// ─── Load ─────────────────────────────────────────────────────────────────────

export async function loadWorkspaceBioLink(
  workspace: { id: string; name: string; slug: string },
  _brandKit: unknown,
  _briefing: unknown,
): Promise<BioLinkWorkspaceState> {
  // 1. Find or create the biolink publication for this workspace
  const { data: existing, error: findError } = await supabase
    .from("publications")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("type", "biolink")
    .maybeSingle();

  if (findError) throw new Error(`[SW-020] Erro ao carregar Bio Link: ${findError.message}`);

  let bioLinkRow: Publication;

  if (!existing) {
    // Create default biolink for this workspace
    const defaultSlug = slugifyBioLink(workspace.slug || workspace.name);
    const { data: created, error: createError } = await supabase
      .from("publications")
      .insert({
        workspace_id: workspace.id,
        type: "biolink",
        name: `Bio Link - ${workspace.name}`,
        slug: defaultSlug,
        status: "draft",
        config: {
          theme_id: "dark",
          display_name: workspace.name,
          bio_text: "",
          avatar_url: null,
          social_links: [],
          background_config: {},
        },
        seo: {},
      })
      .select()
      .single();

    if (createError || !created) {
      throw new Error(`[SW-020] Não foi possível criar o Bio Link: ${createError?.message}`);
    }
    bioLinkRow = created;
  } else {
    bioLinkRow = existing;
  }

  // 2. Load blocks for this publication
  const { data: blockRows, error: blocksError } = await supabase
    .from("publication_blocks")
    .select("*")
    .eq("publication_id", bioLinkRow.id)
    .eq("workspace_id", workspace.id)
    .order("position", { ascending: true });

  if (blocksError) throw new Error(`[SW-020] Erro ao carregar blocos: ${blocksError.message}`);

  const blocks = (blockRows || []).map(blockRowToLocal);

  // Map config fields as extended props for the editor
  const config = bioLinkRow.config as Record<string, unknown>;
  const bioLink: BioLinkRow = {
    ...bioLinkRow,
    theme_id: (config.theme_id as string) || "dark",
    display_name: (config.display_name as string) || bioLinkRow.name,
  };

  return { bioLink, blocks, versions: [] };
}

// ─── Save ─────────────────────────────────────────────────────────────────────

export async function saveWorkspaceBioLink(params: {
  bioLinkId: string | null;
  workspaceId: string;
  bioLink: BioLinkRow;
  blocks: BioLinkBlock[];
}): Promise<BioLinkWorkspaceState> {
  const { bioLinkId, workspaceId, bioLink, blocks } = params;

  // Build config from editor state
  const configUpdate = {
    theme_id: bioLink.theme_id || "dark",
    display_name: bioLink.display_name || bioLink.name,
    bio_text: (bioLink.config as Record<string, unknown>)?.bio_text || "",
    avatar_url: (bioLink.config as Record<string, unknown>)?.avatar_url || null,
    social_links: (bioLink.config as Record<string, unknown>)?.social_links || [],
    background_config: (bioLink.config as Record<string, unknown>)?.background_config || {},
  };

  // 1. Upsert the publication row
  let savedRow: Publication;
  if (bioLinkId) {
    const { data, error } = await supabase
      .from("publications")
      .update({
        name: bioLink.name,
        slug: slugifyBioLink(bioLink.slug || ""),
        config: configUpdate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bioLinkId)
      .eq("workspace_id", workspaceId)
      .select()
      .single();
    if (error || !data) throw new Error(`[SW-020] Erro ao salvar: ${error?.message}`);
    savedRow = data;
  } else {
    throw new Error("[SW-020] bioLinkId é necessário para salvar");
  }

  // 2. Delete all existing blocks and re-insert in order
  await supabase
    .from("publication_blocks")
    .delete()
    .eq("publication_id", bioLinkId)
    .eq("workspace_id", workspaceId);

  if (blocks.length > 0) {
    const blockInserts = blocks.map((b, i) => ({
      id: b.id,
      publication_id: bioLinkId,
      workspace_id: workspaceId,
      block_type: b.type,
      position: i,
      content: b.config,
      is_active: b.isVisible !== false,
    }));

    const { error: blockError } = await supabase
      .from("publication_blocks")
      .upsert(blockInserts);

    if (blockError) throw new Error(`[SW-020] Erro ao salvar blocos: ${blockError.message}`);
  }

  // 3. Reload blocks
  const { data: reloaded } = await supabase
    .from("publication_blocks")
    .select("*")
    .eq("publication_id", bioLinkId)
    .order("position", { ascending: true });

  const config = savedRow.config as Record<string, unknown>;
  const bioLinkOut: BioLinkRow = {
    ...savedRow,
    theme_id: (config.theme_id as string) || "dark",
    display_name: (config.display_name as string) || savedRow.name,
  };

  return {
    bioLink: bioLinkOut,
    blocks: (reloaded || []).map(blockRowToLocal),
    versions: [],
  };
}

// ─── Publish ──────────────────────────────────────────────────────────────────

export async function publishBioLink(workspaceId: string, publicationId: string): Promise<void> {
  const { error } = await supabase
    .from("publications")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
    })
    .eq("id", publicationId)
    .eq("workspace_id", workspaceId);

  if (error) throw new Error(`[SW-020] Erro ao publicar: ${error.message}`);
}

// ─── Public Snapshot (for /b/:slug route) ────────────────────────────────────

export async function loadBioLinkPublicSnapshot(slug: string) {
  const { data: pub, error } = await supabase
    .from("publications")
    .select("*")
    .eq("slug", slug)
    .eq("type", "biolink")
    .eq("status", "published")
    .maybeSingle();

  if (error) throw new Error(`[SW-020] Erro na página pública: ${error.message}`);
  if (!pub) return null;

  const { data: blocks } = await supabase
    .from("publication_blocks")
    .select("*")
    .eq("publication_id", pub.id)
    .eq("is_active", true)
    .order("position", { ascending: true });

  return { publication: pub, blocks: blocks || [] };
}
