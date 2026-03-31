import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export type WorkspaceApiKey = {
  id: string;
  provider: string;
  key_value: string;
  calls_today: number | null;
  daily_limit: number | null;
  is_active: boolean | null;
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

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
      model: "google/gemini-3-flash-preview",
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

export const runJsonTask = async <T>(
  supabase: ReturnType<typeof createServiceClient>,
  workspaceId: string,
  systemPrompt: string,
  userPrompt: string,
  providers = ["groq", "openrouter", "gemini"],
  fallback?: T,
): Promise<T> => {
  const gatewayResponse = await invokeGateway(systemPrompt, userPrompt);
  if (gatewayResponse) {
    try {
      return extractJson<T>(gatewayResponse);
    } catch (error) {
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
      return extractJson<T>(content);
    } catch (error) {
      await markKeyUsage(supabase, key, { errorMessage: error instanceof Error ? error.message : String(error) });
    }
  }

  if (fallback !== undefined) return fallback;
  throw new Error("Nenhuma chave de IA disponivel para executar a tarefa.");
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
