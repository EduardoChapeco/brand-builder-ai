import { supabase } from "./supabase.js";

export type ProviderCapability =
  | "speech_to_text"
  | "image_generation"
  | "image_to_video"
  | "background_removal"
  | "quality_enhancement";

const CAPABILITY_PRIORITY: Record<ProviderCapability, string[]> = {
  speech_to_text: ["elevenlabs"],
  image_generation: ["gemini"],
  image_to_video: ["runway", "kling", "luma", "minimax"],
  background_removal: ["removebg"],
  quality_enhancement: ["replicate"],
};

export const getProviderKey = async (
  workspaceId: string,
  capability: ProviderCapability,
  preferredProvider?: string | null,
) => {
  const priority = preferredProvider
    ? [preferredProvider, ...CAPABILITY_PRIORITY[capability].filter((item) => item !== preferredProvider)]
    : CAPABILITY_PRIORITY[capability];

  const { data, error } = await supabase
    .from("api_keys")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .in("provider", priority)
    .order("calls_today", { ascending: true });

  if (error) throw error;
  for (const provider of priority) {
    const candidate = (data || []).find(
      (row) => row.provider === provider && (row.calls_today || 0) < (row.daily_limit || 0),
    );
    if (candidate) return candidate;
  }
  return null;
};
