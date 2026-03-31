import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

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
    bg_prompt_hint: `Uma cena muito realista e cinemática sobre ${topic}, parte ${index + 1}.`,
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

    const [{ data: briefing }, { data: brandKit }] = await Promise.all([
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
    ]);

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
  "slides": [{"index":0,"type":"hook","headline":"string","body":"string","cta":"string|null (Apenas no último)","bg_prompt_hint":"string (Ideia mística/visual detalhada para imagem de fundo DESTE SLIDE apenas)"}],
  "caption": "string (Legenda profunda, instigante, que complementa e não repete o post)",
  "hashtags": "string (Até 5 hashtags estratégicas)"
}`;

    const userPrompt = `Topico: ${topic}
URL de origem: ${source_url || "nao informada"}
Use o briefing e o topico informado para criar conteudo.`;

    // Primary: Lovable AI Gateway
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
          return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Settings > Workspace > Usage." }), {
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
      } catch (e) {
        console.error("Lovable AI Gateway call failed:", e);
      }
    }

    // Fallback: demo response
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
