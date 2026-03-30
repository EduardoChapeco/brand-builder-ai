import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ApiKeyRow = {
  id: string;
  provider: string;
  key_value: string;
  calls_today: number | null;
  daily_limit: number | null;
};

// ─── Helpers ───────────────────────────────────────────────

const incrementKey = async (
  supabase: ReturnType<typeof createClient>,
  keyId: string,
  currentCalls: number,
) => {
  await supabase.from("api_keys").update({
    calls_today: currentCalls + 1,
    last_used_at: new Date().toISOString(),
    last_error: null,
  }).eq("id", keyId);
};

const markKeyError = async (
  supabase: ReturnType<typeof createClient>,
  keyId: string,
  message: string,
) => {
  await supabase.from("api_keys").update({
    last_error: message.slice(0, 500),
  }).eq("id", keyId);
};

// ─── 1. Scrape URL via Firecrawl (markdown + screenshot) ───

async function scrapeWithScreenshot(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  url: string,
): Promise<{ markdown: string; screenshotUrl: string | null; title: string | null }> {
  const { data: keys } = await supabase
    .from("api_keys")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("provider", "firecrawl")
    .eq("is_active", true)
    .order("calls_today", { ascending: true })
    .limit(3);

  if (!keys?.length) throw new Error("Nenhuma chave Firecrawl configurada.");

  for (const key of keys as ApiKeyRow[]) {
    if ((key.calls_today || 0) >= (key.daily_limit || 999)) continue;
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key.key_value}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          formats: ["markdown", "screenshot"],
          onlyMainContent: false,
          waitFor: 2000,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        await markKeyError(supabase, key.id, `${res.status}: ${err}`);
        continue;
      }

      const payload = await res.json();
      const markdown = payload?.data?.markdown || "";
      const screenshotUrl = payload?.data?.screenshot || null;
      const title = payload?.data?.metadata?.title || null;

      await incrementKey(supabase, key.id, key.calls_today || 0);
      return { markdown: markdown.slice(0, 16000), screenshotUrl, title };
    } catch (e) {
      await markKeyError(supabase, key.id, e instanceof Error ? e.message : String(e));
    }
  }
  throw new Error("Não foi possível raspar a URL. Verifique sua chave Firecrawl.");
}

// ─── 2. Deep DNA Analysis via LLM ──────────────────────────

const DNA_SYSTEM_PROMPT = `Você é um especialista em análise de identidade visual e comunicação de marcas para redes sociais.
Analise o conteúdo fornecido e retorne um JSON estruturado com 3 dimensões de DNA:

1. layout_dna: estrutura visual e grid
2. brand_dna: identidade visual (cores, tipografia, estética)
3. copy_dna: linguagem, metodologia de copywriting e comunicação

Responda APENAS com JSON válido, sem markdown, sem explicações fora do JSON.`;

const DNA_USER_TEMPLATE = (
  url: string,
  sourceName: string,
  markdown: string,
) => `URL analisada: ${url}
Nome da marca: ${sourceName}

Conteúdo coletado:
${markdown}

Retorne EXATAMENTE este JSON preenchido com sua análise profunda:
{
  "layout_dna": {
    "grid_type": "single-column | two-column | split | full-bleed | card | list",
    "content_hierarchy": ["headline", "subheadline", "body", "cta", "logo"],
    "visual_weight": "text-heavy | image-heavy | balanced",
    "padding_style": "tight | medium | generous",
    "alignment": "left | center | mixed",
    "slide_count_pattern": "1 | 3-5 | 5-10 | variable",
    "aspect_ratio_preference": "1:1 | 4:5 | 9:16 | 16:9"
  },
  "brand_dna": {
    "color_palette": {
      "primary": "#hex",
      "secondary": "#hex",
      "accent": "#hex",
      "background": "#hex",
      "text": "#hex"
    },
    "typography_style": "editorial | sans-serif-clean | serif-luxury | bold-display | handwritten | monospace",
    "visual_aesthetic": "minimal | bold | editorial | luxury | documentary | corporate | playful",
    "texture_style": "flat | gradient | noise-grain | glassmorphism | photography | illustration",
    "logo_treatment": "prominent | subtle | watermark | absent",
    "color_mood": "dark | light | colorful | monochromatic | duotone"
  },
  "copy_dna": {
    "tone_primary": "authoritative | conversational | inspirational | educational | provocative | humorous | urgent",
    "hook_patterns": ["lista de padrões de hooks identificados, ex: 'Pergunta disruptiva', 'Estatística impactante'"],
    "headline_style": "curto-impacto | longo-explicativo | interrogativo | afirmativo | contraditório",
    "cta_style": "direcional | suave | urgente | valor | social-proof",
    "copywriting_framework": "AIDA | PAS | StoryBrand | FAB | SLAP | customizado",
    "emoji_usage": "none | minimal | moderate | heavy",
    "language_level": "technical | popular | mixed",
    "avg_headline_words": 5,
    "content_pillars": ["tópico 1 identificado", "tópico 2", "tópico 3"]
  },
  "style_tags": ["tag1", "tag2", "tag3"],
  "category": "social | story | carousel | educational | promotional"
}`;

