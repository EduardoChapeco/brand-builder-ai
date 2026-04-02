import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, safeJsonResponse } from "../_shared/postgen.ts";
import { buildSnapshotFromRows, getBioLinkWithBlocks, getPublicBioLinkUrl } from "../_shared/biolink.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, biolink_id } = (await req.json()) as {
      workspace_id?: string;
      biolink_id?: string;
    };

    if (!workspace_id || !biolink_id) {
      return safeJsonResponse({ error: "workspace_id e biolink_id são obrigatórios." }, 400);
    }

    const { supabase, bioLink, blocks } = await getBioLinkWithBlocks(workspace_id, biolink_id);
    const snapshot = buildSnapshotFromRows(
      {
        ...bioLink,
        status: "published",
        published_at: new Date().toISOString(),
      },
      blocks,
    );

    const nextVersionNumber = Number(bioLink.latest_version_number || 0) + 1;
    const { data: version, error: versionError } = await supabase
      .from("bio_link_versions")
      .insert({
        bio_link_id: String(bioLink.id),
        workspace_id,
        version_number: nextVersionNumber,
        status: "published",
        snapshot,
        summary: "Published from Bio Link Builder",
      })
      .select("*")
      .single();

    if (versionError || !version) throw versionError || new Error("Não foi possível criar a versão publicada.");

    const { data: updated, error: updateError } = await supabase
      .from("bio_links")
      .update({
        status: "published",
        is_published: true,
        published_version_id: version.id,
        latest_version_number: nextVersionNumber,
        published_at: snapshot.publishedAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", biolink_id)
      .eq("workspace_id", workspace_id)
      .select("id, slug, published_version_id, latest_version_number, published_at")
      .single();

    if (updateError || !updated) throw updateError || new Error("Não foi possível atualizar o estado publicado.");

    return safeJsonResponse({
      id: updated.id,
      slug: updated.slug,
      version_id: updated.published_version_id,
      version_number: updated.latest_version_number,
      published_at: updated.published_at,
      public_url: getPublicBioLinkUrl(updated.slug),
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
