import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createServiceClient, listWorkspaceKeys, markKeyUsage, runJsonTask, safeJsonResponse } from "../_shared/postgen.ts";

const fetchFirecrawlMarkdown = async (
  supabase: ReturnType<typeof createServiceClient>,
  workspaceId: string,
  sourceUrl: string,
) => {
  const keys = await listWorkspaceKeys(supabase, workspaceId, ["firecrawl"]);
  for (const key of keys) {
    if ((key.calls_today || 0) >= (key.daily_limit || 0)) continue;
    try {
      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
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

      if (!response.ok) {
        throw new Error(`Firecrawl ${response.status}: ${await response.text()}`);
      }

      const payload = await response.json();
      await markKeyUsage(supabase, key);
      return payload?.data?.markdown as string | undefined;
    } catch (error) {
      await markKeyUsage(supabase, key, { errorMessage: error instanceof Error ? error.message : String(error) });
    }
  }
  return null;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      workspace_id,
      source_url,
      source_account,
      content_sample,
    } = await req.json() as {
      workspace_id?: string;
      source_url?: string;
      source_account?: string;
      content_sample?: string;
    };

    if (!workspace_id || (!source_url && !content_sample)) {
      return safeJsonResponse({ error: "workspace_id e source_url ou content_sample sao obrigatorios." }, 400);
    }

    const supabase = createServiceClient();
    const { data: briefing } = await supabase
      .from("briefings")
      .select("*")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    const scrapedMarkdown = source_url ? await fetchFirecrawlMarkdown(supabase, workspace_id, source_url) : null;
    const sourceText = [content_sample, scrapedMarkdown].filter(Boolean).join("\n\n");
    const preview = sourceText.slice(0, 1000);

    const fallbackAnalysis = {
      hook_formula: "Pergunta forte seguida de contraste de resultado",
      visual_style: "Contraste alto, texto dominante, camada de prova visual",
      emotional_trigger: "curiosidade",
      content_type: "problem_solution",
      engagement_notes: "Use CTA simples de comentario ou salvamento.",
      patterns_extracted: {
        caption_length: "medium",
        cta_style: "salve ou comente",
        posting_time_pattern: "horario comercial",
      },
    };

    const analysis = await runJsonTask<{
      hook_formula?: string;
      visual_style?: string;
      emotional_trigger?: string;
      content_type?: string;
      engagement_notes?: string;
      patterns_extracted?: Record<string, unknown>;
      suggestions?: Array<{
        topic: string;
        hook_formula: string;
        template_recommendation: string;
        prompt_hint: string;
      }>;
    }>(
      supabase,
      workspace_id,
      `Voce extrai padroes virais de posts em Portugues BR.
Responda apenas JSON valido:
{
  "hook_formula":"string",
  "visual_style":"string",
  "emotional_trigger":"string",
  "content_type":"string",
  "engagement_notes":"string",
  "patterns_extracted":{"caption_length":"string","cta_style":"string","posting_time_pattern":"string"},
  "suggestions":[
    {"topic":"string","hook_formula":"string","template_recommendation":"string","prompt_hint":"string"}
  ]
}
Regras:
- sintetize a formula do hook
- descreva o estilo visual em linguagem acionavel
- gere 3 sugestoes para o workspace`,
      `Segmento do workspace: ${briefing?.segment || "nao informado"}
Pilar de conteudo: ${JSON.stringify(briefing?.content_pillars || [])}
Conteudo analisado:
${preview || source_url || ""}`,
      ["groq", "openrouter", "gemini"],
      {
        ...fallbackAnalysis,
        suggestions: [
          {
            topic: `Como aplicar ${briefing?.segment || "esta estrategia"} sem complicacao`,
            hook_formula: "Voce ainda esta fazendo isso do jeito mais dificil?",
            template_recommendation: "viral-hook",
            prompt_hint: "fundo dramatico com contraste e espaco negativo",
          },
          {
            topic: `Checklist rapido para ${briefing?.segment || "melhorar seu resultado"}`,
            hook_formula: "3 sinais de que voce esta perdendo resultado",
            template_recommendation: "data-insight",
            prompt_hint: "visual limpo com bullets e indicadores de progresso",
          },
          {
            topic: `Antes e depois de ajustar ${briefing?.segment || "sua comunicacao"}`,
            hook_formula: "Antes parecia certo. Depois ficou obvio.",
            template_recommendation: "clean-white",
            prompt_hint: "editorial clean com contraste antes/depois",
          },
        ],
      },
    );

    const insertPayload = {
      workspace_id,
      source_url: source_url || null,
      source_account: source_account || null,
      content_sample: preview || null,
      hook_formula: analysis.hook_formula || fallbackAnalysis.hook_formula,
      visual_style: analysis.visual_style || fallbackAnalysis.visual_style,
      emotional_trigger: analysis.emotional_trigger || fallbackAnalysis.emotional_trigger,
      content_type: analysis.content_type || fallbackAnalysis.content_type,
      engagement_notes: analysis.engagement_notes || fallbackAnalysis.engagement_notes,
      patterns_extracted: analysis.patterns_extracted || fallbackAnalysis.patterns_extracted,
    };

    const { data: savedAnalysis, error } = await supabase
      .from("viral_analyses")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) throw error;

    const { data: existingAnalyses } = await supabase
      .from("viral_analyses")
      .select("id, hook_formula, visual_style, content_type, emotional_trigger")
      .eq("workspace_id", workspace_id)
      .order("analyzed_at", { ascending: false })
      .limit(12);

    await supabase
      .from("briefings")
      .update({
        viral_patterns_cache: { recent_patterns: existingAnalyses || [] },
        last_competitor_analysis: new Date().toISOString(),
      })
      .eq("workspace_id", workspace_id);

    return safeJsonResponse({
      analysis: savedAnalysis,
      suggestions: analysis.suggestions || [],
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
