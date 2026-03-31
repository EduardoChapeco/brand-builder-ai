import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    // Load Firecrawl key from workspace
    const { data: keys, error: keyError } = await supabase
      .from("api_keys")
      .select("key_value")
      .eq("workspace_id", workspaceId)
      .eq("provider", "firecrawl")
      .eq("is_active", true)
      .limit(1);

    if (keyError || !keys?.length) {
      throw new Error("Chave Firecrawl não configurada. Adicione em Integrações & APIs.");
    }
    const apiKey = keys[0].key_value;

    // Scrape via Firecrawl with screenshot
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
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
    if (!result.success) throw new Error("Falha no Firecrawl: " + JSON.stringify(result));
    
    const screenshotUrl = result.data.screenshot;
    if (!screenshotUrl) throw new Error("A API não retornou screenshot visual.");

    // Download and re-upload to storage for permanent URL
    console.log("Baixando print da url temporária:", screenshotUrl);
    const imageRes = await fetch(screenshotUrl);
    if (!imageRes.ok) throw new Error("Erro ao baixar print temporário.");
    const imageBlob = await imageRes.blob();
    
    const fileName = `${workspaceId}/scraped-dna/clone-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("postgen")
      .upload(fileName, imageBlob, { contentType: "image/png" });
    
    if (uploadError) {
      // If upload fails, return the temporary URL
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
