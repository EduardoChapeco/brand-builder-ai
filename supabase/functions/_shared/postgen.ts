import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export type WorkspaceApiKey = {
  id: string;
  provider: string;
  alias?: string | null;
  key_value: string;
  calls_today: number | null;
  daily_limit: number | null;
  is_active: boolean | null;
};

export type BrandContext = {
  briefing: Record<string, unknown> | null;
  brandKit: Record<string, unknown> | null;
  system_context: string;
};

export type JsonTaskMeta = {
  provider: string | null;
  model: string | null;
  isFallback: boolean;
  attempts: Array<{
    provider: string;
    status: "success" | "error";
    message?: string;
  }>;
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_GATEWAY_MODEL = "google/gemini-3-flash-preview";

export const createServiceClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

export const extractJson = <T>(text: string): T => {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();
  return JSON.parse(jsonStr) as T;
};

export const safeJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export const listWorkspaceKeys = async (
  supabase: ReturnType<typeof createServiceClient>,
  workspaceId: string,
  providers: string[],
) => {
  const { data, error } = await supabase
    .from("api_keys")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .in("provider", providers)
    .order("calls_today", { ascending: true });

  if (error) throw error;
  return (data || []) as WorkspaceApiKey[];
};

export const selectWorkspaceKey = async (
  supabase: ReturnType<typeof createServiceClient>,
  workspaceId: string,
  providers: string[],
) => {
  const keys = await listWorkspaceKeys(supabase, workspaceId, providers);
  return keys.find((key) => (key.calls_today || 0) < (key.daily_limit || 0)) || null;
};

export const markKeyUsage = async (
  supabase: ReturnType<typeof createServiceClient>,
  key: WorkspaceApiKey,
  options: { exhausted?: boolean; errorMessage?: string } = {},
) => {
  const nextCalls = options.exhausted ? Math.max(key.daily_limit || 0, (key.calls_today || 0) + 1) : (key.calls_today || 0) + 1;
  await supabase
    .from("api_keys")
    .update({
      calls_today: nextCalls,
      last_used_at: new Date().toISOString(),
      last_error: options.errorMessage || null,
    })
    .eq("id", key.id);
};

const buildSystemContext = (
  briefing: Record<string, unknown> | null,
  brandKit: Record<string, unknown> | null,
) => {
  const keywords = Array.isArray(briefing?.keywords) ? briefing?.keywords.join(", ") : "";
  const pillars = Array.isArray(briefing?.content_pillars) ? JSON.stringify(briefing?.content_pillars) : "[]";
  const competitors = Array.isArray(briefing?.main_competitors) ? JSON.stringify(briefing?.main_competitors) : "[]";
  const palette = [
    brandKit?.color_primary,
    brandKit?.color_secondary,
    brandKit?.color_accent,
  ].filter(Boolean).join(", ");

  return `
## BRAND CONTEXT
Company: ${briefing?.company_name || "Workspace sem nome"}
Segment: ${briefing?.segment || "Nao informado"}
Audience: ${briefing?.target_audience || "Nao informado"}
Tone of voice: ${briefing?.tone_of_voice || "Nao informado"}
Main differentials: ${briefing?.main_differentials || "Nao informado"}
Pain points: ${briefing?.pain_points || "Nao informado"}
Avoid topics: ${briefing?.avoid_topics || "Nenhum"}
Keywords: ${keywords || "Nenhuma"}
Content pillars: ${pillars}
Competitors: ${competitors}
Brand DNA summary: ${briefing?.brand_dna || "Nao informado"}
Brand palette: ${palette || "Nao informada"}
Headline font: ${brandKit?.font_headline || "Nao informada"}
Body font: ${brandKit?.font_body || "Nao informada"}

RULES:
- Responder em Portugues do Brasil.
- Manter consistencia com o tom do workspace.
- Nunca inventar dados factuais quando houver URL ou artigo de referencia.
`.trim();
};

export const getBrandContext = async (
  supabase: ReturnType<typeof createServiceClient>,
  workspaceId: string,
): Promise<BrandContext> => {
  const [{ data: briefing }, { data: brandKit }] = await Promise.all([
    supabase.from("briefings").select("*").eq("workspace_id", workspaceId).maybeSingle(),
    supabase.from("brand_kits").select("*").eq("workspace_id", workspaceId).maybeSingle(),
  ]);

  return {
    briefing: (briefing as Record<string, unknown> | null) || null,
    brandKit: (brandKit as Record<string, unknown> | null) || null,
    system_context: buildSystemContext(
      (briefing as Record<string, unknown> | null) || null,
      (brandKit as Record<string, unknown> | null) || null,
    ),
  };
};

const invokeGateway = async (systemPrompt: string, userPrompt: string) => {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) return null;

  const response = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_GATEWAY_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    console.error("AI Gateway error:", response.status, await response.text());
    return null;
  }

  const payload = await response.json();
  return payload?.choices?.[0]?.message?.content as string | undefined;
};

