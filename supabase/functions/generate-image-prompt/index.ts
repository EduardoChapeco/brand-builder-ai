import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createServiceClient, runJsonTask, safeJsonResponse } from "../_shared/postgen.ts";

type PromptVariable = {
  id: string;
  label: string;
  placeholder: string;
  type: "text" | "color" | "select" | "toggle";
};

const replaceToken = (template: string, token: string, value: string) =>
  template.replace(new RegExp(`\\[${token}\\]`, "g"), value).replace(new RegExp(`\\{${token}\\}`, "g"), value);

const platformDefaults: Record<string, { prefix?: string; suffix: string; notes: string }> = {
  midjourney: {
    suffix: "--ar {ratio} --v 6 --style raw --q 2 --stylize 750",
    notes: "Adicione --no text antes dos parametros finais para evitar lettering.",
  },
  dalle3: {
    prefix: "IMPORTANT: Do not add any text to the image. ",
    suffix: "Photorealistic. High resolution. No watermarks. No text overlays.",
    notes: "DALL·E 3 tende a inventar palavras se o prompt nao bloquear texto.",
  },
  gemini_imagen: {
    suffix: "Generate image. No text. No watermarks.",
    notes: "Gemini Imagen responde melhor a instrucoes diretas e descritivas.",
  },
  firefly: {
    suffix: "Generative Fill disabled. No text. Professional quality.",
    notes: "Firefly responde bem a termos fotograficos e composicao clara.",
  },
  stable_diffusion: {
    suffix: ", masterpiece, best quality, photorealistic, 8k uhd, dslr",
    notes: "Use negative prompt separado para watermark, blur e distorcoes.",
  },
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      workspace_id,
      template_id,
      variables,
      platform,
      aspect_ratio,
      include_brand_params,
      character_id,
      generate_variants,
    } = await req.json() as {
      workspace_id?: string;
      template_id?: string;
      variables?: Record<string, string>;
      platform?: string;
      aspect_ratio?: string;
      include_brand_params?: boolean;
      character_id?: string | null;
      generate_variants?: boolean;
    };

    if (!workspace_id || !template_id || !platform) {
      return safeJsonResponse({ error: "workspace_id, template_id e platform sao obrigatorios." }, 400);
    }

    const supabase = createServiceClient();
    const [{ data: template }, { data: brandKit }, { data: character }] = await Promise.all([
      supabase.from("image_prompt_templates").select("*").eq("id", template_id).single(),
      supabase.from("brand_kits").select("*").eq("workspace_id", workspace_id).maybeSingle(),
      character_id
        ? supabase.from("brand_characters").select("*").eq("id", character_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    if (!template) {
      return safeJsonResponse({ error: "Template de prompt nao encontrado." }, 404);
    }

    const variableDefs = Array.isArray(template.variables) ? template.variables as unknown as PromptVariable[] : [];
    const mergedValues = { ...(template.default_values as Record<string, string> | null || {}), ...(variables || {}) };

    let prompt = template.base_template;
    for (const definition of variableDefs) {
      const value = mergedValues[definition.id] || definition.placeholder || "";
      prompt = replaceToken(prompt, definition.id, value);
      prompt = replaceToken(prompt, definition.id.toUpperCase(), value);
    }

    if (include_brand_params && brandKit) {
      const palette = [brandKit.color_primary, brandKit.color_secondary, brandKit.color_accent].filter(Boolean).join(", ");
      prompt = replaceToken(prompt, "PALETA_DA_MARCA", palette);
      prompt = replaceToken(prompt, "BRAND_COLORS", palette);
      prompt = replaceToken(prompt, "COLOR_PALETTE", palette);
    }

    if (character?.seed_prompt) {
      prompt = `${character.seed_prompt}\n\n${prompt}`;
    }

    const platformConfig = {
      ...platformDefaults[platform],
      ...((template.platform_params as Record<string, { prefix?: string; suffix?: string; notes?: string }> | null)?.[platform] || {}),
    };
    const suffix = (platformConfig.suffix || platformDefaults[platform]?.suffix || "").replace("{ratio}", aspect_ratio || "1:1");
    if (platformConfig.prefix) {
      prompt = `${platformConfig.prefix}${prompt}`;
    }
    prompt = replaceToken(prompt, "TARGET_PLATFORM_PARAMS", suffix);
    if (!prompt.includes(suffix)) {
      prompt = `${prompt}\n${suffix}`;
    }

    let variants: string[] = [];
    if (generate_variants) {
      const variantResult = await runJsonTask<{ variants?: string[] }>(
        supabase,
        workspace_id,
        `Voce gera variacoes de prompt para imagem. Responda apenas JSON valido: {"variants":["string","string","string"]}`,
        `Prompt base:\n${prompt}\n\nGere 3 variacoes mantendo o estilo principal, mas variando angulo, iluminacao e cenario.`,
        ["groq", "openrouter", "gemini"],
        { variants: [] },
      );
      variants = Array.isArray(variantResult.variants) ? variantResult.variants.slice(0, 3) : [];
    }

    await supabase
      .from("image_prompt_templates")
      .update({ usage_count: (template.usage_count || 0) + 1 })
      .eq("id", template.id);

    return safeJsonResponse({
      prompt: prompt.trim(),
      warnings: [platformConfig.notes || platformDefaults[platform]?.notes || "Revise o prompt antes de enviar."].filter(Boolean),
      variants,
      template,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
