import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  
  try {
    const { screenshotUrl, workspaceId, preferGemini } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Carregar Chaves do Workspace
    const provider = preferGemini ? 'gemini' : 'groq';
    const { data: keys, error: keyError } = await supabase
      .from('api_keys')
      .select('key_value')
      .eq('workspace_id', workspaceId)
      .eq('provider', provider)
      .eq('is_active', true)
      .limit(1);

    if (keyError || !keys?.length) {
      throw new Error(`Chave do provedor ${provider.toUpperCase()} não configurada para Multimodal Vision.`);
    }
    const apiKey = keys[0].key_value;

    console.log(`📡 Solicitando Visão Computacional para ${provider} na imagem: ${screenshotUrl}`);

    const prompt = `
      Você é um Lead Designer de Produto e Analista de Copywriting. 
      Analise o screenshot acima (um perfil/post do Instagram ou website).
      Extraia a estrutura visual matemática do grid, as cores exatas (HEX), a proporção de espaço (margin/padding) e o tom de voz do texto.
      Me resuma sua análise de 'Visual DNA' e crie um único template HTML estático + CSS in-line usando a classe <div class="artboard flex flex-col items-center"> ou similar, onde blocos de texto principais usem "data-postgen-field='headline'" e "data-postgen-field='body'". Utilize glassmorphism se houver. Deixe fundos de div preparados para receber imagens via CSS background-image futuramente.
      
      Retorne APENAS um JSON estrito neste exato formato:
      {
        "brand_dna": {
          "color_palette": ["#...", "#..."],
          "font_headline": "string",
          "font_body": "string",
          "tone_of_voice": "string"
        },
        "layout": {
          "grid_type": "string",
          "alignment": "center|left|right"
        },
        "html_template": "string puro html/css sem escape extra. Evite markdown no value."
      }
    `;

    let finalJson: any;

    if (provider === 'groq') {
       // Llama-3.2-90b-vision-preview (Groq does not formally support image URLs directly in the completions API sometimes, it requires base64. Let's assume standard OpenAI schema)
       const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
         method: 'POST',
         headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
         body: JSON.stringify({
           model: 'llama-3.2-11b-vision-preview',
           messages: [
             {
               role: 'user',
               content: [
                 { type: 'text', text: prompt },
                 { type: 'image_url', image_url: { url: screenshotUrl } }
               ]
             }
           ],
           response_format: { type: "json_object" }
         })
       });

       const gRes = await groqResponse.json();
       if (gRes.error) throw new Error(gRes.error.message || 'Erro Groq Vision JSON');
       finalJson = JSON.parse(gRes.choices[0].message.content);

    } else {
       // Gemini 2.0 Flash / Pro via REST
       throw new Error("Agente Vision via Gemini ainda aguardando integração Multimodal Part no Deno.");
    }

    return new Response(JSON.stringify({ success: true, data: finalJson }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error("Agent Vision Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
