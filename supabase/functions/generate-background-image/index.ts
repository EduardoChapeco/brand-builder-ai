import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MASTER_PROMPTS: Record<string, string> = {
  editorial: "[MASTER STYLE: EDITORIAL MAGAZINE PHOTOGRAPHY] Professional editorial photography, magazine cover aesthetic. Dramatic lighting, negative space for text, no text in image, no logos, film grain.",
  bold: "[MASTER STYLE: BOLD IMPACT VISUAL] High contrast, dramatic visual, dark background, strong subject, cinematic lighting, deep shadows, no text or watermark.",
  minimal: "[MASTER STYLE: MINIMALIST CLEAN] Clean composition, subtle gradient or light background, generous negative space, neutral palette, no clutter, no text.",
  dark: "[MASTER STYLE: DARK LUXURY PREMIUM] Sophisticated dark aesthetic, moody black tones, premium materials, subtle metallic accents, no text, no bright colors.",
  documentary: "[MASTER STYLE: DOCUMENTARY/JOURNALISTIC] Raw, authentic scene, candid composition, available light, desaturated film look, no staged text elements.",
};

type ApiKeyRow = {
  id: string;
  provider: "gemini" | "openrouter";
  key_value: string;
  calls_today: number | null;
  daily_limit: number | null;
};

const markKeyError = async (
  supabase: ReturnType<typeof createClient>,
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

const extractBytesFromDataUrl = (dataUrl: string) => {
  const [, base64] = dataUrl.split(",", 2);
  if (!base64) throw new Error("Data URL invalida.");
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0));
};

const uploadImageBytes = async (
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  imageBytes: Uint8Array,
) => {
  const fileName = `backgrounds/${workspaceId}/${crypto.randomUUID()}.png`;
  const { error } = await supabase.storage
    .from("postgen")
    .upload(fileName, imageBytes, { contentType: "image/png", upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from("postgen").getPublicUrl(fileName);
  return data.publicUrl;
};

const generateWithGemini = async (key: ApiKeyRow, prompt: string) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${key.key_value}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Generate an image background: ${prompt}` }] }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini ${response.status}: ${errorText}`);
  }

  const payload = await response.json();
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((part: { inlineData?: { data?: string } }) => part.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    throw new Error("Gemini nao retornou imagem.");
  }

  return Uint8Array.from(atob(imagePart.inlineData.data), char => char.charCodeAt(0));
};

const generateWithOpenRouter = async (key: ApiKeyRow, prompt: string) => {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key.key_value}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://postgen.app",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
      image_config: {
        aspect_ratio: "1:1",
        image_size: "1K",
      },
    }),
  });

  if (response.status === 429) {
    throw new Error("429 Rate Limited");
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${errorText}`);
  }

  const payload = await response.json();
  const imageUrl = payload?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

  if (typeof imageUrl !== "string" || !imageUrl.startsWith("data:image/")) {
    throw new Error("OpenRouter nao retornou imagem valida.");
  }

  return extractBytesFromDataUrl(imageUrl);
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, prompt, visual_mode } = await req.json();
    if (!workspace_id || !prompt) {
      throw new Error("workspace_id e prompt sao obrigatorios.");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: keys } = await supabase
      .from("api_keys")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("is_active", true)
      .in("provider", ["gemini", "openrouter"])
      .order("calls_today", { ascending: true })
      .limit(4);

    if (!keys?.length) {
      return new Response(JSON.stringify({
        error: "Nenhuma chave de IA disponivel para gerar imagem.",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const masterPrompt = MASTER_PROMPTS[visual_mode] || MASTER_PROMPTS.editorial;
    const fullPrompt = `${masterPrompt} SUBJECT: ${prompt}. Square format 1:1, fills entire frame, no text in image.`;

    for (const key of keys as ApiKeyRow[]) {
      if ((key.calls_today || 0) >= (key.daily_limit || 0)) continue;

      try {
        const imageBytes = key.provider === "gemini"
          ? await generateWithGemini(key, fullPrompt)
          : await generateWithOpenRouter(key, fullPrompt);

        const imageUrl = await uploadImageBytes(supabase, workspace_id, imageBytes);
        await incrementKeyUsage(supabase, key);

        return new Response(JSON.stringify({ imageUrl }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await markKeyError(supabase, key.id, message, message.includes("429"));
      }
    }

    return new Response(JSON.stringify({
      error: "Nao foi possivel gerar a imagem com as chaves configuradas.",
    }), {
      status: 500,
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
