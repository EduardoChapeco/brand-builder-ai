import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

type ApiKeyRow = {
  id: string;
  provider: string;
  key_value: string;
  calls_today: number | null;
  daily_limit: number | null;
};

type ScrapeResult = {
  markdown: string;
  title: string | null;
};

const markKeyError = async (
  supabase: any,
  keyId: string,
  message: string,
  exhausted = false,
) => {
  await supabase
    .from("api_keys")
    .update({
      calls_today: exhausted ? 99999 : undefined,
      last_error: message.slice(0, 500),
    })
    .eq("id", keyId);
};

const incrementKeyUsage = async (
  supabase: ReturnType<typeof createClient>,
  key: ApiKeyRow,
) => {
  await supabase
    .from("api_keys")
    .update({
      calls_today: (key.calls_today || 0) + 1,
      last_used_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("id", key.id);
};

const scrapeUrl = async (
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  url: string,
): Promise<ScrapeResult> => {
  const { data: keys } = await supabase
    .from("api_keys")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("provider", "firecrawl")
    .eq("is_active", true)
    .order("calls_today", { ascending: true })
    .limit(3);

  if (!keys?.length) {
    throw new Error("Nenhuma chave Firecrawl configurada. Adicione em Integrações & APIs.");
  }

  for (const key of keys as ApiKeyRow[]) {
    if ((key.calls_today || 0) >= (key.daily_limit || 0)) continue;

    try {
      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key.key_value}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          formats: ["markdown"],
          onlyMainContent: true,
          maxAge: 0,
        }),
      });

      if (response.status === 429) {
        await markKeyError(supabase, key.id, "429 Rate Limited", true);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Firecrawl ${response.status}: ${errorText}`);
      }

      const payload = await response.json();
      const markdown = payload?.data?.markdown;

      if (typeof markdown !== "string" || !markdown.trim()) {
        throw new Error("Firecrawl retornou markdown vazio.");
      }

      await incrementKeyUsage(supabase, key);

      return {
        markdown: markdown.slice(0, 14000),
        title: payload?.data?.metadata?.title || null,
      };
    } catch (error) {
      await markKeyError(
        supabase,
        key.id,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  throw new Error("Nao foi possivel raspar a URL com Firecrawl.");
};

const analyzeCommunicationDna = async (
  lovableApiKey: string,
  url: string,
  rawMarkdown: string,
  competitorName?: string | null,
  notes?: string | null,
): Promise<string> => {
  const systemPrompt = `Voce analisa o DNA de comunicacao de marcas.
Responda em Portugues BR com markdown curto e estruturado.
Formato obrigatorio:
## Tom e voz
## Hooks recorrentes
## Promessa central
## CTA e conversao
## Visual percebido
## Oportunidades para diferenciar
Seja especifico e pragmatico.`;

  const userPrompt = `Marca: ${competitorName || "Nao informada"}
URL: ${url}
Notas do usuario: ${notes || "Nenhuma"}

Conteudo raspado:
${rawMarkdown}`;

  try {
    const res = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      console.error("AI Gateway error:", res.status);
      return `Análise automática indisponível. Trecho bruto:\n\n${rawMarkdown.slice(0, 1200)}`;
    }

    const payload = await res.json();
    const text = payload?.choices?.[0]?.message?.content || "";
    return text.trim() || `Análise vazia. Trecho bruto:\n\n${rawMarkdown.slice(0, 1200)}`;
  } catch (e) {
    console.error("DNA analysis error:", e);
    return `Falha na análise. Trecho bruto:\n\n${rawMarkdown.slice(0, 1200)}`;
  }
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, url, name, notes } = await req.json();
    if (!workspace_id || !url) {
      throw new Error("workspace_id e url sao obrigatorios.");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada.");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const scraped = await scrapeUrl(supabase, workspace_id, url);
    const dnaText = await analyzeCommunicationDna(
      LOVABLE_API_KEY,
      url,
      scraped.markdown,
      name || scraped.title,
      notes || null,
    );

    const analysisPayload = {
      workspace_id,
      url,
      name: name || scraped.title,
      dna_text: dnaText,
      screenshot_url: null,
      raw_markdown: scraped.markdown,
      analyzed_at: new Date().toISOString(),
    };

    const { data: savedAnalysis, error: saveError } = await supabase
      .from("competitor_analyses_v2")
      .upsert(analysisPayload, { onConflict: "workspace_id,url" })
      .select()
      .single();

    if (saveError) throw saveError;

    const { data: analyses } = await supabase
      .from("competitor_analyses_v2")
      .select("name,url,dna_text")
      .eq("workspace_id", workspace_id)
      .order("analyzed_at", { ascending: false });

    const consolidatedBrandDna = (analyses || [])
      .filter(item => item.dna_text)
      .map(item => `# ${item.name || item.url}\n${item.dna_text}`)
      .join("\n\n");

    await supabase
      .from("briefings")
      .update({
        brand_dna: consolidatedBrandDna || null,
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspace_id);

    return new Response(JSON.stringify({
      analysis: savedAnalysis,
      brand_dna: consolidatedBrandDna,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
