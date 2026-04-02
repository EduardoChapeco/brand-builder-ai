import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";

export const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const createSignedAssetUrl = async (bucket: string, storagePath: string) => {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 60 * 30);
  if (error || !data?.signedUrl) {
    throw error || new Error("Failed to create signed asset url.");
  }
  return data.signedUrl;
};
