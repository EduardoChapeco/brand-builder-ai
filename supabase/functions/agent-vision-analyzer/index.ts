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
      Você é um Lead Designer de Produto, Engenheiro Frontend UI/UX e Especialista em Criação de Templates. 
      Analise o screenshot com extrema precisão visual. Identifique:
      1. Paleta de cores exata (HEX) e Contrastes.
      2. Raios de borda (border-radius), espaçamentos (padding/margin), Sombras (box-shadow) e Efeitos Especiais (Blur, Glassmorphism).
      3. Tipografia: O peso, hierarquia e se usa fontes Serif/Sans-serif modernas.
      4. Tom de Voz: O estilo de copy (direto, misterioso, luxo, corporativo).

      Sua principal missão é gerar um \`html_template\` de altíssima qualidade (PREMIUM EXTREME) que seja a réplica fiel e expansível do que viu.
      
      REGRAS CRÍTICAS DE ENGENHARIA DO CSS/HTML:
      - O container base DEVE ser estritamente: <div class="artboard" style="position:relative; width:100%; height:100%; display:flex; flex-direction:column; background-color: var(--color-bg); overflow: hidden;">
      - UTILIZE AS VARIÁVEIS CSS ABAIXO obrigatoriamente (NÃO use cores hex hardcoded para as fontes principais ou fundos gerais). O motor da plataforma alimentará:
        var(--color-primary), var(--color-secondary), var(--color-accent), var(--color-bg), var(--color-text), var(--font-headline), var(--font-body), var(--radius), var(--shadow).
      - Atribua marcações mágicas às variáveis de texto. As tags que conterão o conteúdo mutável devem ter atributo: data-postgen-field='headline', data-postgen-field='body', data-postgen-field='cta'.
      - Construa o layout com divs aninhadas, Flexbox complexo e Absolute Positioning para marcações decorativas. Aplique filtros complexos como backdrop-filter: blur(16px) ou mix-blend-mode se detectados.

      Retorne APENAS um JSON estrito, sem markdown backticks no início e no fim, neste formato exato:
      {
        "brand_dna": {
          "color_palette": ["#...", "#..."],
          "font_headline": "string",
          "font_body": "string",
          "tone_of_voice": "string",
          "radius": "12px",
          "shadow": "0 8px 32px rgba(0,0,0,0.1)"
        },
        "layout": {
          "grid_type": "string",
          "alignment": "center|left|right"
        },
        "html_template": "<div class='artboard'>...</div>"
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
