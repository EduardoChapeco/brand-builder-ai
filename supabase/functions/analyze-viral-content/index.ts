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

function extractJson<T>(text: string): T {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();
  return JSON.parse(jsonStr) as T;
}

const fetchArticleContext = async (
  supabase: any,
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
        calls_today: ((key.calls_today as number) || 0) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", key.id as string);

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
    const { workspace_id, source_url, content_sample } = await req.json();

    if (!workspace_id || (!source_url && !content_sample)) {
      throw new Error("workspace_id and either source_url or content_sample are required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("Missing LOVABLE_API_KEY");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let articleContext = { title: '', markdown: '' };
    if (source_url) {
      const fetched = await fetchArticleContext(supabase, workspace_id, source_url);
      if (fetched?.markdown) {
         articleContext = { title: fetched.title || '', markdown: fetched.markdown };
      }
    } else if (content_sample) {
      articleContext = { title: 'Amostra Manual', markdown: content_sample };
    }

    if (!articleContext.markdown) {
      throw new Error("Não foi possível extrair conteúdo da URL ou a amostra estava vazia.");
    }

    const systemPrompt = `Você é um Estrategista de Conteúdo Viral focado em Redes Sociais.
MISSÃO: Analisar o conteúdo/artigo fornecido e extrair o DNA Viral dele, além de sugerir 3 ideias de posts derivados.

INSTRUÇÕES DE FORMATO DE SAÍDA EXCLUSIVO (JSON válido):
{
  "pattern_name": "Nome curto para este padrão",
  "archetype": "Mito vs Fato ou Hook_Reveal ou Numbered_Tips",
  "hook_structure": "A anatomia exata do gancho",
  "narrative_arc": ["Passo 1", "Passo 2", "Passo 3"],
  "visual_cues": ["Descrição visual 1"],
  "why_it_works": "Explicação neuromarketing",
  "suggestions": [
    {
      "topic": "Título sugerido adaptado ao nicho do usuário",
      "hook": "Gancho matador baseado no padrão extraído",
      "template_recommendation": "data-insight",
      "route": "../carousel-builder",
      "arc_type": "hook_reveal"
    }
  ]
}`;

    const userPrompt = `Analise este conteúdo extraído.
Título: ${articleContext.title || 'Desconhecido'}

CONTEÚDO:
${articleContext.markdown.slice(0, 15000) || 'Texto não encontrado'}

Extraia o padrão viral em formato JSON e crie 3 sugestões de posts derivadas desse padrão focado em conversão.`;

    const res = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.4,
        response_format: { type: "json_object" }
      }),
    });

    if (!res.ok) throw new Error(`AI Gateway Error: ${await res.text()}`);

    const aiData = await res.json();
    const rawContent = aiData.choices[0]?.message?.content;
    const parsedData = extractJson<any>(rawContent || "{}");

    // Insert into database
    const { error: insertError } = await supabase.from('viral_analyses').insert({
      workspace_id,
      source_url: source_url || 'Manual Entry',
      content_sample: articleContext?.markdown?.slice(0, 500) || '',
      hook_formula: parsedData.hook_structure || parsedData.pattern_name || 'Desconhecido',
      visual_style: parsedData.visual_cues?.[0] || '',
      engagement_notes: parsedData.why_it_works || '',
      content_type: parsedData.archetype || 'post',
      emotional_trigger: parsedData.pattern_name || ''
    });

    if (insertError) console.error("Could not insert analysis:", insertError);

    // Return format expected by ViralAnalyzer.tsx
    return new Response(JSON.stringify({ 
      analysis: parsedData,
      suggestions: parsedData.suggestions || []
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Analysis error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
