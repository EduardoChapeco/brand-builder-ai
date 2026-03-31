import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

function extractJson<T>(text: string): T {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();
  return JSON.parse(jsonStr) as T;
}

// Scrape URL using Lovable AI Gateway (fetch + summarize) - NO external API keys needed
async function scrapeUrl(
  lovableApiKey: string,
  url: string,
): Promise<{ markdown: string; title: string | null }> {
  // Simple fetch of the URL to get raw HTML
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PostGenBot/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch URL ${url}: ${response.status}`);
      return { markdown: "", title: null };
    }

    const html = await response.text();
    
    // Extract title from HTML
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;

    // Strip HTML tags for a rough text extraction, limit to 12000 chars
    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 12000);

    return { markdown: textContent, title };
  } catch (e) {
    console.warn("Direct fetch failed:", e);
    return { markdown: "", title: null };
  }
}

// DNA Analysis via Lovable AI
async function analyzeDnaWithLLM(
  lovableApiKey: string,
  url: string,
  sourceName: string,
  markdown: string,
): Promise<{ layout_dna: unknown; brand_dna: unknown; copy_dna: unknown; style_tags: string[]; category: string }> {
  const fallback = {
    layout_dna: { grid_type: "single-column", visual_weight: "balanced" },
    brand_dna: { visual_aesthetic: "minimal", color_mood: "dark" },
    copy_dna: { tone_primary: "educational", hook_patterns: [] },
    style_tags: ["imported"],
    category: "social",
  };

  const systemPrompt = `Você é um especialista em análise de identidade visual nivel mundial (Pentagram, Apple).
Analise o conteúdo e retorne um JSON estruturado com:
1. layout_dna: estrutura visual moderna (margins, borders, radius, text-align)
2. brand_dna: identidade visual com cores exatas HEX. IMPORTANTE: Garanta CONSTANTE ALTO CONTRASTE (ex: Se bg_dark for #111, text_dark deve ser #FFF). Inclua fontes válidas do Google Fonts (Inter, Outfit, Playfair Display).
3. copy_dna: linguagem e estilo.
Responda APENAS com JSON válido (sem crases).`;

  const userPrompt = `URL: ${url} / Marca: ${sourceName}
Conteúdo via Texto:
${markdown.slice(0, 8000)}

Retorne JSON com layout_dna, brand_dna, copy_dna, style_tags e category.`;

  try {
    const res = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
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

    if (!res.ok) return fallback;
    const payload = await res.json();
    const rawText = payload?.choices?.[0]?.message?.content || "{}";
    const parsed = extractJson<Record<string, unknown>>(rawText);
    return {
      layout_dna: parsed.layout_dna || fallback.layout_dna,
      brand_dna: parsed.brand_dna || fallback.brand_dna,
      copy_dna: parsed.copy_dna || fallback.copy_dna,
      style_tags: (parsed.style_tags as string[]) || fallback.style_tags,
      category: (parsed.category as string) || fallback.category,
    };
  } catch {
    return fallback;
  }
}

// Generate HTML Template via Lovable AI
async function generateHtmlTemplate(
  lovableApiKey: string,
  layoutDna: unknown,
  brandDna: unknown,
  copyDna: unknown,
  sourceName: string,
): Promise<string> {
  const fallbackHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:540px;height:540px;overflow:hidden}.artboard{width:540px;height:540px;background:var(--color-bg,#1A1A24);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px;position:relative}.headline{font-family:var(--font-headline,'DM Sans'),sans-serif;font-size:48px;font-weight:800;line-height:1.1;color:var(--color-text,#FFFFFF);text-align:center;margin-bottom:20px}.body{font-family:var(--font-body,'DM Sans'),sans-serif;font-size:16px;color:rgba(255,255,255,0.7);text-align:center;line-height:1.6}</style></head><body><div class="artboard"><div class="headline" data-postgen-field="headline">DNA ${sourceName} Extraído</div><div class="body" data-postgen-field="body">Edite as informações na guia e experimente novos Prompts.</div></div></body></html>`;

  const systemPrompt = `Você é um desenvolvedor Frontend de Elite (nível Stripe/Apple) criando layouts virais estonteantes HTML CSS para carrosséis de redes sociais.
Gere um template modernista. Use Glassmorphism inteligente, sombras elegantes, divs modulares, texturas de padding profissionais.
DESTRUA A MEDIOCRIDADE DE FUNDO PRETO TEXTO BRANCO SECO. FAÇA UMA OBRA PRIMA.
REGRAS TÉCNICAS RÍGIDAS:
- A DIV raiz (class="artboard") deve ter 540x540px e position:relative
- Usar a regra ABSOLUTA de contraste (Ex: texto claro em fundo escuro e vice versa).
- Mapeie dados via: data-postgen-field="headline", data-postgen-field="body", data-postgen-field="cta"
- Variáveis CSS (você DEVE criar o estilo para herda-las do host, NUNCA HARCODAR as cores hex do estilo final no css inline, MAS voce pode formatar as divs baseadas nas instrucoes de design recebidas). As variaveis fornecidas serao: var(--color-primary), var(--color-secondary), var(--color-accent), var(--color-bg), var(--color-text), var(--font-headline), var(--font-body)
- NÃO usar imagens via <img src>
- RESPONDER APENAS NO FORMATO <!DOCTYPE html><html>...</html> (NUNCA RETORNE MARKDOWN, SEM \`\`\`html).`;

  const userPrompt = `Crie o Template HTML de luxo reproduzindo este manual visual 540x540px:
FONTE: ${sourceName}
LAYOUT: ${JSON.stringify(layoutDna)}
BRANDING: ${JSON.stringify(brandDna)}
COPY: ${JSON.stringify(copyDna)}`;

  try {
    const res = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
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

    if (!res.ok) return fallbackHtml;
    const payload = await res.json();
    let html = payload?.choices?.[0]?.message?.content || "";
    html = html.replace(/^```html?\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    if (html.toLowerCase().includes("<!doctype") || html.toLowerCase().includes("<html")) {
      return html;
    }
    return fallbackHtml;
  } catch {
    return fallbackHtml;
  }
}

// Main Handler
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { workspace_id, url, source_name, source_platform } = await req.json();
    if (!workspace_id || !url) throw new Error("workspace_id e url são obrigatórios.");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada.");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Create pending record
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
      // Scrape URL directly (no external API key needed)
      const scraped = await scrapeUrl(LOVABLE_API_KEY, url);
      const markdown = scraped.markdown || "Marca com estilo moderno e minimalista.";
      const title = scraped.title || source_name || "Perfil ou Site";
      const resolvedName = source_name || title || url;

      // Analyze DNA with AI
      const { layout_dna, brand_dna, copy_dna, style_tags, category } = await analyzeDnaWithLLM(
        LOVABLE_API_KEY, url, resolvedName, markdown,
      );

      // Generate HTML template with AI
      const html_template = await generateHtmlTemplate(
        LOVABLE_API_KEY, layout_dna, brand_dna, copy_dna, resolvedName,
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
      await supabaseClient.from("brand_templates").update({
        status: "failed",
        error_message: errMsg.slice(0, 500),
      }).eq("id", recordId);

      throw processError;
    }
  } catch (error) {
    console.error("clone-brand-template error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
