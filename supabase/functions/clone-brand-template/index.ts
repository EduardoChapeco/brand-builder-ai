import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

function extractJson<T>(text: string): T {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();
  return JSON.parse(jsonStr) as T;
}

const requireText = (value: unknown, field: string) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Campo obrigatorio ausente ou invalido: ${field}.`);
  }
  return value.trim();
};

async function scrapeUrl(url: string): Promise<{ markdown: string; title: string | null }> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; PostGenBot/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao capturar URL alvo: ${response.status}`);
  }

  const html = await response.text();
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : null;

  const textContent = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000);

  if (!textContent) {
    throw new Error("Nao foi possivel extrair conteudo textual da URL.");
  }

  return { markdown: textContent, title };
}

async function callGateway(apiKey: string, systemPrompt: string, userPrompt: string) {
  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`AI gateway error: ${res.status}`);
  }

  const payload = await res.json();
  return payload?.choices?.[0]?.message?.content || "";
}

async function analyzeDnaWithLLM(
  lovableApiKey: string,
  url: string,
  sourceName: string,
  markdown: string,
): Promise<{ layout_dna: unknown; brand_dna: unknown; copy_dna: unknown; style_tags: string[]; category: string }> {
  const rawText = await callGateway(
    lovableApiKey,
    `Voce e um especialista em analise de identidade visual. Responda APENAS com JSON valido contendo:
{
  "layout_dna": {},
  "brand_dna": {},
  "copy_dna": {},
  "style_tags": ["string"],
  "category": "string"
}`,
    `URL: ${url}
Marca: ${sourceName}
Conteudo extraido:
${markdown.slice(0, 8000)}`,
  );

  const parsed = extractJson<Record<string, unknown>>(rawText);
  const styleTags = Array.isArray(parsed.style_tags)
    ? parsed.style_tags.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  if (!parsed.layout_dna || !parsed.brand_dna || !parsed.copy_dna || styleTags.length === 0) {
    throw new Error("A IA nao retornou DNA completo para o template.");
  }

  return {
    layout_dna: parsed.layout_dna,
    brand_dna: parsed.brand_dna,
    copy_dna: parsed.copy_dna,
    style_tags: styleTags,
    category: requireText(parsed.category, "category"),
  };
}

async function generateHtmlTemplate(
  lovableApiKey: string,
  layoutDna: unknown,
  brandDna: unknown,
  copyDna: unknown,
  sourceName: string,
): Promise<string> {
  const html = await callGateway(
    lovableApiKey,
    `Voce e um desenvolvedor frontend senior criando um template HTML 540x540. Regras:
- responder apenas com <!DOCTYPE html>...</html>
- usar data-postgen-field="headline", "body" e "cta"
- nao usar markdown`,
    `Fonte: ${sourceName}
LAYOUT: ${JSON.stringify(layoutDna)}
BRANDING: ${JSON.stringify(brandDna)}
COPY: ${JSON.stringify(copyDna)}`,
  );

  const normalized = html.replace(/^```html?\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  if (!normalized.toLowerCase().includes("<!doctype") && !normalized.toLowerCase().includes("<html")) {
    throw new Error("A IA nao retornou HTML valido para o template.");
  }
  return normalized;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, url, source_name, source_platform } = await req.json();
    if (!workspace_id || !url) throw new Error("workspace_id e url sao obrigatorios.");

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY nao configurada.");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: pendingRecord, error: insertErr } = await supabaseClient
      .from("brand_templates")
      .insert({
        workspace_id,
        source_url: url,
        source_name: source_name || url,
        source_platform: source_platform || "web",
        status: "analyzing",
      })
      .select()
      .single();

    if (insertErr || !pendingRecord) throw insertErr || new Error("Falha ao criar registro.");

    const recordId = pendingRecord.id;

    try {
      const scraped = await scrapeUrl(url);
      const resolvedName = source_name || scraped.title || url;

      const { layout_dna, brand_dna, copy_dna, style_tags, category } = await analyzeDnaWithLLM(
        lovableApiKey,
        url,
        resolvedName,
        scraped.markdown,
      );

      const html_template = await generateHtmlTemplate(
        lovableApiKey,
        layout_dna,
        brand_dna,
        copy_dna,
        resolvedName,
      );

      const { data: finalRecord, error: updateErr } = await supabaseClient
        .from("brand_templates")
        .update({
          source_name: resolvedName,
          layout_dna,
          brand_dna,
          copy_dna,
          html_template,
          screenshot_url: null,
          style_tags,
          category,
          status: "ready",
          analyzed_at: new Date().toISOString(),
        })
        .eq("id", recordId)
        .select()
        .single();

      if (updateErr) throw updateErr;

      return new Response(JSON.stringify({ template: finalRecord }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (processError) {
      const errMsg = processError instanceof Error ? processError.message : String(processError);
      await supabaseClient
        .from("brand_templates")
        .update({
          status: "failed",
          error_message: errMsg.slice(0, 500),
        })
        .eq("id", recordId);

      throw processError;
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
