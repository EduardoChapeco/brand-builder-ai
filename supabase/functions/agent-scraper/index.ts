import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  
  try {
    const { url, workspaceId, preferSteel } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Carregar Chave do Workspace
    const { data: keys, error: keyError } = await supabase
      .from('api_keys')
      .select('key_value')
      .eq('workspace_id', workspaceId)
      .eq('provider', preferSteel ? 'steel' : 'firecrawl')
      .eq('is_active', true)
      .limit(1);

    if (keyError || !keys?.length) {
      throw new Error(`Chave do provedor ${preferSteel ? 'Steel.dev' : 'Firecrawl'} não configurada.`);
    }
    const apiKey = keys[0].key_value;

    let screenshotUrl = '';

    if (!preferSteel) {
      // 2. Scrape via Firecrawl
      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url,
          formats: ['screenshot@fullPage']
        })
      });

      const result = await response.json();
      if (!result.success) throw new Error("Falha no Firecrawl: " + JSON.stringify(result));
      screenshotUrl = result.data.screenshot;
      if (!screenshotUrl) throw new Error("A API não retornou screenshot visual.");
    } else {
      // STEEL DEV Fallback integration would go here (requires puppeteer-core inside Deno)
      throw new Error("Opção Steel Puppeteer ainda sob homologação no Deno. Utilize Firecrawl no painel.");
    }

    // 3. Download da Imagem para evitar expiração do link da Firecrawl/Steel
    console.log("Baixando print da url temporária:", screenshotUrl);
    const imageRes = await fetch(screenshotUrl);
    if (!imageRes.ok) throw new Error("Erro de rede ao baixar print temporário da scraper API.");
    const imageBlob = await imageRes.blob();
    
    // 4. Salvar na Supabase Storage (postgen_assets) permanentemente
    const fileName = `${workspaceId}/scraped-dna/clone-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from('postgen_assets')
      .upload(fileName, imageBlob, { contentType: 'image/png' });
    
    if (uploadError) throw new Error("Erro ao salvar print no Storage nativo: " + uploadError.message);

    const publicUrl = supabase.storage.from('postgen_assets').getPublicUrl(fileName).data.publicUrl;

    return new Response(JSON.stringify({ success: true, url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error("Agent Scraper Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
