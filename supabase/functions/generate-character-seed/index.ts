import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createServiceClient, runJsonTask, safeJsonResponse } from "../_shared/postgen.ts";

type CharacterDraft = {
  name?: string;
  gender?: string;
  age_range?: string;
  ethnicity_notes?: string;
  physical_traits?: string[];
  style_notes?: string;
  archetype?: string;
  expression_default?: string;
  signature_item?: string;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, character_draft } = await req.json() as {
      workspace_id?: string;
      character_draft?: CharacterDraft;
    };

    if (!workspace_id || !character_draft) {
      return safeJsonResponse({ error: "workspace_id e character_draft sao obrigatorios." }, 400);
    }

    const supabase = createServiceClient();
    const { data: brandKit } = await supabase
      .from("brand_kits")
      .select("*")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    const fallbackSeed = [
      `Consistent character: ${character_draft.gender || "person"} ${character_draft.age_range ? `in ${character_draft.age_range}` : ""}`,
      character_draft.ethnicity_notes || "",
      ...(character_draft.physical_traits || []),
      character_draft.style_notes || "",
      character_draft.archetype ? `Archetype: ${character_draft.archetype}.` : "",
      character_draft.expression_default ? `Expression: ${character_draft.expression_default}.` : "",
      character_draft.signature_item ? `Always wearing or carrying ${character_draft.signature_item}.` : "",
      brandKit
        ? `Brand color reflections: ${brandKit.color_primary}, ${brandKit.color_secondary}, ${brandKit.color_accent}.`
        : "",
      "Photography style: Canon EOS R5, 85mm f/1.4, editorial quality, 8K, direct and engaging eye contact.",
    ].filter(Boolean).join(" ");

    const systemPrompt = `Voce gera seed prompts consistentes para personagens visuais de marca.
Responda apenas JSON valido no formato:
{
  "seed_prompt": "string"
}
Regras:
- Ingles tecnico de geracao de imagem
- manter consistencia de idade, tracos, roupa e item assinatura
- incluir camera, lente e fotografia editorial
- nao adicionar texto extra fora do JSON`;

    const userPrompt = `Nome: ${character_draft.name || "personagem de marca"}
Genero: ${character_draft.gender || "nao informado"}
Faixa etaria: ${character_draft.age_range || "nao informada"}
Etnia/notas: ${character_draft.ethnicity_notes || "nao informado"}
Tracos fisicos: ${(character_draft.physical_traits || []).join(", ") || "nao informado"}
Estilo/roupa: ${character_draft.style_notes || "nao informado"}
Arquetipo: ${character_draft.archetype || "nao informado"}
Expressao default: ${character_draft.expression_default || "nao informado"}
Item assinatura: ${character_draft.signature_item || "nao informado"}
Paleta da marca: ${brandKit ? `${brandKit.color_primary}, ${brandKit.color_secondary}, ${brandKit.color_accent}` : "nao informada"}`;

    const result = await runJsonTask<{ seed_prompt?: string }>(
      supabase,
      workspace_id,
      systemPrompt,
      userPrompt,
      ["groq", "openrouter", "gemini"],
      { seed_prompt: fallbackSeed },
    );

    return safeJsonResponse({
      seed_prompt: result.seed_prompt || fallbackSeed,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
