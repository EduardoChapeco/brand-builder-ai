import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createServiceClient, runJsonTask, safeJsonResponse } from "../_shared/postgen.ts";

const ARC_BY_FUNNEL: Record<string, string> = {
  Awareness: "hook_reveal",
  Educativo: "educational_thread",
  "Captar Leads": "before_after",
  Vendas: "social_proof_stack",
  Engajamento: "manifesto",
};

type StoryboardSlide = {
  role: string;
  headline_draft: string;
  notes: string;
  template_suggestion: string;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, topic, funnel_type, slides_count } = await req.json() as {
      workspace_id?: string;
      topic?: string;
      funnel_type?: string;
      slides_count?: number;
    };

    if (!workspace_id || !topic) {
      return safeJsonResponse({ error: "workspace_id e topic sao obrigatorios." }, 400);
    }

    const supabase = createServiceClient();
    const requestedSlides = Math.max(3, Math.min(Number(slides_count) || 6, 10));
    const fallbackArc = ARC_BY_FUNNEL[funnel_type || ""] || "hook_reveal";

    const fallbackRoles: Record<string, string[]> = {
      hook_reveal: ["hook", "agitation", "discovery", "solution", "proof", "cta"],
      educational_thread: ["hook_question", "concept_intro", "deep_dive_1", "deep_dive_2", "common_mistake", "key_insight", "cta"],
      before_after: ["before_problem", "agitation", "turning_point", "transformation", "after_result", "cta"],
      social_proof_stack: ["claim", "testimonial_1", "testimonial_2", "data_point", "guarantee_cta"],
      manifesto: ["declaration", "argument_1", "argument_2", "argument_3", "vulnerable_moment", "cta"],
    };
    const roles = (fallbackRoles[fallbackArc] || fallbackRoles.hook_reveal).slice(0, requestedSlides);
    const fallbackSlides = roles.map((role, index) => ({
      role,
      headline_draft: index === 0 ? topic.slice(0, 60) : `${role.replace(/_/g, " ")}: ${topic.slice(0, 40)}`,
      notes: role === "cta" ? "Feche com uma chamada clara e objetiva." : `Conecte este slide ao tema ${topic}.`,
      template_suggestion: index === 0 ? "viral-hook" : index === roles.length - 1 ? "clean-white" : "data-insight",
    }));

    const result = await runJsonTask<{
      arc_type?: string;
      slides_plan?: StoryboardSlide[];
      rationale?: string;
    }>(
      supabase,
      workspace_id,
      `Voce sugere storyboard de carrossel em Portugues BR.
Responda apenas JSON valido:
{
  "arc_type":"hook_reveal|numbered_tips|before_after|manifesto|journey_case|educational_thread|social_proof_stack",
  "rationale":"string",
  "slides_plan":[
    {"role":"string","headline_draft":"string","notes":"string","template_suggestion":"string"}
  ]
}
Regras:
- respeite o numero de slides solicitado
- mantenha headlines curtas
- sugira templates do registry atual: viral-hook, editorial-magazine, data-insight, clean-white, minimal-dark, magnata-split`,
      `Tema: ${topic}
Objetivo/funil: ${funnel_type || "Awareness"}
Numero de slides: ${requestedSlides}`,
      ["groq", "openrouter", "gemini"],
      {
        arc_type: fallbackArc,
        rationale: `Arco sugerido por heuristica para o funil ${funnel_type || "Awareness"}.`,
        slides_plan: fallbackSlides,
      },
    );

    return safeJsonResponse({
      arc_type: result.arc_type || fallbackArc,
      rationale: result.rationale || `Arco sugerido por heuristica para o funil ${funnel_type || "Awareness"}.`,
      slides_plan: Array.isArray(result.slides_plan) && result.slides_plan.length
        ? result.slides_plan.slice(0, requestedSlides)
        : fallbackSlides,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
