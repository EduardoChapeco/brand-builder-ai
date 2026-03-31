import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const MASTER_PROMPTS: Record<string, string> = {
  editorial: "[MASTER STYLE: EDITORIAL MAGAZINE PHOTOGRAPHY] Professional editorial photography, magazine cover aesthetic. Dramatic lighting, negative space for text, no text in image, no logos, film grain.",
  bold: "[MASTER STYLE: BOLD IMPACT VISUAL] High contrast, dramatic visual, dark background, strong subject, cinematic lighting, deep shadows, no text or watermark.",
  minimal: "[MASTER STYLE: MINIMALIST CLEAN] Clean composition, subtle gradient or light background, generous negative space, neutral palette, no clutter, no text.",
  dark: "[MASTER STYLE: DARK LUXURY PREMIUM] Sophisticated dark aesthetic, moody black tones, premium materials, subtle metallic accents, no text, no bright colors.",
  documentary: "[MASTER STYLE: DOCUMENTARY/JOURNALISTIC] Raw, authentic scene, candid composition, available light, desaturated film look, no staged text elements.",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, prompt, visual_mode } = await req.json();
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
    const fullPrompt = `${masterPrompt} SUBJECT: ${prompt}. Square 1:1 ratio, fills entire frame, no text in image.`;

    // Use Lovable AI image generation model
    const res = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
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
