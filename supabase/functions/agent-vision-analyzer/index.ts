import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

function extractJson<T>(text: string): T {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();
  return JSON.parse(jsonStr) as T;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  
  try {
    const { screenshotUrl } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada.");
    }

    console.log(`📡 Analisando imagem via Lovable AI: ${screenshotUrl}`);

    const prompt = `
      NOME DO AGENTE: "The Visionary"
      CURRÍCULO: Diretor de Arte Sênior, Psicanalista de Cores e Engenheiro de Frontend UI/UX.
      MISSÃO: Analisar o screenshot com extrema precisão técnica e conceitual.
      
      I. ANÁLISE PROFUNDA (PSICOLOGIA & DESIGN)
      1. Extraia a Paleta de Cores exata (HEX). Deduza o 'color_mood'.
      2. Raios de borda exatos (px), espaçamentos, Sombras e Efeitos Especiais.
      3. Tipografia: Identifique a escala e a vibe da fonte.
      4. Composição: Split-screen, card-centered, masonry, text-heavy editorial, image-heavy.
      5. Tom de Voz da Marca: Direto, provocativo, educacional compassivo, corporativo luxuoso.

      II. ENGENHARIA CSS/HTML
      Gere um html_template (PREMIUM) que seja a réplica do que você analisou.
      - CONTAINER BASE: <div class="artboard" style="position:relative; width:100%; height:100%; display:flex; flex-direction:column; background-color: var(--color-bg); overflow: hidden;">
      - Use variáveis CSS: var(--color-primary), var(--color-secondary), var(--color-accent), var(--color-bg), var(--color-text), var(--font-headline), var(--font-body), var(--radius), var(--shadow).
      - Marcações injetoras: <h1 data-postgen-field='headline'></h1>, <p data-postgen-field='body'></p>, <div data-postgen-field='cta'></div>.

      Retorne APENAS JSON estrito (sem backticks markdown):
      {
        "brand_dna": {
          "color_mood": "string",
          "color_palette": ["#...", "#..."],
          "typographic_scale": "string",
          "tone_of_voice": "string",
          "radius": "12px",
          "shadow": "0 8px 32px rgba(0,0,0,0.1)"
        },
        "layout": {
          "composition_grid": "string",
          "alignment": "center|left|right"
        },
        "html_template": "<div class='artboard'>...código completo aqui...</div>"
      }
    `;

    // Use Gemini multimodal via Lovable AI Gateway
    const res = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: screenshotUrl } },
            ],
          },
        ],
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI Gateway error [${res.status}]: ${errText}`);
    }

    const payload = await res.json();
    const content = payload?.choices?.[0]?.message?.content || "{}";
    const finalJson = extractJson(content);

    return new Response(JSON.stringify({ success: true, data: finalJson }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    console.error("Agent Vision Error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
