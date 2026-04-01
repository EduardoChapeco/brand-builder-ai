import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  callLLM,
  capturePageVisual,
  corsHeaders,
  createServiceClient,
  getBrandContext,
  safeJsonResponse,
  scrapeDomWithFirecrawl,
} from "../_shared/postgen.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, url } = await req.json() as {
      workspace_id?: string;
      url?: string;
    };

    if (!workspace_id || !url) {
      return safeJsonResponse({ error: "workspace_id e url sao obrigatorios." }, 400);
    }

    const supabase = createServiceClient();
    await getBrandContext(supabase, workspace_id);

    const { data: landingRow, error: landingError } = await supabase
      .from("landing_pages")
      .insert({
        workspace_id,
        name: `Clone de ${new URL(url).hostname}`,
        source_type: "cloned",
        source_url: url,
        status: "analyzing",
      })
      .select("*")
      .single();

    if (landingError) throw landingError;

    const [visualCapture, domContent] = await Promise.all([
      capturePageVisual(supabase, workspace_id, url),
      scrapeDomWithFirecrawl(supabase, workspace_id, url),
    ]);

    const analysis = await callLLM<{
      page_objective?: string;
      sections?: Array<{
        type?: string;
        order?: number;
        headline?: string;
        body_text?: string;
        cta_text?: string;
      }>;
      color_palette?: string[];
      typography_observations?: string[];
    }>(
      supabase,
      workspace_id,
      `Voce analisa landing pages e responde apenas JSON valido:
{
  "page_objective":"string",
  "sections":[{"type":"string","order":1,"headline":"string","body_text":"string","cta_text":"string"}],
  "color_palette":["string"],
  "typography_observations":["string"]
}
Regras:
- identifique hero, features, prova social, CTA e footer quando existirem
- use poucos itens, mas com boa fidelidade estrutural
- sintetize sem copiar texto desnecessariamente`,
      `URL: ${url}
Descricao visual: ${visualCapture.visual_description}
Capturas: ${JSON.stringify(visualCapture.screenshots)}
Markdown extraido:
${(domContent.markdown || "").slice(0, 12000)}`,
      {
        page_objective: "Capturar leads ou apresentar uma oferta principal com forte proposta de valor.",
        sections: [
          { type: "hero_split", order: 1, headline: "Oferta principal", body_text: "Headline e subheadline do hero.", cta_text: "Quero saber mais" },
          { type: "features_3col", order: 2, headline: "Beneficios", body_text: "Bloco com os principais argumentos.", cta_text: null },
          { type: "cta_centered", order: 3, headline: "Chamada final", body_text: "CTA de fechamento.", cta_text: "Entrar em contato" },
        ],
        color_palette: [],
        typography_observations: [],
      },
    );

    const { data: updated, error: updateError } = await supabase
      .from("landing_pages")
      .update({
        screenshots_json: visualCapture.screenshots,
        dom_content: domContent.markdown || domContent.html || null,
        sections_analysis: analysis,
        status: "analyzed",
      })
      .eq("id", landingRow.id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    return safeJsonResponse({
      landing_page_id: updated.id,
      screenshots: visualCapture.screenshots,
      dom_content: domContent.markdown || "",
      sections_analysis: analysis,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
