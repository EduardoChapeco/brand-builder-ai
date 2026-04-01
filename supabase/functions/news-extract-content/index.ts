import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createServiceClient, safeJsonResponse, scrapeDomWithFirecrawl } from "../_shared/postgen.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, news_item_id } = await req.json() as {
      workspace_id?: string;
      news_item_id?: string;
    };

    if (!workspace_id || !news_item_id) {
      return safeJsonResponse({ error: "workspace_id e news_item_id sao obrigatorios." }, 400);
    }

    const supabase = createServiceClient();
    const { data: row, error } = await supabase
      .from("news_items")
      .select("*")
      .eq("id", news_item_id)
      .eq("workspace_id", workspace_id)
      .single();

    if (error || !row) {
      return safeJsonResponse({ error: "Noticia nao encontrada." }, 404);
    }

    const scraped = await scrapeDomWithFirecrawl(supabase, workspace_id, row.source_url);
    const contentMarkdown = scraped.markdown || row.description || "";

    const { data: updated, error: updateError } = await supabase
      .from("news_items")
      .update({
        content_markdown: contentMarkdown,
        content_extracted: true,
      })
      .eq("id", news_item_id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    return safeJsonResponse({
      item: updated,
      metadata: scraped.metadata,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
