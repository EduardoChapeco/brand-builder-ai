import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type ApiKeyProvider =
  | "openrouter"
  | "groq"
  | "openai"
  | "anthropic"
  | "firecrawl"
  | "elevenlabs"
  | "runway"
  | "kling"
  | "replicate"
  | "stability"
  | "gemini"
  | "steel"
  | "luma"
  | "minimax"
  | "removebg";

export interface KeyOrchestratorOptions {
  workspaceId: string;
  provider: ApiKeyProvider;
  preferFast?: boolean;
  excludeKeyIds?: string[];
}

type ApiKeyRow = {
  id: string;
  provider: string;
  alias: string | null;
  key_value: string | null;
  key_encrypted: string | null;
  key_preview: string | null;
  calls_today: number | null;
  daily_limit: number | null;
  last_429_at: string | null;
  is_active: boolean | null;
};

const decryptApiKey = async (
  supabase: ReturnType<typeof createClient>,
  keyId: string,
): Promise<string | null> => {
  const appSecret = Deno.env.get("APP_ENCRYPTION_SECRET");
  if (!appSecret) return null;

  const { data, error } = await supabase.rpc("get_api_key", {
    p_key_id: keyId,
    p_app_secret: appSecret,
  });

  if (error) {
    console.warn("[key-orchestrator] rpc get_api_key failed:", error.message);
    return null;
  }

  return typeof data === "string" && data.length > 0 ? data : null;
};

export async function getNextKey(
  opts: KeyOrchestratorOptions,
  supabase: ReturnType<typeof createClient>,
): Promise<{ keyId: string; keyDecrypted: string; keyPreview: string | null } | null> {
  const { data, error } = await supabase
    .from("workspace_api_keys")
    .select("id,provider:service,alias:label,key_value,key_encrypted,key_preview,calls_today,daily_limit,last_429_at,is_active")
    .eq("workspace_id", opts.workspaceId)
    .eq("service", opts.provider)
    .eq("is_active", true)
    .order("calls_today", { ascending: true });

  if (error) throw error;

  const available = ((data || []) as ApiKeyRow[]).filter((key) => {
    if (opts.excludeKeyIds?.includes(key.id)) return false;
    if ((key.calls_today || 0) >= (key.daily_limit || 0)) return false;
    if (key.last_429_at && new Date(key.last_429_at).getTime() > Date.now() - 60_000) return false;
    return true;
  });

  for (const key of available) {
    const decrypted = (await decryptApiKey(supabase, key.id)) || key.key_value;
    if (!decrypted) continue;

    void supabase
      .from("workspace_api_keys")
      .update({
        calls_today: (key.calls_today || 0) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", key.id);

    return {
      keyId: key.id,
      keyDecrypted: decrypted,
      keyPreview: key.key_preview,
    };
  }

  return null;
}

export async function markKeyAs429(
  keyId: string,
  supabase: ReturnType<typeof createClient>,
): Promise<void> {
  await supabase
    .from("workspace_api_keys")
    .update({ last_429_at: new Date().toISOString() })
    .eq("id", keyId);
}
