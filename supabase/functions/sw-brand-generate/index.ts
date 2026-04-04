import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { workspace_id, briefing_data } = await req.json();

    if (!workspace_id) {
      throw new Error("workspace_id é obrigatório.");
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    
    // Fallback passivo caso a chave OpenRouter não esteja habilitada
    if (!OPENROUTER_API_KEY) {
      console.warn("OPENROUTER_API_KEY não encontrada, injetando brand template estático Simwork.");
      return new Response(JSON.stringify({
        success: true,
        data: {
          colors: {
            primary: "#1d4ed8",
            secondary: "#1e293b",
            accent: "#d97706",
            bg_dark: "#020617",
            bg_light: "#f8fafc",
            text_dark: "#0f172a",
            text_light: "#f1f5f9"
          },
          fonts: {
            heading: "Syne",
            body: "Inter",
            accent: "Space Grotesk"
          }
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um Diretor de Arte Sênior e UI/UX Designer da premiada agência Simwork.
Sua missão final é receber os dados puros (DNA Estratégico, Segmento e Público) de uma nova marca e convertê-los em uma estrutura tipográfica e paleta de cores (HEX) perfeitas e de alto nível para aplicações web com aspecto Dark Glassmorphism e Premium.
Responda APENAS através de um JSON estrito, pronto para ingest, sem blocos html ou markdown circundante.

A saída de cor deve ser harmoniosa. Use contrates altos.
Estrutura JSON Obrigatória:
{
  "colors": {
    "primary": "#HEX (Cor principal dominante)",
    "secondary": "#HEX (Cor de suporte sútil)",
    "accent": "#HEX (Chamada para ação - CTA)",
    "bg_dark": "#HEX (Tom super escuro de fundo)",
    "bg_light": "#HEX (Tom ultra claro de fundo)",
    "text_dark": "#HEX (Cor escura dominante para leitura clara)",
    "text_light": "#HEX (Levemente off-white para modo dark)"
  },
  "fonts": {
    "heading": "Qualquer fonte real do Google. Ex: Outfit, Syne, Clash Display...",
    "body": "Fonte alta leitura. Ex: Inter, Roboto, Plus Jakarta Sans",
    "accent": "Fonte detalhista. Ex: Space Grotesk, DM Mono"
  }
}`;

    const prompt = `Estude e baseie toda sua criação tipográfica e de cores nesse núcleo de identidade:
${JSON.stringify(briefing_data || { message: "Marca genérica querendo destaque máximo" })}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    const completion = await response.json();
    let resultData = {
       colors: { primary: "#0ea5e9", secondary: "#64748b", accent: "#f43f5e", bg_dark: "#020617", bg_light: "#f8fafc", text_dark: "#0f172a", text_light: "#f8fafc" },
       fonts: { heading: "Inter", body: "Inter", accent: "Inter" }
    };

    try {
      if (completion.choices && completion.choices[0]) {
        resultData = JSON.parse(completion.choices[0].message.content);
      }
    } catch(e) {
      console.error("Falha ao fazer parse do JSON LLaMA Diretório de Arte", e, completion);
    }

    return new Response(JSON.stringify({ success: true, data: resultData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
