import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createServiceClient, getBrandContext, runJsonTask, safeJsonResponse } from "../_shared/postgen.ts";

const defaultFiles = {
  "/src/App.tsx": `export default function App() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#09090f", color: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
      <section style={{ maxWidth: 760, padding: 32 }}>
        <p style={{ opacity: 0.72, letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 12 }}>VibeCoder</p>
        <h1 style={{ fontSize: 48, lineHeight: 1.04, margin: "12px 0 16px" }}>Describe the page in chat.</h1>
        <p style={{ fontSize: 18, opacity: 0.82 }}>Each prompt updates the real multi-file project for this workspace.</p>
      </section>
    </main>
  );
}
`,
  "/src/index.tsx": `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(<App />);
`,
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
    const { workspace_id, project_id, message, source_files_json } = await req.json() as {
      workspace_id?: string;
      project_id?: string;
      message?: string;
      source_files_json?: Record<string, string>;
    };

    if (!workspace_id || !message) {
      return safeJsonResponse({ error: "workspace_id e message sao obrigatorios." }, 400);
    }

    const supabase = createServiceClient();
    const brandContext = await getBrandContext(supabase, workspace_id);

    let project = null;
    if (project_id) {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("id", project_id)
        .eq("workspace_id", workspace_id)
        .maybeSingle();
      project = data;
    }

    const baseFiles = (
      source_files_json && typeof source_files_json === "object" && Object.keys(source_files_json).length > 0
        ? source_files_json
        : project?.source_files_json && typeof project.source_files_json === "object"
          ? (project.source_files_json as Record<string, string>)
          : defaultFiles
    );

    const generated = await runJsonTask<{
      summary?: string;
      diagnostics?: string[];
      files?: Record<string, string>;
    }>(
      supabase,
      workspace_id,
      `Voce edita um projeto React + TypeScript multi-arquivo.
Responda apenas JSON valido:
{
  "summary":"string",
  "diagnostics":["string"],
  "files":{"/src/App.tsx":"string","/src/index.tsx":"string"}
}
Regras:
- retorne o conteudo completo apenas dos arquivos que deseja criar ou sobrescrever
- mantenha o projeto compilavel
- use React funcional simples, sem dependencias extras
${brandContext.system_context}`,
      `Pedido do usuario: ${message}

Arquivos atuais:
${JSON.stringify(baseFiles).slice(0, 20000)}`,
      ["groq", "openrouter", "gemini"],
    );

    const summary = requireText(generated.summary, "summary");
    const generatedFiles =
      generated.files && typeof generated.files === "object" && !Array.isArray(generated.files)
        ? Object.entries(generated.files).reduce<Record<string, string>>((acc, [path, content]) => {
            if (typeof content === "string" && content.trim().length > 0) {
              acc[path] = content;
            }
            return acc;
          }, {})
        : {};

    if (Object.keys(generatedFiles).length === 0) {
      throw new Error("A IA nao retornou arquivos validos para atualizar o projeto.");
    }

    const nextFiles = {
      ...baseFiles,
      ...generatedFiles,
    };

    const payload = {
      workspace_id,
      name: project?.name || `Projeto ${new Date().toISOString().slice(0, 10)}`,
      description: project?.description || "Projeto criado via VibeCoder",
      status: "draft",
      entry_file: "/src/App.tsx",
      source_files_json: nextFiles,
      preview_meta: {
        last_summary: summary,
        last_updated_at: new Date().toISOString(),
      },
    };

    const persisted = project
      ? await supabase.from("projects").update(payload).eq("id", project.id).select("*").single()
      : await supabase.from("projects").insert(payload).select("*").single();

    if (persisted.error) throw persisted.error;

    await supabase.from("platform_conversations").insert({
      workspace_id,
      project_id: persisted.data.id,
      mode: "chat",
      user_message: message,
      assistant_response: summary,
      diff_summary: Array.isArray(generated.diagnostics) ? generated.diagnostics.join(" | ") : null,
    });

    return safeJsonResponse({
      project_id: persisted.data.id,
      source_files_json: nextFiles,
      summary,
      diagnostics: Array.isArray(generated.diagnostics) ? generated.diagnostics : [],
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
