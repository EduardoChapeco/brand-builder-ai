import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createServiceClient,
  readJsonBody,
  requireWorkspaceRow,
  safeJsonResponse,
  toOptionalText,
  toRecord,
} from "../_shared/remotion.ts";

type CompositionRow = {
  id: string;
  input_props: Record<string, unknown>;
  timing_overrides: Record<string, unknown>;
};

const applyInstructionPatch = (
  inputProps: Record<string, unknown>,
  timingOverrides: Record<string, unknown>,
  instruction: string | null,
) => {
  const nextInput = { ...inputProps };
  const nextTiming = { ...timingOverrides };
  const changes: string[] = [];
  const lower = (instruction || "").toLowerCase();

  if (!lower) {
    return { nextInput, nextTiming, changes };
  }

  if (lower.includes("mais rapido") || lower.includes("faster")) {
    const current = typeof nextInput.durationInFrames === "number" ? nextInput.durationInFrames : 150;
    nextInput.durationInFrames = Math.max(60, Math.round(current * 0.8));
    changes.push("durationInFrames -20%");
  }

  if (lower.includes("mais devagar") || lower.includes("slower")) {
    const current = typeof nextInput.durationInFrames === "number" ? nextInput.durationInFrames : 150;
    nextInput.durationInFrames = Math.round(current * 1.2);
    changes.push("durationInFrames +20%");
  }

  if (lower.includes("fundo preto") || lower.includes("background black")) {
    const brand = typeof nextInput.brand === "object" && nextInput.brand ? { ...(nextInput.brand as Record<string, unknown>) } : {};
    brand.backgroundColor = "#000000";
    nextInput.brand = brand;
    changes.push("brand.backgroundColor=#000000");
  }

  if (lower.includes("lower third")) {
    nextInput.lowerThird = {
      name: "Nome Sobrenome",
      title: "Cargo / Funcao",
      position: "bottom-left",
    };
    changes.push("lowerThird inserted");
  }

  if (lower.includes("fade")) {
    nextTiming.transition = "fade";
    changes.push("transition=fade");
  }

  return { nextInput, nextTiming, changes };
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await readJsonBody(req);
    const workspaceId = toOptionalText(body.workspace_id);
    const compositionId = toOptionalText(body.composition_id);
    const scrollSectionId = toOptionalText(body.scroll_section_id);
    const instruction = toOptionalText(body.instruction) || toOptionalText(body.edit_command);

    if (!workspaceId || (!compositionId && !scrollSectionId)) {
      return safeJsonResponse({ error: "workspace_id e composition_id ou scroll_section_id sao obrigatorios." }, 400);
    }

    const supabase = createServiceClient();
    let resolvedCompositionId = compositionId;

    if (!resolvedCompositionId && scrollSectionId) {
      const section = await requireWorkspaceRow<{ remotion_composition_id?: string | null }>(
        supabase,
        "scroll_sections",
        workspaceId,
        scrollSectionId,
        "Motion section",
      );
      resolvedCompositionId = typeof section.remotion_composition_id === "string" ? section.remotion_composition_id : null;
      if (!resolvedCompositionId) {
        return safeJsonResponse({ error: "A section nao possui remotion_composition_id ativo." }, 400);
      }
    }

    const composition = await requireWorkspaceRow<CompositionRow>(
      supabase,
      "remotion_compositions",
      workspaceId,
      resolvedCompositionId!,
      "Composicao Remotion",
    );

    const patch = toRecord(body.patch);
    const inputPatch = toRecord(patch.input_props);
    const timingPatch = toRecord(patch.timing_overrides);
    const autoPatch = applyInstructionPatch(
      composition.input_props || {},
      composition.timing_overrides || {},
      instruction,
    );

    const nextInputProps = {
      ...(composition.input_props || {}),
      ...autoPatch.nextInput,
      ...inputPatch,
    };

    const nextTimingOverrides = {
      ...(composition.timing_overrides || {}),
      ...autoPatch.nextTiming,
      ...timingPatch,
    };

    const { data, error } = await supabase
      .from("remotion_compositions")
      .update({
        input_props: nextInputProps,
        timing_overrides: nextTimingOverrides,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resolvedCompositionId)
      .select("*")
      .single();

    if (error || !data) {
      throw error || new Error("Nao foi possivel atualizar a composicao Remotion.");
    }

    return safeJsonResponse({
      composition_id: resolvedCompositionId,
      composition: data,
      change_summary: [
        ...autoPatch.changes,
        ...Object.keys(inputPatch).map((key) => `input_props.${key}`),
        ...Object.keys(timingPatch).map((key) => `timing_overrides.${key}`),
      ],
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
