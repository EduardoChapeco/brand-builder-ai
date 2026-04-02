import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createServiceClient, runJsonTask, safeJsonResponse } from "../_shared/postgen.ts";

type StoryboardSlide = {
  role: string;
  headline_draft: string;
  notes: string;
  template_suggestion: string;
};

const requireText = (value: unknown, field: string) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Campo obrigatorio ausente ou invalido: ${field}.`);
  }
  return value.trim();
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
    );

    const slidesPlan = Array.isArray(result.slides_plan)
      ? result.slides_plan.map((slide, index) => ({
          role: requireText(slide.role, `slides_plan[${index}].role`),
          headline_draft: requireText(slide.headline_draft, `slides_plan[${index}].headline_draft`),
          notes: requireText(slide.notes, `slides_plan[${index}].notes`),
          template_suggestion: requireText(slide.template_suggestion, `slides_plan[${index}].template_suggestion`),
        }))
      : [];

    if (slidesPlan.length !== requestedSlides) {
      throw new Error("A IA nao retornou a quantidade exata de slides solicitada.");
    }

    return safeJsonResponse({
      arc_type: requireText(result.arc_type, "arc_type"),
      rationale: requireText(result.rationale, "rationale"),
      slides_plan: slidesPlan,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