async function analyzeDnaWithLLM(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  url: string,
  sourceName: string,
  markdown: string,
): Promise<{ layout_dna: unknown; brand_dna: unknown; copy_dna: unknown; style_tags: string[]; category: string }> {
  const { data: keys } = await supabase
    .from("api_keys")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .in("provider", ["groq", "openrouter", "gemini"])
    .order("calls_today", { ascending: true })
    .limit(5);

  const fallback = {
    layout_dna: { grid_type: "single-column", visual_weight: "balanced" },
    brand_dna: { visual_aesthetic: "minimal", color_mood: "dark" },
    copy_dna: { tone_primary: "educational", hook_patterns: [] },
    style_tags: ["imported"],
    category: "social",
  };

  if (!keys?.length) return fallback;

  const userPrompt = DNA_USER_TEMPLATE(url, sourceName, markdown);

  for (const key of keys as ApiKeyRow[]) {
    if ((key.calls_today || 0) >= (key.daily_limit || 999)) continue;
    try {
      let res: Response;
      if (key.provider === "groq") {
        res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${key.key_value}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: DNA_SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.2,
            max_tokens: 2000,
            response_format: { type: "json_object" },
          }),
        });
      } else if (key.provider === "openrouter") {
        res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${key.key_value}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://postgen.app",
          },
          body: JSON.stringify({
            model: "meta-llama/llama-3.3-70b-instruct:free",
            messages: [
              { role: "system", content: DNA_SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.2,
            response_format: { type: "json_object" },
          }),
        });
      } else {
        // Gemini
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${key.key_value}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${DNA_SYSTEM_PROMPT}\n\n${userPrompt}` }] }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 2000, responseMimeType: "application/json" },
            }),
          },
        );
      }

      if (!res.ok) {
        const err = await res.text();
        await markKeyError(supabase, key.id, `${res.status}: ${err}`);
        continue;
      }

      const payload = await res.json();
      const rawText = key.provider === "gemini"
        ? payload?.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
        : payload?.choices?.[0]?.message?.content || "{}";

      const parsed = JSON.parse(rawText.trim());
      await incrementKey(supabase, key.id, key.calls_today || 0);
      return {
        layout_dna: parsed.layout_dna || fallback.layout_dna,
        brand_dna: parsed.brand_dna || fallback.brand_dna,
        copy_dna: parsed.copy_dna || fallback.copy_dna,
        style_tags: parsed.style_tags || fallback.style_tags,
        category: parsed.category || fallback.category,
      };
    } catch (e) {
      await markKeyError(supabase, key.id, e instanceof Error ? e.message : String(e));
    }
  }
  return fallback;
}

// ─── 3. Generate HTML Template from DNA ────────────────────

const TEMPLATE_SYSTEM_PROMPT = `Você é um desenvolvedor HTML/CSS especialista em criar posts para redes sociais.
Gere um template HTML completo e funcional que reproduz o DNA visual identificado.
O template deve:
- Ter dimensões fixas de 540x540px (post quadrado padrão Instagram)
- Usar APENAS HTML inline e CSS interno (sem frameworks externos)
- Usar variáveis CSS para cores: var(--color-primary), var(--color-secondary), var(--color-accent), var(--color-bg), var(--color-text)
- Usar variáveis CSS para fontes: var(--font-headline), var(--font-body)
- Ter elementos marcados com data-postgen-field="headline", data-postgen-field="body", data-postgen-field="cta"
- Estar completo e pronto para renderizar em um iframe
- NÃO usar imagens externas (use gradients, svgs inline ou placeholder colors)
- Reproduzir fielmente o grid, tipografia, hierarquia e estética do DNA analisado

Responda APENAS com o HTML completo, sem markdown, sem explicações.`;

async function generateHtmlTemplate(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  layoutDna: unknown,
  brandDna: unknown,
  copyDna: unknown,
  sourceName: string,
): Promise<string> {
  const { data: keys } = await supabase
    .from("api_keys")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .in("provider", ["groq", "openrouter", "gemini"])
    .order("calls_today", { ascending: true })
    .limit(5);

  const fallbackHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html,body { width:540px; height:540px; overflow:hidden; }
.artboard {
  width:540px; height:540px;
  background:var(--color-bg, #09090F);
  display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  padding:48px; position:relative;
}
.headline {
  font-family:var(--font-headline, 'DM Sans'), sans-serif;
  font-size:48px; font-weight:800; line-height:1.1;
  color:var(--color-text, #F8FAFC); text-align:center;
  margin-bottom:20px;
}
.body {
  font-family:var(--font-body, 'DM Sans'), sans-serif;
  font-size:16px; color:rgba(248,250,252,0.65);
  text-align:center; line-height:1.6;
}
</style>
</head>
<body>
<div class="artboard">
  <div class="headline" data-postgen-field="headline" data-postgen-editable="true">Seu Headline Aqui</div>
  <div class="body" data-postgen-field="body" data-postgen-editable="true">DNA de ${sourceName} em processamento...</div>
</div>
</body>
</html>`;

  if (!keys?.length) return fallbackHtml;

  const userPrompt = `Crie um template HTML de 540x540px baseado neste DNA de marca:

FONTE: ${sourceName}

LAYOUT DNA:
${JSON.stringify(layoutDna, null, 2)}

BRAND DNA:
${JSON.stringify(brandDna, null, 2)}

COPY DNA:
${JSON.stringify(copyDna, null, 2)}

IMPORTANTE:
- Use as variáveis CSS: var(--color-primary), var(--color-secondary), var(--color-accent), var(--color-bg), var(--color-text), var(--font-headline), var(--font-body)
- Marque os campos editáveis com data-postgen-field="headline", data-postgen-field="body", data-postgen-field="cta"
- Texto de exemplo: headline="Exemplo de Headline Poderoso", body="Corpo de texto exemplo.", cta="Saiba mais →"
- Retorne APENAS o HTML completo, sem markdown`;

  for (const key of keys as ApiKeyRow[]) {
    if ((key.calls_today || 0) >= (key.daily_limit || 999)) continue;
    try {
      let res: Response;
      if (key.provider === "groq") {
        res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${key.key_value}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: TEMPLATE_SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.4,
            max_tokens: 4000,
          }),
        });
      } else if (key.provider === "openrouter") {
        res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${key.key_value}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://postgen.app",
          },
          body: JSON.stringify({
            model: "meta-llama/llama-3.3-70b-instruct:free",
            messages: [
              { role: "system", content: TEMPLATE_SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.4,
          }),
        });
      } else {
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${key.key_value}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${TEMPLATE_SYSTEM_PROMPT}\n\n${userPrompt}` }] }],
              generationConfig: { temperature: 0.4, maxOutputTokens: 4000 },
            }),
          },
        );
      }

      if (!res.ok) {
        const err = await res.text();
        await markKeyError(supabase, key.id, `${res.status}: ${err}`);
        continue;
      }

      const payload = await res.json();
      let html = key.provider === "gemini"
        ? payload?.candidates?.[0]?.content?.parts?.[0]?.text || ""
        : payload?.choices?.[0]?.message?.content || "";

      // Strip markdown code fences if LLM added them
      html = html.replace(/^```html?\n?/i, "").replace(/\n?```\s*$/i, "").trim();

      if (html.toLowerCase().includes("<!doctype") || html.toLowerCase().includes("<html")) {
        await incrementKey(supabase, key.id, key.calls_today || 0);
        return html;
      }
    } catch (e) {
      await markKeyError(supabase, key.id, e instanceof Error ? e.message : String(e));
    }
  }
  return fallbackHtml;
}

// ─── Main Handler ───────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { workspace_id, url, source_name, source_platform } = await req.json();
    if (!workspace_id || !url) throw new Error("workspace_id e url são obrigatórios.");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Create pending record immediately so the UI knows it started
    const { data: pendingRecord, error: insertErr } = await supabase
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
      // Step 1: Scrape
      const { markdown, screenshotUrl, title } = await scrapeWithScreenshot(supabase, workspace_id, url);
      const resolvedName = source_name || title || url;

      // Step 2: Deep DNA Analysis  
      const { layout_dna, brand_dna, copy_dna, style_tags, category } = await analyzeDnaWithLLM(
        supabase, workspace_id, url, resolvedName, markdown,
      );

      // Step 3: Generate HTML Template
      const html_template = await generateHtmlTemplate(
        supabase, workspace_id, layout_dna, brand_dna, copy_dna, resolvedName,
      );

      // Step 4: Save final result
      const { data: finalRecord, error: updateErr } = await supabase
        .from("brand_templates")
        .update({
          source_name: resolvedName,
          layout_dna,
          brand_dna,
          copy_dna,
          style_tags,
          category,
          html_template,
          screenshot_url: screenshotUrl,
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
    } catch (analysisError) {
      // Mark as failed but don't delete — preserve the record
      await supabase.from("brand_templates").update({
        status: "failed",
        error_message: analysisError instanceof Error ? analysisError.message : String(analysisError),
      }).eq("id", recordId);
      throw analysisError;
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
