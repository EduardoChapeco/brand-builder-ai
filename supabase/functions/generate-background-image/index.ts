import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const MASTER_PROMPTS: Record<string, string> = {
  editorial: "— estilo: editorial ultra‑realista, foto 8K, ultra renderizada — formato de captura: RAW 50MP, balanço de branco neutro, perfil AdobeRGB, profundidade de cor 14‑bit — câmera: Canon EOS R5, lente 85mm f/1.4, DOF rasa (bokeh suave) — texturas: pele com poros visíveis e microgranulado de filme, tecidos e elementos super definidos — iluminação: Key light 5600K 45° direita, Fill light 3200K (30%), Backlight quente 3000K, Refletor prata abaixo — composição: regra dos terços — NÃO ADICIONE TEXTO NA IMAGEM.",
  bold: "— estilo: dramático de alto contraste, foto 8K ultra realista — formato: RAW 50MP, perfil AdobeRGB — câmera: Canon EOS R5, lente 85mm f/1.4 — iluminação: Key light forte 5600K, Sombras profundas (contraste 4:1), projeta reflexos intensos e cores de marca — elementos abstratos: cortes geométricos, luzes volumétricas transversais — NÃO ADICIONE TEXTO NA IMAGEM.",
  minimal: "— estilo: minimalista hiper-clean, fundo neutro ou degradê muito suave — câmera: Canon EOS R5, lente 50mm f/1.2 — iluminação: iluminação global super difusa e suave sem sombras duras — composição: enorme espaço negativo para texto — NÃO ADICIONE TEXTO NA IMAGEM.",
  dark: "— estilo: dark luxury, tons escuros sofisticados, materiais premium (couro, vidro fosco, metal) — câmera: formato médio, textura incrivel — iluminação: low-key lighting, detalhes destacados por backlights sutis em cores profundas — NÃO ADICIONE TEXTO NA IMAGEM.",
  documentary: "— estilo: jornalístico, momento real autêntico, desaturated film look (leve granulado Kodak) — iluminação: luz natural do ambiente, cru e dramático sem cara de estúdio — NÃO ADICIONE TEXTO NA IMAGEM.",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, prompt, visual_mode, format } = await req.json();
    if (!workspace_id || !prompt) {
      throw new Error("workspace_id e prompt sao obrigatorios.");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const masterPrompt = MASTER_PROMPTS[visual_mode] || MASTER_PROMPTS.editorial;
    let aspectRatioHint = "Square 1:1 ratio";
    let ratioConfig = "1:1";
    if (format === 'story' || format === 'portrait') { aspectRatioHint = "Vertical 9:16 smartphone ratio"; ratioConfig = "9:16"; }
    else if (format === 'landscape') { aspectRatioHint = "Horizontal 16:9 widescreen ratio"; ratioConfig = "16:9"; }

    const fullPrompt = `ASSUNTO / DESCRIÇÃO CENTRAL: [${prompt}]. DIRETRIZES TÉCNICAS MANDATÓRIAS: ${masterPrompt}. Formato Exigido: ${aspectRatioHint}. Nunca inclua letras, palavras, watermarks ou texto legível na imagem.`;

    // Use Lovable AI image generation model
    const res = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        aspectRatio: ratioConfig,
        messages: [{ role: "user", content: fullPrompt }],
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI Gateway error [${res.status}]: ${errText}`);
    }

    const payload = await res.json();
    const imageUrl = payload?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      // Fallback: return a descriptive error, no image generated
      return new Response(JSON.stringify({ error: "O modelo não gerou uma imagem. Tente outro prompt." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If it's a data URL, upload to storage
    if (imageUrl.startsWith("data:image/")) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const [, base64] = imageUrl.split(",", 2);
      if (!base64) throw new Error("Data URL inválida.");
      const imageBytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));

      const fileName = `backgrounds/${workspace_id}/${crypto.randomUUID()}.png`;
      const { error } = await supabase.storage
        .from("postgen")
        .upload(fileName, imageBytes, { contentType: "image/png", upsert: false });

      if (error) {
        // Storage upload failed, return the data URL directly
        console.error("Storage upload failed:", error);
        return new Response(JSON.stringify({ imageUrl }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data } = supabase.storage.from("postgen").getPublicUrl(fileName);
      return new Response(JSON.stringify({ imageUrl: data.publicUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return the URL directly
    return new Response(JSON.stringify({ imageUrl }), {
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
