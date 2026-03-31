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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { rawForm } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada.");
    }

    const systemPrompt = `
      NOME DO AGENTE: "The Identity Engineer"
      CURRÍCULO: Especialista em Arquétipos Junguianos, Estrategista de Marca e Head of Branding.
      MISSÃO: Transformar um briefing básico (raso) de um cliente em um "Brand DNA" extremamente denso, acionável e psicológico.

      DADOS BRUTOS DO CLIENTE:
      Nome/Empresa: ${rawForm.name}
      Segmento: ${rawForm.segment}
      Público Alvo: ${rawForm.targetAudience}
      Tom desejado: ${rawForm.tone}
      Diferenciais: ${rawForm.differentials}

      ANALISE ESTA MARCA. Sua missão é deduzir peças vitais do DNA de conteúdo que nortearão toda a cópia futura.

      Saia com APENAS um JSON estrito, nos moldes literais abaixo, sem crases de formatação markdown:
      {
        "archetype": "string (ex: O Mago, O Herói, O Rebelde - com uma breve justificativa)",
        "content_pillars": ["string", "string", "string"],
        "hook_patterns": ["string (Técnica agressiva/magnética 1)", "string (Técnica agressiva/magnética 2)"],
        "emoji_usage": "string (ex: Minimalista, Usar '🚀🔥' para excitar, nenhum emoji para manter luxo)",
        "tone_of_voice_expanded": "string (Um manual prático de 2 frases pro Copywriter saber agir)"
      }
    `;

    const res = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }],
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

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const finalJson = extractJson(content);

    return new Response(JSON.stringify({ success: true, deep_dna: finalJson }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: unknown) {
    console.error("Agent Identity Engineer Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
