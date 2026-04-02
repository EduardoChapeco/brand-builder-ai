import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createServiceClient, safeJsonResponse } from "../_shared/postgen.ts";
import { upsertCharacterBindings } from "../_shared/simlab.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, character_id, binding } = await req.json() as {
      workspace_id?: string;
      character_id?: string;
      binding?: Record<string, unknown>;
    };

    if (!workspace_id || !character_id || !binding) {
      return safeJsonResponse({ error: "workspace_id, character_id e binding sao obrigatorios." }, 400);
    }

    const personaIds = Array.isArray(binding.persona_ids)
      ? binding.persona_ids.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : typeof binding.persona_id === "string" && binding.persona_id.trim().length > 0
        ? [binding.persona_id.trim()]
        : [];

    if (personaIds.length === 0) {
      return safeJsonResponse({ error: "binding.persona_id ou binding.persona_ids e obrigatorio." }, 400);
    }

    const supabase = createServiceClient();
    const saved = await upsertCharacterBindings(
      supabase,
      workspace_id,
      character_id,
      personaIds.map((personaId) => ({
        persona_id: personaId,
        persona_version_id: typeof binding.persona_version_id === "string" ? binding.persona_version_id : null,
        binding_type: typeof binding.binding_type === "string" ? binding.binding_type : null,
        alignment_score: typeof binding.alignment_score === "number" ? binding.alignment_score : null,
        binding_notes: typeof binding.binding_notes === "string" ? binding.binding_notes : null,
        created_by: typeof binding.created_by === "string" ? binding.created_by : null,
      })),
    );
    return safeJsonResponse({ bindings: saved });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
