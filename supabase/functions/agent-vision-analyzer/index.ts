import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
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
      NOME DO AGENTE: "The Visionary"
      CURRÍCULO: Diretor de Arte Sênior, Psicanalista de Cores e Engenheiro de Frontend UI/UX.
      MISSÃO: Analisar o screenshot com extema precisão técnica e conceitual.
      
      I. ANÁLISE PROFUNDA (PSICOLOGIA & DESIGN)
      1. Extraia a Paleta de Cores exata (HEX). Deduza o 'color_mood' (ex: "Transmite luxo através de fundos escuros com contraste dourado e tons terrosos minimalistas").
      2. Raios de borda exatos (px), espaçamentos absolutos (padding/margin), Sombras (box-shadow) e Efeitos Especiais (Blur, Glassmorphism, Noise patterns).
      3. Tipografia: Identifique a escala ('typographic_scale') e a vibe da fonte (Serif elegante, Sans-serif agressiva/tech).
      4. Composição ('composition_grid'): Split-screen, card-centered, masonry, text-heavy editorial, image-heavy.
      5. Tom de Voz da Marca ('tone_of_voice'): Direto, provocativo, educacional compassivo, corporativo luxuoso.

      II. ENGENHARIA CSS/HTML (REGRAS DE OURO DA PLATAFORMA)
      Sua missão técnica é gerar um \`html_template\` (PREMIUM EXTREME) que seja a réplica domada do que você analisou, funcionando nativamente como framework Tailwind/CSS.
      - CONTAINER BASE EXATO: <div class="artboard" style="position:relative; width:100%; height:100%; display:flex; flex-direction:column; background-color: var(--color-bg); overflow: hidden;">
      - UTILIZE AS VARIÁVEIS CSS DE TEMA OBRIGATORIAMENTE nas camadas que você estruturar: 
        var(--color-primary), var(--color-secondary), var(--color-accent), var(--color-bg), var(--color-text), var(--font-headline), var(--font-body), var(--radius), var(--shadow).
      - PRECISÃO MUTÁVEL (DND Native): Para que os slides gerem conteúdo de texto posteriormente, atribua as marcações injetoras. Exemplo: <h1 data-postgen-field='headline'></h1>, <p data-postgen-field='body'></p>, <div data-postgen-field='cta'></div>.
      - CONSTRUA O LAYOUT COM MAESTRIA: Divs aninhadas para manter proporções. Aplique Flexbox avançado. Use 'position: absolute' sabiamente para texturas e gradientes de fundo sutis (como radial-gradients de background-blend-mode se detectado).

      Retorne APENAS um objeto JSON estrito (sem backticks markdown explicativos em volta), neste exato formato:
      {
        "brand_dna": {
          "color_mood": "string analisando a psicanalise das cores vistas",
          "color_palette": ["#...", "#..."],
          "typographic_scale": "string descrevendo proporcao titulo/corpo",
          "tone_of_voice": "string deduzida",
          "radius": "12px",
          "shadow": "0 8px 32px rgba(0,0,0,0.1)"
        },
        "layout": {
          "composition_grid": "string descritiva do grid (ex: split-left)",
          "alignment": "center|left|right"
        },
        "html_template": "<div class='artboard'>...código completo aqui...</div>"
      }
    `;

    let finalJson: Record<string, unknown> | undefined;

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

  } catch (err: unknown) {
    console.error("Agent Vision Error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
