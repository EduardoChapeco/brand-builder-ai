import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

type StrategyOutput = {
  format: "single" | "carousel";
  slides_count: number;
  template: string;
  theme: string;
  slide_structure: Array<{ index: number; type: string; key_message: string }>;
  cta: string;
  title: string;
};

type WriterOutput = {
  slides: Array<{ index: number; headline: string; body: string; cta: string | null }>;
  caption: string;
  hashtags: string;
};

type DesignerOutput = {
  slides_html: string[];
};

async function callAgent(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  model = "google/gemini-3-flash-preview"
): Promise<string> {
  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("RATE_LIMITED");
    if (res.status === 402) throw new Error("PAYMENT_REQUIRED");
    throw new Error(`AI gateway error [${res.status}]: ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

function extractJson<T>(text: string): T {
  // Try to extract JSON from markdown code blocks or raw text
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();
  return JSON.parse(jsonStr) as T;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { user_message, briefing } = await req.json();

    if (!user_message) {
      return new Response(
        JSON.stringify({ error: "user_message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const companyName = briefing?.company_name || "Minha Empresa";
    const segment = briefing?.segment || "tecnologia";
    const tone = briefing?.tone_of_voice || "profissional e direto";
    const audience = briefing?.target_audience || "profissionais e empreendedores";
    const primaryColor = briefing?.primary_color || "#7C3AED";
    const secondaryColor = briefing?.secondary_color || "#06B6D4";
    const brandDna = briefing?.brand_dna || "";
    const fontPref = briefing?.font_preference || "moderna";

    // ═══════════════════════════════════════
    // AGENT ARIA — Estrategista
    // ═══════════════════════════════════════
    console.log("🧭 Agent Aria starting...");

    const ariaSystem = `Você é Aria, uma estrategista de conteúdo para redes sociais.
Analise o pedido do usuário e defina a estrutura do post.
Contexto: Empresa "${companyName}", segmento "${segment}", tom "${tone}", público "${audience}".

Responda APENAS com JSON válido (sem markdown, sem explicações):
{
  "format": "single" | "carousel",
  "slides_count": number,
  "template": "minimal-dark" | "bold-color" | "editorial" | "data-card" | "testimonial" | "clean-white",
  "theme": string,
  "slide_structure": [{"index": number, "type": string, "key_message": string}],
  "cta": string,
  "title": string
}`;

    const ariaRaw = await callAgent(LOVABLE_API_KEY, ariaSystem, user_message);
    console.log("🧭 Aria raw:", ariaRaw.substring(0, 200));
    
    let ariaOutput: StrategyOutput;
    try {
      ariaOutput = extractJson<StrategyOutput>(ariaRaw);
    } catch {
      // Fallback structure
      ariaOutput = {
        format: "carousel",
        slides_count: 5,
        template: "minimal-dark",
        theme: user_message,
        title: "Post Gerado",
        slide_structure: [
          { index: 0, type: "capa", key_message: "Título principal" },
          { index: 1, type: "conteudo", key_message: "Ponto 1" },
          { index: 2, type: "conteudo", key_message: "Ponto 2" },
          { index: 3, type: "conteudo", key_message: "Ponto 3" },
          { index: 4, type: "cta", key_message: "Call to action" },
        ],
        cta: "Saiba mais!",
      };
    }

    // ═══════════════════════════════════════
    // AGENT BRUNO — Redator
    // ═══════════════════════════════════════
    console.log("✍️ Agent Bruno starting...");

    const brunoSystem = `Você é Bruno, redator especialista em redes sociais.
Crie textos persuasivos para cada slide de um post.
Empresa: "${companyName}". Tom: "${tone}". Público: "${audience}".
Diferenciais: "${briefing?.main_differentials || ''}".

Responda APENAS com JSON válido (sem markdown, sem explicações):
{
  "slides": [{"index": number, "headline": string, "body": string, "cta": string | null}],
  "caption": string,
  "hashtags": string
}`;

    const brunoContext = `Estrutura definida pela estrategista:\n${JSON.stringify(ariaOutput, null, 2)}\n\nPedido original do usuário: "${user_message}"`;
    const brunoRaw = await callAgent(LOVABLE_API_KEY, brunoSystem, brunoContext);
    console.log("✍️ Bruno raw:", brunoRaw.substring(0, 200));

    let brunoOutput: WriterOutput;
    try {
      brunoOutput = extractJson<WriterOutput>(brunoRaw);
    } catch {
      const count = ariaOutput.slides_count || 3;
      brunoOutput = {
        slides: Array.from({ length: count }, (_, i) => ({
          index: i,
          headline: i === 0 ? ariaOutput.title || "Post" : `Ponto ${i}`,
          body: ariaOutput.slide_structure?.[i]?.key_message || "Conteúdo do slide",
          cta: i === count - 1 ? ariaOutput.cta || "Saiba mais!" : null,
        })),
        caption: `${ariaOutput.theme || user_message}\n\nCriado por ${companyName}.`,
        hashtags: "#marketing #conteudo #design #postgen",
      };
    }

    // ═══════════════════════════════════════
    // AGENT CARLA — Designer HTML5
    // ═══════════════════════════════════════
    console.log("🎨 Agent Carla starting...");

    const templateGuide: Record<string, string> = {
      "minimal-dark": "Fundo escuro (#09090F ou #111119), tipografia grande branca, gradientes sutis, linhas finas decorativas.",
      "bold-color": `Fundo com a cor primária ${primaryColor}, texto branco, shapes geométricos, impactante e vibrante.`,
      "editorial": "Layout assimétrico, fundo com gradiente suave, texto overlay elegante, estilo magazine.",
      "data-card": "Grid clean, destaque em números grandes, fundo escuro, dados visuais com barras/circles CSS.",
      "testimonial": "Citação grande com aspas decorativas, fundo suave, nome e cargo abaixo.",
      "clean-white": `Fundo branco, moldura/borda colorida (${primaryColor}), tipografia serif elegante.`,
    };

    const template = ariaOutput.template || "minimal-dark";
    const templateDesc = templateGuide[template] || templateGuide["minimal-dark"];

    const fontMap: Record<string, string> = {
      moderna: "DM Sans",
      serifada: "Playfair Display",
      bold: "Space Grotesk",
      minimalista: "Inter",
    };
    const fontFamily = fontMap[fontPref] || "DM Sans";

    const carlaSystem = `Você é Carla, designer especialista em HTML5 para redes sociais.
Crie HTML5 auto-contido para cada slide de um post.

REGRAS OBRIGATÓRIAS:
- Cada slide deve ter EXATAMENTE width: 540px e height: 540px
- Todo CSS DEVE ser inline (style="...") ou em uma tag <style> DENTRO do HTML
- NÃO use classes CSS externas
- Use Google Fonts via @import dentro de <style>: @import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;500;600;700;800&display=swap');
- Fonte principal: '${fontFamily}', sans-serif
- NÃO use imagens externas (use gradientes CSS, shapes, emojis, unicode symbols)
- O HTML deve ser visualmente rico, moderno e profissional
- Use position: absolute/relative para layout preciso
- Cores da marca: primária ${primaryColor}, secundária ${secondaryColor}
- Template: "${template}" — ${templateDesc}
${brandDna ? `- DNA da marca: ${brandDna}` : ""}

Responda APENAS com JSON válido (sem markdown, sem explicações):
{
  "slides_html": ["<div style=\\"width:540px;height:540px;...\\">...</div>", ...]
}`;

    const carlaContext = `Textos do redator:\n${JSON.stringify(brunoOutput.slides, null, 2)}\n\nTema: ${ariaOutput.theme}\nFormato: ${ariaOutput.format}, ${ariaOutput.slides_count} slides`;
    const carlaRaw = await callAgent(LOVABLE_API_KEY, carlaSystem, carlaContext);
    console.log("🎨 Carla raw:", carlaRaw.substring(0, 200));

    let carlaOutput: DesignerOutput;
    try {
      carlaOutput = extractJson<DesignerOutput>(carlaRaw);
    } catch {
      // Emergency fallback: generate basic slides
      const count = brunoOutput.slides.length;
      carlaOutput = {
        slides_html: brunoOutput.slides.map((s, i: number) => {
          const isFirst = i === 0;
          const isLast = i === count - 1;
          return `<div style="width:540px;height:540px;background:${isFirst || isLast ? `linear-gradient(135deg,${primaryColor} 0%,#1a1a2e 100%)` : '#111119'};display:flex;flex-direction:column;justify-content:center;padding:60px;font-family:'${fontFamily}',sans-serif;color:white;position:relative;overflow:hidden;">
            <div style="position:absolute;top:-60px;right:-60px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,0.05);"></div>
            ${!isFirst ? `<div style="font-size:13px;color:${secondaryColor};letter-spacing:2px;text-transform:uppercase;margin-bottom:16px;">Slide ${i + 1}</div>` : ''}
            <div style="font-size:${isFirst ? 38 : 30}px;font-weight:700;line-height:1.3;margin-bottom:20px;${isFirst ? 'text-align:center;' : ''}">${s.headline}</div>
            <div style="font-size:16px;color:#94a3b8;line-height:1.7;${isFirst ? 'text-align:center;' : ''}">${s.body}</div>
            ${s.cta ? `<div style="margin-top:32px;padding:14px 32px;background:white;color:${primaryColor};border-radius:50px;font-weight:700;font-size:15px;display:inline-block;${isFirst || isLast ? 'align-self:center;' : ''}">${s.cta}</div>` : ''}
            <div style="position:absolute;bottom:40px;left:60px;right:60px;height:3px;background:linear-gradient(90deg,${primaryColor},transparent);border-radius:2px;"></div>
          </div>`;
        }),
      };
    }

    // ═══════════════════════════════════════
    // COMPOSE FINAL RESPONSE
    // ═══════════════════════════════════════
    console.log("✅ All agents done, composing response");

    const result = {
      post: {
        title: ariaOutput.title || "Post Gerado",
        format: ariaOutput.format || "carousel",
        slides_html: carlaOutput.slides_html,
        caption: brunoOutput.caption,
        hashtags: brunoOutput.hashtags,
        template: template,
        slides_count: carlaOutput.slides_html.length,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("orchestrate-post error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";

    if (message === "RATE_LIMITED") {
      return new Response(
        JSON.stringify({ error: "Os agentes estão sobrecarregados. Tente novamente em alguns segundos." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (message === "PAYMENT_REQUIRED") {
      return new Response(
        JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Settings > Workspace > Usage." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
