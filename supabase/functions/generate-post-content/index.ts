import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ApiKeyRow = {
  id: string;
  provider: string;
  key_value: string;
  calls_today: number | null;
  daily_limit: number | null;
};

type ArticleContext = {
  markdown: string;
  title?: string | null;
};

type GeneratedSlide = {
  index: number;
  type: string;
  headline: string;
  body: string;
  cta?: string | null;
};

type GeneratedPost = {
  post_title: string;
  slides: GeneratedSlide[];
  caption: string;
  hashtags: string;
  bg_prompt_hint: string;
};

const createDemoResponse = (topic: string, slideCount: number): GeneratedPost => ({
  post_title: topic,
  slides: Array.from({ length: slideCount }, (_, index) => ({
    index,
    type: index === 0 ? "hook" : "content",
    headline: index === 0 ? topic.slice(0, 40) : `Ponto ${index + 1}`,
    body: "Configure suas chaves de IA em Configuracoes.",
    cta: index === slideCount - 1 ? "Siga para mais" : null,
  })),
  caption: `${topic}\n\nComente sua opiniao abaixo!`,
  hashtags: "#ia #marketing #socialmedia #conteudo",
  bg_prompt_hint: topic,
});

const normalizeGeneratedPost = (
  raw: unknown,
  topic: string,
  slideCount: number,
): GeneratedPost => {
  if (!raw || typeof raw !== "object") {
    return createDemoResponse(topic, slideCount);
  }

  const candidate = raw as Partial<GeneratedPost>;
  const fallback = createDemoResponse(topic, slideCount);
  const slides = Array.isArray(candidate.slides) && candidate.slides.length > 0
    ? candidate.slides
        .slice(0, slideCount)
        .map((slide, index) => ({
          index,
          type: typeof slide?.type === "string" ? slide.type : index === 0 ? "hook" : "content",
          headline: typeof slide?.headline === "string" && slide.headline.trim()
            ? slide.headline.trim()
            : fallback.slides[index]?.headline || `Slide ${index + 1}`,
          body: typeof slide?.body === "string" ? slide.body.trim() : "",
          cta: typeof slide?.cta === "string" ? slide.cta.trim() : null,
        }))
    : fallback.slides;

  return {
    post_title: typeof candidate.post_title === "string" && candidate.post_title.trim()
      ? candidate.post_title.trim()
      : fallback.post_title,
    slides,
    caption: typeof candidate.caption === "string" && candidate.caption.trim()
      ? candidate.caption.trim()
      : fallback.caption,
    hashtags: typeof candidate.hashtags === "string" && candidate.hashtags.trim()
      ? candidate.hashtags.trim()
      : fallback.hashtags,
    bg_prompt_hint: typeof candidate.bg_prompt_hint === "string" && candidate.bg_prompt_hint.trim()
      ? candidate.bg_prompt_hint.trim()
      : fallback.bg_prompt_hint,
  };
};

