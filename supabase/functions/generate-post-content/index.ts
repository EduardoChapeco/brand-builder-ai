import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const FIRECRAWL_API = "https://api.firecrawl.dev/v1/scrape";

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
  bg_prompt_hint: string;
};

type GeneratedPost = {
  post_title: string;
  slides: GeneratedSlide[];
  caption: string;
  hashtags: string;
};

const createDemoResponse = (topic: string, slideCount: number): GeneratedPost => ({
  post_title: topic,
  slides: Array.from({ length: slideCount }, (_, index) => ({
    index,
    type: index === 0 ? "hook" : "content",
    headline: index === 0 ? topic.slice(0, 40) : `Ponto ${index + 1}`,
    body: "Configure suas chaves de IA em Configuracoes.",
    cta: index === slideCount - 1 ? "Siga para mais" : null,
    bg_prompt_hint: `Uma cena editorial em alta definicao sobre ${topic}, parte ${index + 1}.`,
  })),
  caption: `${topic}\n\nComente sua opiniao abaixo!`,
  hashtags: "#ia #marketing #socialmedia #conteudo",
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
    ? candidate.slides.slice(0, slideCount).map((slide, index) => ({
      index,
      type: typeof slide?.type === "string" ? slide.type : index === 0 ? "hook" : "content",
      headline: typeof slide?.headline === "string" && slide.headline.trim()
        ? slide.headline.trim()
        : fallback.slides[index]?.headline || `Slide ${index + 1}`,
      body: typeof slide?.body === "string" ? slide.body.trim() : "",
      cta: typeof slide?.cta === "string" ? slide.cta.trim() : null,
      bg_prompt_hint: typeof slide?.bg_prompt_hint === "string" && slide.bg_prompt_hint.trim()
        ? slide.bg_prompt_hint.trim()
        : fallback.slides[index]?.bg_prompt_hint || topic,
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
  };
};

function extractJson<T>(text: string): T {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();
  return JSON.parse(jsonStr) as T;
}

const fetchArticleContext = async (
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  sourceUrl?: string | null,
): Promise<ArticleContext | null> => {
  if (!sourceUrl) return null;

  const { data: key } = await supabase
    .from("api_keys")
    .select("id,key_value,calls_today")
    .eq("workspace_id", workspaceId)
    .eq("provider", "firecrawl")
    .eq("is_active", true)
    .order("calls_today", { ascending: true })
    .maybeSingle();

  if (!key?.key_value) return null;

  try {
    const response = await fetch(FIRECRAWL_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key.key_value}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: sourceUrl,
        formats: ["markdown"],
      }),
    });

    if (!response.ok) return null;

    const payload = await response.json();
    const markdown = payload?.data?.markdown || payload?.markdown || "";
    const title = payload?.data?.metadata?.title || payload?.metadata?.title || null;

    await supabase
      .from("api_keys")
      .update({
        calls_today: (key.calls_today || 0) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", key.id);

    if (!markdown) return null;
    return { markdown, title };
  } catch (error) {
    console.error("Firecrawl scrape failed:", error);
    return null;
  }
};

serve(async (req: Request) => {
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const slideCount = Math.max(1, Math.min(Number(slides_count) || 1, 10));

    const [{ data: briefing }, { data: brandKit }, { data: recentPosts }] = await Promise.all([
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
      supabase
        .from("posts_v2")
        .select("caption")
        .eq("workspace_id", workspace_id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const articleContext = await fetchArticleContext(supabase, workspace_id, source_url);
    const recentCaptions = (recentPosts || [])
      .map((post) => post.caption)
      .filter(Boolean)
      .join("\n---\n");
    const recentPatterns = Array.isArray((briefing?.viral_patterns_cache as { recent_patterns?: unknown[] } | null)?.recent_patterns)
      ? (briefing?.viral_patterns_cache as { recent_patterns: unknown[] }).recent_patterns
      : [];

    let persona = "Estrategista de Marca de Elite";
    if (funnel_type === "Vendas") persona = "Head de Performance e NeuroCopy";
    else if (funnel_type === "Educativo") persona = "Professor Especialista";
    else if (funnel_type === "Engajamento") persona = "Social Media Estrategico";

    const systemPrompt = `NOME DO AGENTE: "${persona}"
MISSAO: Voce escreve copies curtas, escaneaveis e social-first para o workspace.
Empresa Cliente: ${briefing?.company_name || "Sua Empresa"}
Nicho/Segmento: ${briefing?.segment || ""}
Publico-Alvo: ${briefing?.target_audience || ""}
Diferencial Principal: ${briefing?.main_differentials || ""}
Pilares de Conteudo: ${JSON.stringify(briefing?.content_pillars || [])}
Tom de Voz Fundacional: ${briefing?.tone_of_voice || tone}
Tom selecionado: ${tone}
Formato geometrico: ${format}
Paleta de Marca: ${[brandKit?.color_primary, brandKit?.color_secondary, brandKit?.color_accent].filter(Boolean).join(", ")}
Padroes virais recentes do workspace: ${JSON.stringify(recentPatterns)}
Ultimas captions do workspace: ${recentCaptions || "sem historico"}

REGRAS:
- Escreva em Portugues BR.
- Slide 1 precisa ser hook forte com headline de no maximo 6 palavras.
- Headlines: maximo 6 palavras.
- Body: maximo 3-4 linhas curtas.
- CTA final coerente com o funil ${funnel_type}.
- Nao invente fatos; se houver artigo de referencia, use-o como base factual.
- Gere um bg_prompt_hint por slide, focado em fotografia/editorial, sem texto na imagem.

Formato de saida (JSON estrito):
{
  "post_title": "string",
  "slides": [{"index":0,"type":"hook","headline":"string","body":"string","cta":"string|null","bg_prompt_hint":"string"}],
  "caption": "string",
  "hashtags": "string"
}`;

    const userPrompt = `Topico: ${topic}
URL de origem: ${source_url || "nao informada"}
${articleContext?.title ? `Titulo do artigo: ${articleContext.title}` : ""}
${articleContext?.markdown ? `Artigo de referencia (markdown):\n${articleContext.markdown.slice(0, 12000)}` : ""}
Use o briefing, os padroes virais do workspace e o topico informado para criar conteudo.
Se houver artigo, use-o como contexto factual prioritario.`;

    if (LOVABLE_API_KEY) {
      try {
        const res = await fetch(AI_GATEWAY, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
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

        if (res.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns segundos." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (res.status === 402) {
          return new Response(JSON.stringify({ error: "Creditos de IA esgotados. Adicione creditos em Settings > Workspace > Usage." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (res.ok) {
          const payload = await res.json();
          const responseText = payload?.choices?.[0]?.message?.content || "{}";
          const result = normalizeGeneratedPost(extractJson(responseText), topic, slideCount);

          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.error("Lovable AI Gateway error:", res.status, await res.text());
      } catch (error) {
        console.error("Lovable AI Gateway call failed:", error);
      }
    }

    return new Response(JSON.stringify(createDemoResponse(topic, slideCount)), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
