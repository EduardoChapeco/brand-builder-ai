import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { workspaceId, rawForm } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get an active LLM key from the workspace (Prefer Groq or OpenRouter or Gemini)
    const { data: keys } = await supabase
      .from("api_keys")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .in("provider", ["groq", "openrouter", "gemini"])
      .order("calls_today", { ascending: true })
      .limit(1);

    if (!keys || keys.length === 0) {
      throw new Error("Nenhuma chave LLM configurada para o Agente de Identidade.");
    }
    const key = keys[0];

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

    let finalJson: Record<string, unknown> | undefined;

    if (key.provider === "groq") {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${key.key_value}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: systemPrompt }],
          response_format: { type: "json_object" },
          temperature: 0.7
        })
      });
      const data = await response.json();
      finalJson = JSON.parse(data.choices[0].message.content);

    } else if (key.provider === "openrouter") {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${key.key_value}`, "Content-Type": "application/json", "HTTP-Referer": "https://brandbuilder.ai" },
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-70b-instruct:free",
          messages: [{ role: "system", content: systemPrompt }],
          response_format: { type: "json_object" },
          temperature: 0.7
        })
      });
      const data = await response.json();
      finalJson = JSON.parse(data.choices[0].message.content);

    } else {
      // Gemini
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${key.key_value}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.7 }
          })
        }
      );
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      finalJson = JSON.parse(text);
    }

    // Registrar sucesso da chave
    await supabase.from("api_keys").update({
      calls_today: (key.calls_today || 0) + 1,
      last_used_at: new Date().toISOString()
    }).eq("id", key.id);

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
