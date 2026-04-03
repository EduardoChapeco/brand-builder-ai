import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getNextKey } from "../_shared/key-orchestrator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { url, workspaceId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const firecrawlKey = await getNextKey(
      { workspaceId, provider: "firecrawl" },
      supabase,
    );

    if (!firecrawlKey) {
      throw new Error("Chave Firecrawl nao configurada. Adicione em Integracoes & APIs.");
    }

    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey.keyDecrypted}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["screenshot@fullPage"],
        timeout: 30000,
        waitFor: 3000,
      }),
    });

    const result = await response.json();
    if (!result.success) throw new Error(`Falha no Firecrawl: ${JSON.stringify(result)}`);

    const screenshotUrl = result.data.screenshot;
    if (!screenshotUrl) throw new Error("A API nao retornou screenshot visual.");

    const imageRes = await fetch(screenshotUrl);
    if (!imageRes.ok) throw new Error("Erro ao baixar print temporario.");

    const imageBlob = await imageRes.blob();
    const fileName = `${workspaceId}/scraped-dna/clone-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("postgen")
      .upload(fileName, imageBlob, { contentType: "image/png" });

    if (uploadError) {
      console.error("Storage upload failed, returning temporary URL:", uploadError.message);
      return new Response(JSON.stringify({ success: true, url: screenshotUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const publicUrl = supabase.storage.from("postgen").getPublicUrl(fileName).data.publicUrl;

    return new Response(JSON.stringify({ success: true, url: publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("Agent Scraper Error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
