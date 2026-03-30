import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TopicItem = {
  title: string;
  description: string;
  url: string;
  source_name: string;
  published_at: string;
  source_type: "rss" | "ai";
};

type ApiKeyRow = {
  id: string;
  provider: "groq" | "openrouter" | "gemini";
  key_value: string;
  calls_today: number | null;
  daily_limit: number | null;
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

const incrementKeyUsage = async (
  supabase: ReturnType<typeof createClient>,
  key: ApiKeyRow,
) => {
  await supabase
    .from("api_keys")
    .update({
      calls_today: (key.calls_today || 0) + 1,
      last_used_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("id", key.id);
};

const markKeyError = async (
  supabase: ReturnType<typeof createClient>,
  keyId: string,
  message: string,
  exhausted = false,
) => {
  await supabase
    .from("api_keys")
    .update({
      calls_today: exhausted ? 99999 : undefined,
      last_error: message.slice(0, 500),
    })
    .eq("id", keyId);
};

const generateAiTopics = async (
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  segment?: string | null,
  audience?: string | null,
  tone?: string | null,
  funnelType?: string | null,
): Promise<TopicItem[]> => {
  const { data: keys } = await supabase
    .from("api_keys")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .in("provider", ["groq", "openrouter", "gemini"])
    .order("calls_today", { ascending: true })
    .limit(4);

  if (!keys?.length) return [];

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

  for (const key of keys as ApiKeyRow[]) {
    if ((key.calls_today || 0) >= (key.daily_limit || 0)) continue;

    try {
      let response: Response;

      if (key.provider === "groq") {
        response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${key.key_value}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
            max_tokens: 1000,
          }),
        });
      } else if (key.provider === "openrouter") {
        response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${key.key_value}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://postgen.app",
          },
          body: JSON.stringify({
            model: "meta-llama/llama-3.3-70b-instruct:free",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
          }),
        });
      } else {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${key.key_value}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.7,
                maxOutputTokens: 1000,
              },
            }),
          },
        );
      }

      if (response.status === 429) {
        await markKeyError(supabase, key.id, "429 Rate Limited", true);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${key.provider} ${response.status}: ${errorText}`);
      }

      const payload = await response.json();
      const responseText = key.provider === "gemini"
        ? payload?.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
        : payload?.choices?.[0]?.message?.content || "{}";

      const parsed = JSON.parse(responseText) as { topics?: Array<{ title?: string; description?: string }> };
      const topics = Array.isArray(parsed.topics) ? parsed.topics : [];

      await incrementKeyUsage(supabase, key);

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
      await markKeyError(
        supabase,
        key.id,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  return [];
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, funnel_type, tone } = await req.json();

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

    const aiTopicsPromise = generateAiTopics(
      supabase,
      workspace_id,
      briefing?.segment || null,
      briefing?.target_audience || null,
      tone || null,
      funnel_type || null,
    );

    const rssResults = feeds?.length
      ? await Promise.allSettled(
          feeds.map(async (feed) => {
            const response = await fetch(feed.url, {
              headers: { "User-Agent": "PostGen/1.0 RSS Reader" },
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const xml = await response.text();

            await supabase
              .from("rss_feeds")
              .update({ last_fetched_at: new Date().toISOString() })
              .eq("id", feed.id);

            return parseRssXml(xml, feed.name || feed.url);
          }),
        )
      : [];

    const rssTopics: TopicItem[] = [];
    for (const result of rssResults) {
      if (result.status === "fulfilled") {
        rssTopics.push(...result.value);
      }
    }

    rssTopics.sort((left, right) => {
      const leftDate = left.published_at ? new Date(left.published_at).getTime() : 0;
      const rightDate = right.published_at ? new Date(right.published_at).getTime() : 0;
      return rightDate - leftDate;
    });

    const aiTopics = await aiTopicsPromise;
    const combinedTopics = [...aiTopics, ...rssTopics].slice(0, 20);

    return new Response(JSON.stringify({
      topics: combinedTopics,
      message: combinedTopics.length ? null : "Nenhum feed RSS ou chave de IA configurados.",
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
