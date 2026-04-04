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
    const { workspace_id, form_data } = await req.json();

    if (!workspace_id) {
      throw new Error("workspace_id é obrigatório.");
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    
    // Fallback de segurança se o ambiente não tiver a chave (MOCK inteligente local)
    if (!OPENROUTER_API_KEY) {
      console.warn("OPENROUTER_API_KEY não encontrada, usando mock estático temporário.");
      return new Response(JSON.stringify({
        success: true,
        data: {
          brand_dna: "O Destemido Cativante - Uma marca que não tem medo de inovar e desafiar o status quo de seu segmento.",
          tone_of_voice: "Direto, visionário, transparente e sempre com linguagem acessível ao cliente moderno.",
          main_differentials: "1. Agilidade absoluta de implementação.\\n2. Foco irrestrito em design atraente.\\n3. Suporte hiper-humanizado e disponível.",
          content_pillars: [
            "Educação e Tendências de Mercado",
            "Casos de Sucesso Incontestáveis",
            "Bastidores e Cultura Transparente da Marca"
          ]
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um Estrategista Sênior de Marcas da agência de alto luxo Simwork.
Sua missão é expandir os dados básicos do briefing de uma empresa fornecendo um DNA de Marca coeso, maduro e magnético.
O usuário enviará os fragmentos como: nome, segmento, público-alvo ou diferenciais rasos.
Responda APENAS através de um JSON estrito, sem mais nenhuma frase ou markdown de acompanhamento.

Estrutura JSON Obrigatória:
{
  "brand_dna": "Uma frase de alto impacto contendo um arquétipo sugerido e uma breve filosofia.",
  "tone_of_voice": "1 a 2 frases elaborando o tom de texto a ser usado.",
  "main_differentials": "3 bullet-points elaborados, destacando por que eles dominariam a concorrência.",
  "content_pillars": ["Pilar 1 bem definido", "Pilar 2 focado em venda", "Pilar 3 sobre autoridade"]
}`;

    const prompt = `Nome: ${form_data.company_name || 'Desconhecido'}
Segmento: ${form_data.segment || 'Software / Serviço SaaS'}
Público Alvo: ${form_data.target_audience || 'Demografia geral'}
Outras notas crúas: ${JSON.stringify(form_data)}`;

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
       brand_dna: "Erro ao gerar DNA profundo.",
       tone_of_voice: "Tons de erro identificados.",
       main_differentials: "Verifique conexão LLM.",
       content_pillars: []
    };

    try {
      if (completion.choices && completion.choices[0]) {
        resultData = JSON.parse(completion.choices[0].message.content);
      }
    } catch(e) {
      console.error("Falha ao fazer parse do JSON LLaMA", e, completion);
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