const invokeGroq = async (key: WorkspaceApiKey, systemPrompt: string, userPrompt: string) => {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key.key_value}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json();
  return payload?.choices?.[0]?.message?.content as string;
};

const invokeOpenRouter = async (key: WorkspaceApiKey, systemPrompt: string, userPrompt: string) => {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key.key_value}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://postgen.app",
      "X-Title": "PostGen",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.3-70b-instruct:free",
      response_format: { type: "json_object" },
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json();
  return payload?.choices?.[0]?.message?.content as string;
};

const invokeGemini = async (key: WorkspaceApiKey, systemPrompt: string, userPrompt: string) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${key.key_value}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.4,
        },
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json();
  return payload?.candidates?.[0]?.content?.parts?.[0]?.text as string;
};

const getModelLabel = (provider: string | null) => {
  if (provider === "lovable_gateway") return AI_GATEWAY_MODEL;
  if (provider === "groq") return "llama-3.3-70b-versatile";
  if (provider === "openrouter") return "meta-llama/llama-3.3-70b-instruct:free";
  if (provider === "gemini") return "gemini-2.0-flash-exp";
  return null;
};

export const runJsonTaskDetailed = async <T>(
  supabase: ReturnType<typeof createServiceClient>,
  workspaceId: string,
  systemPrompt: string,
  userPrompt: string,
  providers = ["groq", "openrouter", "gemini"],
  fallback?: T,
): Promise<{ result: T; meta: JsonTaskMeta }> => {
  const attempts: JsonTaskMeta["attempts"] = [];
  const gatewayResponse = await invokeGateway(systemPrompt, userPrompt);
  if (gatewayResponse) {
    try {
      return {
        result: extractJson<T>(gatewayResponse),
        meta: {
          provider: "lovable_gateway",
          model: getModelLabel("lovable_gateway"),
          isFallback: false,
          attempts: [{ provider: "lovable_gateway", status: "success" }],
        },
      };
    } catch (error) {
      attempts.push({
        provider: "lovable_gateway",
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      });
      console.error("Gateway JSON parse error:", error);
    }
  }

  const keys = await listWorkspaceKeys(supabase, workspaceId, providers);
  for (const key of keys) {
    if ((key.calls_today || 0) >= (key.daily_limit || 0)) continue;

    try {
      const content = key.provider === "groq"
        ? await invokeGroq(key, systemPrompt, userPrompt)
        : key.provider === "openrouter"
          ? await invokeOpenRouter(key, systemPrompt, userPrompt)
          : await invokeGemini(key, systemPrompt, userPrompt);

      await markKeyUsage(supabase, key);
      attempts.push({ provider: key.provider, status: "success" });
      return {
        result: extractJson<T>(content),
        meta: {
          provider: key.provider,
          model: getModelLabel(key.provider),
          isFallback: false,
          attempts,
        },
      };
    } catch (error) {
      attempts.push({
        provider: key.provider,
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      });
      await markKeyUsage(supabase, key, { errorMessage: error instanceof Error ? error.message : String(error) });
    }
  }

  if (fallback !== undefined) {
    return {
      result: fallback,
      meta: {
        provider: null,
        model: null,
        isFallback: true,
        attempts,
      },
    };
  }
  throw new Error("Nenhuma chave de IA disponivel para executar a tarefa.");
};

