import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

type TopicItem = {
  title: string;
  description: string;
  url: string;
  source_name: string;
  published_at: string;
  source_type: "rss" | "ai";
};

const parseRssXml = (xml: string, sourceName: string): TopicItem[] => {
  const items: TopicItem[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null && items.length < 8) {
    const itemContent = match[1];
    const getTagValue = (tag: string) => {
      const pattern = new RegExp(
        `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,
        "i",
      );
      return (pattern.exec(itemContent)?.[1] || "").trim();
    };

    const title = getTagValue("title");
    const link = getTagValue("link") || getTagValue("guid");

    if (!title || !link) continue;

    items.push({
      title,
      description: getTagValue("description").replace(/<[^>]+>/g, "").slice(0, 200),
      url: link,
      source_name: sourceName,
      published_at: getTagValue("pubDate") || getTagValue("dc:date") || "",
      source_type: "rss",
    });
  }

  return items;
};

function extractJson<T>(text: string): T {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();
  return JSON.parse(jsonStr) as T;
}

const generateAiTopics = async (
  apiKey: string,
  segment?: string | null,
  audience?: string | null,
  tone?: string | null,
  funnelType?: string | null,
): Promise<TopicItem[]> => {
  const systemPrompt = `Voce sugere topicos de social media em Portugues BR.
Responda apenas com JSON valido no formato:
{
  "topics": [
    { "title": "string", "description": "string" }
  ]
}
Regras:
- gere exatamente 5 topicos
- titulos curtos e claros
- descricoes com no maximo 160 caracteres
- foco em relevancia pratica e gancho de conteudo`;

  const userPrompt = `Segmento: ${segment || "geral"}
Publico: ${audience || "nao informado"}
Tom: ${tone || "informativo"}
Objetivo de funil: ${funnelType || "Awareness"}
Liste 5 topicos relevantes para posts e carrosseis.`;

  try {
    const res = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      console.error("AI Gateway error for topics:", res.status);
      return [];
    }

    const payload = await res.json();
    const responseText = payload?.choices?.[0]?.message?.content || "{}";
    const parsed = extractJson<{ topics?: Array<{ title?: string; description?: string }> }>(responseText);
    const topics = Array.isArray(parsed.topics) ? parsed.topics : [];

    return topics
      .filter(topic => typeof topic.title === "string" && topic.title.trim())
      .slice(0, 5)
      .map(topic => ({
        title: topic.title!.trim(),
        description: typeof topic.description === "string" ? topic.description.trim() : "",
        url: "",
        source_name: "Sugestao IA",
        published_at: new Date().toISOString(),
        source_type: "ai" as const,
      }));
  } catch (error) {
    console.error("AI topic generation failed:", error);
    return [];
  }
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, funnel_type, tone } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [{ data: feeds }, { data: briefing }] = await Promise.all([
      supabase
        .from("rss_feeds")
        .select("*")
        .eq("workspace_id", workspace_id)
        .eq("is_active", true),
      supabase
        .from("briefings")
        .select("segment,target_audience")
        .eq("workspace_id", workspace_id)
        .maybeSingle(),
    ]);

    // AI Topics via Lovable AI Gateway
    let aiTopics: TopicItem[] = [];
    if (LOVABLE_API_KEY) {
      aiTopics = await generateAiTopics(
        LOVABLE_API_KEY,
        briefing?.segment || null,
        briefing?.target_audience || null,
        tone || null,
        funnel_type || null,
      );
    }

    // RSS Topics
    let rssTopics: TopicItem[] = [];
    if (feeds?.length) {
      const rssResults = await Promise.allSettled(
        feeds.map(async (feed) => {
          const response = await fetch(feed.url, {
            headers: { "User-Agent": "PostGen/1.0 RSS Reader" },
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const xml = await response.text();
          return parseRssXml(xml, feed.name || feed.url);
        }),
      );

      for (const result of rssResults) {
        if (result.status === "fulfilled") {
          rssTopics.push(...result.value);
        }
      }
    }

    rssTopics.sort((left, right) => {
      const leftDate = left.published_at ? new Date(left.published_at).getTime() : 0;
      const rightDate = right.published_at ? new Date(right.published_at).getTime() : 0;
      return rightDate - leftDate;
    });

    const combinedTopics = [...aiTopics, ...rssTopics].slice(0, 20);

    return new Response(JSON.stringify({
      topics: combinedTopics,
      message: combinedTopics.length ? null : "Nenhum feed RSS configurado e IA indisponível.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      topics: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
