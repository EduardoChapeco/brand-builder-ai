import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { computeNewsRelevance, dedupeByUrl, parseRssXml, type NewsCandidate } from "../_shared/news.ts";
import { corsHeaders, createServiceClient, safeJsonResponse } from "../_shared/postgen.ts";
import { buildNewsItemCCPContext, getCCPSnapshot } from "../_shared/ccp.ts";
import { dispatchSimlabRun } from "../_shared/simlab.ts";

type FeedRow = {
  id?: string;
  name?: string | null;
  url: string;
  category?: string | null;
};

type NewsItemRow = {
  id: string;
  workspace_id: string;
  rss_source_id: string | null;
  title: string;
  description: string;
  source_name: string;
  source_url: string;
  published_at: string | null;
  categories: string[];
  relevance_score: number;
  relevance_reason: string | null;
  status: string;
  ccp_context: Record<string, unknown>;
  blog_article_id?: string | null;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, limit_per_feed = 8, generate_drafts = false } = await req.json() as {
      workspace_id?: string;
      limit_per_feed?: number;
      generate_drafts?: boolean;
    };

    if (!workspace_id) {
      return safeJsonResponse({ error: "workspace_id e obrigatorio." }, 400);
    }

    const supabase = createServiceClient();
    const snap = await getCCPSnapshot(supabase, workspace_id);

    const [{ data: systemFeeds }, { data: workspaceFeeds }, { data: existingRows }] = await Promise.all([
      supabase.from("rss_sources").select("*").eq("status", "active").order("name"),
      supabase.from("rss_feeds").select("*").eq("workspace_id", workspace_id).eq("is_active", true).order("created_at"),
      supabase.from("rss_items").select("item_url").eq("workspace_id", workspace_id),
    ]);

    const feeds: FeedRow[] = [
      ...((systemFeeds || []) as FeedRow[]),
      ...((workspaceFeeds || []) as FeedRow[]),
    ];

    const existingUrls = new Set((existingRows as Array<{ item_url: string }> || []).map((item) => item.item_url));
    const collected: Array<NewsCandidate & { rss_source_id: string | null }> = [];
    const skipped = [];

    for (const feed of feeds) {
      try {
        const response = await fetch(feed.url, {
          headers: { "User-Agent": "PostGen/3.0 RSS Reader" },
        });
        if (!response.ok) {
          skipped.push({ feed: feed.url, reason: `HTTP ${response.status}` });
          continue;
        }

        const xml = await response.text();
        const parsed = parseRssXml(xml, feed.name || feed.url).slice(0, Math.max(1, Math.min(20, Number(limit_per_feed) || 8)));
        for (const item of parsed) {
          if (existingUrls.has(item.source_url)) {
            skipped.push({ feed: feed.url, reason: "duplicated", url: item.source_url });
            continue;
          }
          collected.push({
            ...item,
            rss_source_id: feed.id || null,
            categories: Array.from(new Set([feed.category, ...item.categories].filter(Boolean))) as string[],
          });
          existingUrls.add(item.source_url);
        }
      } catch (error) {
        skipped.push({ feed: feed.url, reason: error instanceof Error ? error.message : String(error) });
      }
    }

    const deduped = dedupeByUrl(collected).map((item) => {
      const relevance = computeNewsRelevance(item, snap);

      return {
        workspace_id,
        source_id: item.rss_source_id,
        title: item.title,
        description: item.description,
        item_url: item.source_url,
        published_at: item.published_at,
        categories: item.categories,
        relevance_score: relevance.score,
        relevance_reason: relevance.reason,
        status: relevance.score >= 60 ? "priority" : "new",
      };
    });

    let inserted: NewsItemRow[] = [];
    if (deduped.length > 0) {
      const { data, error } = await supabase
        .from("rss_items")
        .insert(deduped)
        .select("*");

      if (error) throw error;
      inserted = data || [];
    }

    if (generate_drafts && inserted.length > 0) {
      const draftRows = inserted
        .filter((item) => Number(item.relevance_score || 0) >= 70)
        .slice(0, 3)
        .map((item) => ({
          workspace_id,
          module_type: "news_brief",
          mode: "fast",
          status: "draft",
          original_prompt: `Gerar conteudo a partir da noticia: ${item.title}`,
          brand_context_hash: null,
          identification: { news_item_id: item.id, title: item.title },
          fragments: null,
          specialist_results: null,
          assembled_prd: null,
          qa_score: null,
          final_prompt: null,
        }));

      if (draftRows.length > 0) {
        await supabase.from("agent_prds").insert(draftRows);
      }
    }

    const validationCandidates = inserted
      .filter((item) => Number(item.relevance_score || 0) >= 70)
      .slice(0, 3);

    const simlabRuns = [];
    for (const item of validationCandidates) {
      const dispatch = await dispatchSimlabRun(supabase, {
        workspaceId: workspace_id,
        validationType: "trend",
        moduleType: "trend_signal",
        stimulusType: "news_signal",
        targetTable: "rss_items",
        targetId: item.id,
        objective: item.title,
        audienceHint: snap.audience || null,
        variants: [{
          key: "news_signal",
          label: item.title,
          artifact: {
            title: item.title,
            description: item.description,
            item_url: item.item_url,
            relevance_score: item.relevance_score,
            relevance_reason: item.relevance_reason,
            categories: item.categories,
          },
        }],
        requestPayload: {
          source_name: item.source_name,
          published_at: item.published_at,
        },
        contextPolicy: {
          classification: "opportunity_window",
        },
        requestedBy: "news_fetch",
        waitForCompletion: false,
      });

      simlabRuns.push({
        news_item_id: item.id,
        run_id: dispatch.run.id,
      });
    }

    return safeJsonResponse({
      inserted: inserted.length,
      skipped: skipped.length,
      scored: deduped.length,
      items: inserted,
      simlab_runs: simlabRuns,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