export const runJsonTask = async <T>(
  supabase: ReturnType<typeof createServiceClient>,
  workspaceId: string,
  systemPrompt: string,
  userPrompt: string,
  providers = ["groq", "openrouter", "gemini"],
  fallback?: T,
): Promise<T> => {
  const { result } = await runJsonTaskDetailed(
    supabase,
    workspaceId,
    systemPrompt,
    userPrompt,
    providers,
    fallback,
  );
  return result;
};

export const callLLM = async <T>(
  supabase: ReturnType<typeof createServiceClient>,
  workspaceId: string,
  systemPrompt: string,
  userPrompt: string,
  fallback?: T,
) => runJsonTask<T>(
  supabase,
  workspaceId,
  systemPrompt,
  userPrompt,
  ["groq", "openrouter", "gemini"],
  fallback,
);

const replaceCaptureTokens = (
  input: unknown,
  tokens: Record<string, string>,
): unknown => {
  if (typeof input === "string") {
    return input.replace(/\{(\w+)\}/g, (_, key) => tokens[key] || "");
  }
  if (Array.isArray(input)) {
    return input.map((item) => replaceCaptureTokens(item, tokens));
  }
  if (input && typeof input === "object") {
    return Object.fromEntries(
      Object.entries(input as Record<string, unknown>).map(([key, value]) => [
        key,
        replaceCaptureTokens(value, tokens),
      ]),
    );
  }
  return input;
};

const getByPath = (value: unknown, path: string) => {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, value);
};

const tryParseKeyConfig = (raw: string) => {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
};

export const callImageGen = async (
  prompt: string,
  aspectRatio = "1:1",
) => {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) {
    throw new Error("LOVABLE_API_KEY nao configurada para gerar imagem.");
  }

  const response = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image-preview",
      aspectRatio,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Falha na geracao de imagem: ${await response.text()}`);
  }

  const payload = await response.json();
  const imageUrl = payload?.choices?.[0]?.message?.images?.[0]?.image_url?.url as string | undefined;
  if (!imageUrl) {
    throw new Error("O provedor nao retornou imagem valida.");
  }

  return imageUrl;
};

export const capturePageVisual = async (
  supabase: ReturnType<typeof createServiceClient>,
  workspaceId: string,
  targetUrl: string,
) => {
  const key = await selectWorkspaceKey(supabase, workspaceId, [
    "steel",
    "screenshot_api",
    "browserless",
    "browserless_io",
    "apify",
  ]);

  if (!key) {
    throw new Error("Nenhum provider visual configurado. Cadastre steel, screenshot_api ou browserless/apify nas API Keys.");
  }

  const captureWithScreenshotApi = async () => {
    const devices = [
      { device: "desktop", width: "1440", height: "2200" },
      { device: "mobile", width: "390", height: "2200" },
    ];

    const screenshots = [];
    for (const device of devices) {
      const params = new URLSearchParams({
        token: key.key_value,
        url: targetUrl,
        output: "json",
        file_type: "png",
        full_page: "true",
        width: device.width,
        height: device.height,
      });
      const response = await fetch(`https://shot.screenshotapi.net/screenshot?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`ScreenshotAPI ${response.status}: ${await response.text()}`);
      }
      const payload = await response.json();
      const screenshotUrl = payload?.screenshot || payload?.screenshot_url || payload?.url;
      if (!screenshotUrl) {
        throw new Error("ScreenshotAPI nao retornou URL de captura.");
      }
      screenshots.push({ device: device.device, url: screenshotUrl });
    }

    return {
      provider: key.provider,
      screenshots,
      visual_description: `Capturas geradas via ${key.provider} em desktop e mobile para ${targetUrl}.`,
    };
  };

  const captureWithConfigProvider = async () => {
    const config = tryParseKeyConfig(key.key_value);
    if (!config?.endpoint || typeof config.endpoint !== "string") {
      throw new Error(`Provider ${key.provider} exige key_value em JSON com "endpoint".`);
    }

    const devices = ["desktop", "mobile"];
    const screenshots = [];
    for (const device of devices) {
      const tokens = {
        url: targetUrl,
        device,
        token: typeof config.token === "string" ? config.token : key.key_value,
      };
      const endpoint = replaceCaptureTokens(config.endpoint, tokens) as string;
      const method = (typeof config.method === "string" ? config.method : "POST").toUpperCase();
      const headers = {
        "Content-Type": "application/json",
        ...(config.headers && typeof config.headers === "object" ? replaceCaptureTokens(config.headers, tokens) as Record<string, string> : {}),
      };

      const rawBody = config.body ? replaceCaptureTokens(config.body, tokens) : {
        url: targetUrl,
        device,
        fullPage: true,
      };

      const response = await fetch(endpoint, {
        method,
        headers,
        body: method === "GET" ? undefined : JSON.stringify(rawBody),
      });

      if (!response.ok) {
        throw new Error(`${key.provider} ${response.status}: ${await response.text()}`);
      }

      const payload = await response.json();
      const resultPath = typeof config.result_path === "string" ? config.result_path : "data.url";
      const screenshotUrl = getByPath(payload, resultPath);
      if (typeof screenshotUrl !== "string" || !screenshotUrl) {
        throw new Error(`Provider ${key.provider} nao retornou screenshot em ${resultPath}.`);
      }
      screenshots.push({ device, url: screenshotUrl });
    }

    return {
      provider: key.provider,
      screenshots,
      visual_description: `Capturas geradas via ${key.provider} para ${targetUrl}.`,
    };
  };

  try {
    const result = key.provider === "screenshot_api"
      ? await captureWithScreenshotApi()
      : await captureWithConfigProvider();
    await markKeyUsage(supabase, key);
    return result;
  } catch (error) {
    await markKeyUsage(supabase, key, { errorMessage: error instanceof Error ? error.message : String(error) });
    throw error;
  }
};