const markKeyError = async (
  supabase: ReturnType<typeof createClient>,
  keyId: string,
  error: string,
  exhausted = false,
) => {
  await supabase
    .from("api_keys")
    .update({
      calls_today: exhausted ? 99999 : undefined,
      last_error: error.slice(0, 500),
    })
    .eq("id", keyId);
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

const fetchArticleContext = async (
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  sourceUrl?: string,
): Promise<ArticleContext | null> => {
  if (!sourceUrl) return null;

  const { data: firecrawlKeys } = await supabase
    .from("api_keys")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("provider", "firecrawl")
    .eq("is_active", true)
    .order("calls_today", { ascending: true })
    .limit(3);

  if (!firecrawlKeys?.length) return null;

  for (const key of firecrawlKeys as ApiKeyRow[]) {
    if ((key.calls_today || 0) >= (key.daily_limit || 0)) continue;

    try {
      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key.key_value}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: sourceUrl,
          formats: ["markdown"],
          onlyMainContent: true,
          maxAge: 0,
        }),
      });

      if (response.status === 429) {
        await markKeyError(supabase, key.id, "429 Rate Limited", true);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Firecrawl ${response.status}: ${errorText}`);
      }

      const payload = await response.json();
      const markdown = payload?.data?.markdown;

      await incrementKeyUsage(supabase, key);

      if (typeof markdown === "string" && markdown.trim()) {
        return {
          markdown: markdown.slice(0, 12000),
          title: payload?.data?.metadata?.title || null,
        };
      }
    } catch (error) {
      await markKeyError(supabase, key.id, String(error));
    }
  }

  return null;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      workspace_id,
      topic,
      funnel_type,
      tone,
      format,
      slides_count,
      source_url,
    } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const slideCount = Math.max(1, Math.min(Number(slides_count) || 1, 10));

    const [{ data: briefing }, { data: brandKit }, articleContext] = await Promise.all([
      supabase
        .from("briefings")
        .select("*")
        .eq("workspace_id", workspace_id)
        .maybeSingle(),
      supabase
        .from("brand_kits")
        .select("*")
        .eq("workspace_id", workspace_id)
        .maybeSingle(),
      fetchArticleContext(supabase, workspace_id, source_url),
    ]);

    const { data: keys } = await supabase
      .from("api_keys")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("is_active", true)
      .in("provider", ["groq", "openrouter", "gemini"])
      .order("calls_today", { ascending: true })
      .limit(6);

    if (!keys?.length) {
      return new Response(JSON.stringify(createDemoResponse(topic, slideCount)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `NOME DO AGENTE: "The Copywriter"
MISSÃO: Você é o CMO e o Especialista Supremo em Copywriting Persuasivo (Social Media) de uma agência de luxo.
Empresa Cliente: ${briefing?.company_name || "Sua Empresa"}
Nicho/Segmento: ${briefing?.segment || ""}
Público-Alvo: ${briefing?.target_audience || ""}
Diferencial Principal: ${briefing?.main_differentials || ""}
Pilares de Conteúdo: ${JSON.stringify(briefing?.content_pillars || [])}
Tom de Voz Fundacional: ${briefing?.tone_of_voice || tone}
Modificador de Tom Selecionado: ${tone}
Formato Geométrico: ${format}

I. FRAMEWORK APLICADO AOS SLIDES (${slideCount} slides):
- Você deve estruturar o carrossel/post usando o framework AIDA (Atenção, Interesse, Desejo, Ação) ou PAS (Problema, Agitação, Solução).
- SLIDE 1 (HOOK): DEVE conter um "Hook" brutal, violento ou profundamente magnético na \`headline\` (máximo 5-6 palavras impactantes). Nunca comece de forma morna.
- SLIDES DO MEIO (RETENÇÃO): Crie cadência de leitura. Frases oxigenadas. Entregue o valor prometido de forma mastigada, utilizando o Modificador de Tom.
- SLIDE FINAL (CTA): Chamada para ação cirúrgica alinhada ao Funil: ${funnel_type}. Sem clichês.

II. REGRAS CRÍTICAS DE TEXTO:
- Idioma OBRIGATÓRIO: Português do Brasil (PT-BR).
- Limite de \`headline\`: Máx. 6 palavras por slide. Sem exceções.
- Limite de \`body\`: Máx. 3 linhas de 6 a 8 palavras cada (leitura escaneável).
- NUNCA invente fatos, siga as fontes dadas ou conceitos reais do nicho.
- Tom de Voz: ${tone} (Respeite rigorosamente esta assinatura emocional).

Formato de saída (JSON ESTRITO - sem crases):
{
  "post_title": "string (Gatilho da Ideia Central)",
  "slides": [{"index":0,"type":"hook","headline":"string","body":"string","cta":"string|null (Apenas no último)"}],
  "caption": "string (Legenda profunda, instigante, que complementa e não repete o post)",
  "hashtags": "string (Até 5 hashtags estratégicas)",
  "bg_prompt_hint": "string (Ideia mística/visual para fundo Midjourney)"
}`;

    const articleSection = articleContext?.markdown
      ? `\n\nArtigo de referencia (${articleContext.title || source_url}):\n${articleContext.markdown}`
      : "";

    const userPrompt = `Topico: ${topic}
URL de origem: ${source_url || "nao informada"}
${articleContext ? "Use o artigo como base principal do conteudo." : "Use apenas o briefing e o topico informado."}${articleSection}`;

    let result: GeneratedPost | null = null;

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
              max_tokens: 2000,
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
                  maxOutputTokens: 2000,
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

        result = normalizeGeneratedPost(JSON.parse(responseText), topic, slideCount);
        await incrementKeyUsage(supabase, key);
        break;
      } catch (error) {
        await markKeyError(supabase, key.id, String(error));
      }
    }

    if (!result) {
      throw new Error("Todas as chaves falharam ou estao esgotadas.");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
