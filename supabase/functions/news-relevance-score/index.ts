import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { computeNewsRelevance } from "../_shared/news.ts";
import { corsHeaders, createServiceClient, getBrandContext, safeJsonResponse } from "../_shared/postgen.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, news_item_id, article } = await req.json() as {
      workspace_id?: string;
      news_item_id?: string;
      article?: {
        title?: string;
        description?: string;
        categories?: string[];
        published_at?: string | null;
      };
    };

    if (!workspace_id || (!news_item_id && !article)) {
      return safeJsonResponse({ error: "workspace_id e news_item_id ou article sao obrigatorios." }, 400);
    }

    const supabase = createServiceClient();
    const brandContext = await getBrandContext(supabase, workspace_id);

    let target = article;
    if (news_item_id) {
      const { data: row, error } = await supabase
        .from("news_items")
        .select("title, description, categories, published_at")
        .eq("id", news_item_id)
        .eq("workspace_id", workspace_id)
        .single();

      if (error || !row) {
        return safeJsonResponse({ error: "news_item nao encontrado." }, 404);
      }

      target = {
        title: row.title || "",
        description: row.description || "",
        categories: Array.isArray(row.categories) ? row.categories as string[] : [],
        published_at: row.published_at,
      };
    }

    const result = computeNewsRelevance(
      {
        title: target?.title || "",
        description: target?.description || "",
        categories: Array.isArray(target?.categories) ? target?.categories : [],
        published_at: target?.published_at || null,
      },
      {
        segment: typeof brandContext.briefing?.segment === "string" ? brandContext.briefing.segment : null,
        target_audience: typeof brandContext.briefing?.target_audience === "string" ? brandContext.briefing.target_audience : null,
        pain_points: typeof brandContext.briefing?.pain_points === "string" ? brandContext.briefing.pain_points : null,
        main_differentials: typeof brandContext.briefing?.main_differentials === "string" ? brandContext.briefing.main_differentials : null,
        keywords: Array.isArray(brandContext.briefing?.keywords) ? brandContext.briefing.keywords as string[] : [],
        content_pillars: Array.isArray(brandContext.briefing?.content_pillars)
          ? brandContext.briefing.content_pillars as Array<{ name?: string; description?: string }>
          : [],
      },
    );

    return safeJsonResponse(result);
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