export const scrapeDomWithFirecrawl = async (
  supabase: ReturnType<typeof createServiceClient>,
  workspaceId: string,
  targetUrl: string,
) => {
  const key = await selectWorkspaceKey(supabase, workspaceId, ["firecrawl"]);
  if (!key) {
    throw new Error("Nenhuma chave Firecrawl ativa encontrada no workspace.");
  }

  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key.key_value}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: targetUrl,
        formats: ["markdown", "html"],
      }),
    });

    if (!response.ok) {
      throw new Error(`Firecrawl ${response.status}: ${await response.text()}`);
    }

    const payload = await response.json();
    await markKeyUsage(supabase, key);
    return {
      markdown: payload?.data?.markdown as string | undefined,
      html: payload?.data?.html as string | undefined,
      metadata: payload?.data?.metadata || payload?.metadata || null,
    };
  } catch (error) {
    await markKeyUsage(supabase, key, { errorMessage: error instanceof Error ? error.message : String(error) });
    throw error;
  }
};

export const uploadBytesToAsset = async (
  supabase: ReturnType<typeof createServiceClient>,
  params: {
    workspaceId: string;
    module: string;
    assetType: string;
    bytes: Uint8Array;
    contentType: string;
    extension: string;
    metadata?: Record<string, unknown>;
    promptTemplateId?: string | null;
    characterId?: string | null;
  },
) => {
  const fileName = `${params.module}/${params.workspaceId}/${crypto.randomUUID()}.${params.extension}`;
  const { error } = await supabase.storage
    .from("postgen_assets")
    .upload(fileName, params.bytes, {
      contentType: params.contentType,
      upsert: false,
    });

  if (error) throw error;

  const publicUrl = supabase.storage.from("postgen_assets").getPublicUrl(fileName).data.publicUrl;
  const { data: asset, error: assetError } = await supabase
    .from("media_assets")
    .insert({
      workspace_id: params.workspaceId,
      module: params.module,
      asset_type: params.assetType,
      storage_path: fileName,
      public_url: publicUrl,
      metadata: params.metadata || {},
      prompt_template_id: params.promptTemplateId || null,
      character_id: params.characterId || null,
    })
    .select("*")
    .single();

  if (assetError) throw assetError;
  return asset;
};

export const uploadAsset = uploadBytesToAsset;

export const decodeDataUrl = (dataUrl: string) => {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    throw new Error("Data URL invalida.");
  }
  const [, contentType, base64] = match;
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const extension = contentType.split("/")[1] || "png";
  return { bytes, contentType, extension };
};
