import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createServiceClient,
  decodeDataUrl,
  safeJsonResponse,
  uploadBytesToAsset,
} from "../_shared/postgen.ts";

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const ASPECT_RATIO_MAP: Record<string, string> = {
  "1:1": "1:1",
  "4:5": "4:5",
  "9:16": "9:16",
  "16:9": "16:9",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      workspace_id,
      prompt,
      aspect_ratio,
      purpose,
      prompt_template_id,
      character_id,
      source_asset_id,
    } = await req.json() as {
      workspace_id?: string;
      prompt?: string;
      aspect_ratio?: string;
      purpose?: string;
      prompt_template_id?: string | null;
      character_id?: string | null;
      source_asset_id?: string | null;
    };

    if (!workspace_id || !prompt) {
      return safeJsonResponse({ error: "workspace_id e prompt sao obrigatorios." }, 400);
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return safeJsonResponse({ error: "LOVABLE_API_KEY nao configurada para gerar imagem." }, 500);
    }

    const response = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        aspectRatio: ASPECT_RATIO_MAP[aspect_ratio || "1:1"] || "1:1",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      return safeJsonResponse({ error: `Falha na geracao de imagem: ${await response.text()}` }, response.status);
    }

    const payload = await response.json();
    const imageUrl = payload?.choices?.[0]?.message?.images?.[0]?.image_url?.url as string | undefined;
    if (!imageUrl) {
      return safeJsonResponse({ error: "O provedor nao retornou imagem valida." }, 400);
    }

    const supabase = createServiceClient();
    let asset;
    if (imageUrl.startsWith("data:image/")) {
      const { bytes, contentType, extension } = decodeDataUrl(imageUrl);
      asset = await uploadBytesToAsset(supabase, {
        workspaceId: workspace_id,
        module: purpose || "prompt-studio",
        assetType: "generated-image",
        bytes,
        contentType,
        extension,
        metadata: {
          prompt,
          aspect_ratio: aspect_ratio || "1:1",
          source_asset_id: source_asset_id || null,
        },
        promptTemplateId: prompt_template_id || null,
        characterId: character_id || null,
      });
    } else {
      const imageResponse = await fetch(imageUrl);
      const arrayBuffer = await imageResponse.arrayBuffer();
      asset = await uploadBytesToAsset(supabase, {
        workspaceId: workspace_id,
        module: purpose || "prompt-studio",
        assetType: "generated-image",
        bytes: new Uint8Array(arrayBuffer),
        contentType: imageResponse.headers.get("content-type") || "image/png",
        extension: (imageResponse.headers.get("content-type") || "image/png").split("/")[1] || "png",
        metadata: {
          prompt,
          aspect_ratio: aspect_ratio || "1:1",
          source_asset_id: source_asset_id || null,
          external_url: imageUrl,
        },
        promptTemplateId: prompt_template_id || null,
        characterId: character_id || null,
      });
    }

    return safeJsonResponse({ asset });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
