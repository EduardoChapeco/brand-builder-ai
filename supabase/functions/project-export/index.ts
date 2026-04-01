import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createServiceClient, runJsonTask, safeJsonResponse } from "../_shared/postgen.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, project_id, format = "manifest" } = await req.json() as {
      workspace_id?: string;
      project_id?: string;
      format?: "manifest" | "html_single";
    };

    if (!workspace_id || !project_id) {
      return safeJsonResponse({ error: "workspace_id e project_id sao obrigatorios." }, 400);
    }

    const supabase = createServiceClient();
    const { data: project, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", project_id)
      .eq("workspace_id", workspace_id)
      .single();

    if (error || !project) {
      return safeJsonResponse({ error: "Projeto nao encontrado." }, 404);
    }

    const files = (project.source_files_json && typeof project.source_files_json === "object"
      ? project.source_files_json
      : {}) as Record<string, string>;

    if (format === "manifest") {
      return safeJsonResponse({
        project,
        source_files_json: files,
      });
    }

    const exported = await runJsonTask<{
      html?: string;
      title?: string;
    }>(
      supabase,
      workspace_id,
      `Voce converte um pequeno projeto React em um HTML unico e responde apenas JSON valido:
{
  "title":"string",
  "html":"string"
}
Regras:
- gere um unico arquivo HTML autocontido
- preserve a hierarquia visual principal
- simplifique quando necessario para garantir portabilidade`,
      `Projeto:
${JSON.stringify(files).slice(0, 20000)}`,
      ["groq", "openrouter", "gemini"],
      {
        title: project.name || "Projeto exportado",
        html: `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${project.name || "Projeto"}</title></head><body><pre>${JSON.stringify(files, null, 2)}</pre></body></html>`,
      },
    );

    return safeJsonResponse({
      title: exported.title || project.name || "Projeto exportado",
      html: exported.html,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
