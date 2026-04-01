import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createServiceClient, getBrandContext, runJsonTask, safeJsonResponse } from "../_shared/postgen.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, landing_page_id, create_project = false } = await req.json() as {
      workspace_id?: string;
      landing_page_id?: string;
      create_project?: boolean;
    };

    if (!workspace_id || !landing_page_id) {
      return safeJsonResponse({ error: "workspace_id e landing_page_id sao obrigatorios." }, 400);
    }

    const supabase = createServiceClient();
    const brandContext = await getBrandContext(supabase, workspace_id);
    const { data: landing, error } = await supabase
      .from("landing_pages")
      .select("*")
      .eq("id", landing_page_id)
      .eq("workspace_id", workspace_id)
      .single();

    if (error || !landing) {
      return safeJsonResponse({ error: "Landing page nao encontrada." }, 404);
    }

    const clone = await runJsonTask<{
      sections_json?: Array<Record<string, unknown>>;
      full_html?: string;
      full_css?: string;
      project_name?: string;
    }>(
      supabase,
      workspace_id,
      `Voce transforma analise de landing page em HTML/CSS reutilizavel e responde apenas JSON valido:
{
  "sections_json":[{"type":"string","order":1,"content_json":{},"html":"string"}],
  "full_html":"string",
  "full_css":"string",
  "project_name":"string"
}
Regras:
- adapte a pagina para a marca do workspace
- mantenha a estrutura principal, mas reescreva a copy
- gere HTML limpo e modular
${brandContext.system_context}`,
      `URL original: ${landing.source_url || "nao informada"}
Analise estrutural:
${JSON.stringify(landing.sections_analysis || {}, null, 2)}

Conteudo DOM:
${String(landing.dom_content || "").slice(0, 12000)}`,
      ["groq", "openrouter", "gemini"],
      {
        sections_json: Array.isArray((landing.sections_analysis as Record<string, unknown> | null)?.sections)
          ? ((landing.sections_analysis as Record<string, unknown>).sections as Array<Record<string, unknown>>).map((section, index) => ({
              type: section.type || `section_${index + 1}`,
              order: index + 1,
              content_json: section,
              html: `<section class="section"><h2>${section.headline || "Nova secao"}</h2><p>${section.body_text || ""}</p></section>`,
            }))
          : [],
        full_html: `<main class="landing-shell"><section class="hero"><p class="eyebrow">${brandContext.briefing?.segment || "Nova landing"}</p><h1>${brandContext.briefing?.company_name || "Sua marca"} com posicionamento mais claro.</h1><p>${brandContext.briefing?.main_differentials || "Destaque sua oferta principal com clareza e prova."}</p><button>Falar agora</button></section></main>`,
        full_css: `.landing-shell{min-height:100vh;background:#09090f;color:#f8fafc;font-family:DM Sans,system-ui,sans-serif;padding:64px 24px}.hero{max-width:960px;margin:0 auto;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);border-radius:32px;padding:48px}.eyebrow{text-transform:uppercase;letter-spacing:.18em;font-size:12px;opacity:.7}button{margin-top:20px;height:48px;padding:0 22px;border:none;border-radius:14px;background:#9353ff;color:#fff;font-weight:700}`,
        project_name: `Clone ${new Date().toISOString().slice(0, 10)}`,
      },
    );

    let projectId: string | null = null;
    if (create_project) {
      const sourceFiles = {
        "/src/App.tsx": `export default function App() {
  return (
    <>
      <style>{\`${clone.full_css || ""}\`}</style>
      <div dangerouslySetInnerHTML={{ __html: ${JSON.stringify(clone.full_html || "")} }} />
    </>
  );
}
`,
        "/src/index.tsx": `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(<App />);
`,
      };

      const { data: project } = await supabase
        .from("projects")
        .insert({
          workspace_id,
          name: clone.project_name || landing.name || "Landing Clone",
          description: `Projeto derivado de ${landing.source_url || "landing analisada"}`,
          status: "draft",
          entry_file: "/src/App.tsx",
          source_files_json: sourceFiles,
          preview_meta: { from_landing_page_id: landing.id },
        })
        .select("*")
        .single();

      projectId = project?.id || null;
    }

    const { data: updated, error: updateError } = await supabase
      .from("landing_pages")
      .update({
        sections_json: clone.sections_json || [],
        full_html: clone.full_html || null,
        full_css: clone.full_css || null,
        project_id: projectId,
        status: "ready",
      })
      .eq("id", landing_page_id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    return safeJsonResponse({
      landing_page: updated,
      project_id: projectId,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
