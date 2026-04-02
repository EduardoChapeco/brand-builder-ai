import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createServiceClient,
  getBrandContext,
  runJsonTask,
  safeJsonResponse,
  scrapeDomWithFirecrawl,
} from "../_shared/postgen.ts";
import { dispatchSimlabRun } from "../_shared/simlab.ts";

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

const markdownToHtml = (markdown: string) =>
  markdown
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("### ")) return `<h3>${trimmed.slice(4)}</h3>`;
      if (trimmed.startsWith("## ")) return `<h2>${trimmed.slice(3)}</h2>`;
      if (trimmed.startsWith("# ")) return `<h1>${trimmed.slice(2)}</h1>`;
      if (trimmed.startsWith("- ")) {
        const items = trimmed
          .split("\n")
          .map((line) => `<li>${line.replace(/^- /, "")}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${trimmed.replace(/\n/g, "<br />")}</p>`;
    })
    .filter(Boolean)
    .join("\n");

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
    const { workspace_id, topic, source_url, news_item_id } = await req.json() as {
      workspace_id?: string;
      topic?: string;
      source_url?: string;
      news_item_id?: string;
    };

    if (!workspace_id || (!topic && !source_url && !news_item_id)) {
      return safeJsonResponse({ error: "workspace_id e topic, source_url ou news_item_id sao obrigatorios." }, 400);
    }

    const supabase = createServiceClient();
    const brandContext = await getBrandContext(supabase, workspace_id);

    let sourceTopic = topic || "";
    let resolvedSourceUrl = source_url || "";
    let articleMarkdown = "";
    const linkedNewsItemId = news_item_id || null;

    if (news_item_id) {
      const { data: item, error } = await supabase
        .from("news_items")
        .select("*")
        .eq("id", news_item_id)
        .eq("workspace_id", workspace_id)
        .single();

      if (error || !item) {
        return safeJsonResponse({ error: "news_item nao encontrado." }, 404);
      }

      sourceTopic = item.title;
      resolvedSourceUrl = item.source_url;
      articleMarkdown = item.content_markdown || "";
    }

    if (!articleMarkdown && resolvedSourceUrl) {
      const scraped = await scrapeDomWithFirecrawl(supabase, workspace_id, resolvedSourceUrl);
      articleMarkdown = scraped.markdown || "";
    }

    const generated = await runJsonTask<{
      title?: string;
      slug?: string;
      meta_description?: string;
      keywords?: string[];
      content_markdown?: string;
      layout_template?: string;
    }>(
      supabase,
      workspace_id,
      `Voce cria artigos de blog em Portugues BR e responde apenas JSON valido:
{
  "title":"string",
  "slug":"string",
  "meta_description":"string",
  "keywords":["string"],
  "content_markdown":"string",
  "layout_template":"medium_clean|magazine_editorial|minimalist_dark|news_style|seo_optimized"
}
Regras:
- escreva com foco em SEO sem perder o tom da marca
- use heading hierarchy clara
- se houver noticia, transforme em comentario/analise, sem plagio
- use o contexto da marca abaixo
${brandContext.system_context}`,
      `Tema principal: ${sourceTopic || topic || "nao informado"}
URL de referencia: ${resolvedSourceUrl || "nao informada"}
Material base:
${articleMarkdown.slice(0, 12000) || "Sem artigo completo. Gere o artigo a partir do tema informado."}`,
      ["groq", "openrouter", "gemini"],
    );

    const title = requireText(generated.title, "title");
    const contentMarkdown = requireText(generated.content_markdown, "content_markdown");
    const metaDescription = requireText(generated.meta_description, "meta_description");

    const payload = {
      workspace_id,
      title,
      slug: typeof generated.slug === "string" && generated.slug.trim().length > 0 ? slugify(generated.slug) : slugify(title),
      meta_description: metaDescription,
      keywords: Array.isArray(generated.keywords) ? generated.keywords : [],
      content_markdown: contentMarkdown,
      content_html: markdownToHtml(contentMarkdown),
      layout_template:
        typeof generated.layout_template === "string" && generated.layout_template.trim().length > 0
          ? generated.layout_template
          : "medium_clean",
      status: "draft",
      source_type: linkedNewsItemId ? "from_news" : resolvedSourceUrl ? "from_url" : "manual",
      source_url: resolvedSourceUrl || null,
      news_item_id: linkedNewsItemId,
    };

    const { data: article, error: insertError } = await supabase
      .from("blog_articles")
      .insert(payload)
      .select("*")
      .single();

    if (insertError) throw insertError;

    if (linkedNewsItemId) {
      await supabase.from("news_items").update({ blog_article_id: article.id }).eq("id", linkedNewsItemId);
    }

    const simlabDispatch = await dispatchSimlabRun(supabase, {
      workspaceId: workspace_id,
      validationType: "content",
      moduleType: "blog_article",
      stimulusType: "blog_article",
      targetTable: "blog_articles",
      targetId: article.id,
      objective: sourceTopic || topic || "Validar artigo",
      audienceHint: typeof brandContext.briefing?.target_audience === "string" ? brandContext.briefing.target_audience : null,
      variants: [{
        key: "draft_v1",
        label: title,
        artifact: {
          title,
          meta_description: metaDescription,
          content_markdown: contentMarkdown,
          content_html: markdownToHtml(contentMarkdown),
          layout_template: payload.layout_template,
        },
      }],
      requestPayload: {
        source_topic: sourceTopic || topic || null,
        source_url: resolvedSourceUrl || null,
      },
      contextPolicy: {
        require_approval: true,
      },
      requestedBy: "blog_generate",
      waitForCompletion: false,
    });

    return safeJsonResponse({
      blog_article_id: article.id,
      draft: article,
      simlab_run_id: simlabDispatch.run.id,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
