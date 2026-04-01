import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createServiceClient, getBrandContext, runJsonTask, safeJsonResponse } from "../_shared/postgen.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, prompt, module_type, mode = "balanced", config } = await req.json() as {
      workspace_id?: string;
      prompt?: string;
      module_type?: string;
      mode?: "fast" | "balanced" | "full";
      config?: Record<string, unknown>;
    };

    if (!workspace_id || !prompt || !module_type) {
      return safeJsonResponse({ error: "workspace_id, prompt e module_type sao obrigatorios." }, 400);
    }

    const supabase = createServiceClient();
    const brandContext = await getBrandContext(supabase, workspace_id);

    const result = await runJsonTask<{
      identification?: Record<string, unknown>;
      fragments?: Array<Record<string, unknown>>;
      specialist_results?: Record<string, unknown>;
      assembled_prd?: string;
      qa_score?: number;
      final_prompt?: string;
    }>(
      supabase,
      workspace_id,
      `Voce orquestra um squad de agentes e responde apenas JSON valido:
{
  "identification": {},
  "fragments": [],
  "specialist_results": {},
  "assembled_prd": "string",
  "qa_score": 0,
  "final_prompt": "string"
}
Use o contexto da marca abaixo para montar um plano acionavel.
${brandContext.system_context}`,
      `Modulo: ${module_type}
Modo: ${mode}
Prompt do usuario: ${prompt}
Config extra: ${JSON.stringify(config || {})}`,
      ["groq", "openrouter", "gemini"],
      {
        identification: { module_type, mode },
        fragments: [],
        specialist_results: {},
        assembled_prd: prompt,
        qa_score: 72,
        final_prompt: prompt,
      },
    );

    const { data: prd, error } = await supabase
      .from("agent_prds")
      .insert({
        workspace_id,
        module_type,
        mode,
        status: "completed",
        original_prompt: prompt,
        brand_context_hash: null,
        identification: result.identification || {},
        fragments: result.fragments || [],
        specialist_results: result.specialist_results || {},
        assembled_prd: result.assembled_prd || prompt,
        qa_score: result.qa_score || 72,
        final_prompt: result.final_prompt || prompt,
      })
      .select("*")
      .single();

    if (error) throw error;

    await supabase.from("agent_execution_log").insert({
      workspace_id,
      prd_id: prd.id,
      agent_type: "orchestrator",
      provider: "workspace_llm",
      model: "balanced-json",
      input_tokens: null,
      output_tokens: null,
      duration_ms: null,
      success: true,
      error_msg: null,
    });

    return safeJsonResponse({
      prd_id: prd.id,
      result,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
