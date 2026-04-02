import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createServiceClient, safeJsonResponse } from "../_shared/postgen.ts";
import { SimlabValidationType, dispatchSimlabRun } from "../_shared/simlab.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      workspace_id,
      validation_type,
      module_type,
      stimulus_type,
      objective,
      audience_hint,
      target_ref,
      variants,
      request_payload,
      context_policy,
      requested_by,
      wait_for_completion = false,
      timeout_ms,
    } = await req.json() as {
      workspace_id?: string;
      validation_type?: SimlabValidationType;
      module_type?: string;
      stimulus_type?: string;
      objective?: string;
      audience_hint?: string;
      target_ref?: { table?: string; id?: string } | null;
      variants?: Array<{ key?: string; label?: string; artifact?: Record<string, unknown> }>;
      request_payload?: Record<string, unknown>;
      context_policy?: Record<string, unknown>;
      requested_by?: string;
      wait_for_completion?: boolean;
      timeout_ms?: number;
    };

    if (!workspace_id || !validation_type || !module_type || !stimulus_type) {
      return safeJsonResponse({ error: "workspace_id, validation_type, module_type e stimulus_type sao obrigatorios." }, 400);
    }

    const normalizedVariants = Array.isArray(variants)
      ? variants
          .map((variant, index) => ({
            key: typeof variant?.key === "string" && variant.key.trim().length > 0 ? variant.key.trim() : `variant_${index + 1}`,
            label: typeof variant?.label === "string" && variant.label.trim().length > 0 ? variant.label.trim() : `Variant ${index + 1}`,
            artifact: variant?.artifact && typeof variant.artifact === "object" && !Array.isArray(variant.artifact)
              ? variant.artifact
              : {},
          }))
          .filter((variant) => Object.keys(variant.artifact).length > 0)
      : [];

    if (normalizedVariants.length === 0) {
      return safeJsonResponse({ error: "Pelo menos uma variant valida e obrigatoria." }, 400);
    }

    const supabase = createServiceClient();
    const result = await dispatchSimlabRun(supabase, {
      workspaceId: workspace_id,
      validationType: validation_type,
      moduleType: module_type,
      stimulusType: stimulus_type,
      targetTable: target_ref?.table || null,
      targetId: target_ref?.id || null,
      objective: objective || null,
      audienceHint: audience_hint || null,
      variants: normalizedVariants,
      requestPayload: request_payload || {},
      contextPolicy: context_policy || {},
      requestedBy: requested_by || "edge_dispatch",
      waitForCompletion: Boolean(wait_for_completion),
      timeoutMs: typeof timeout_ms === "number" ? timeout_ms : undefined,
    });

    return safeJsonResponse({
      run_id: result.run.id,
      status: result.run.status,
      verdict: result.run.verdict,
      summary: result.insight?.executive_summary || result.run.failure_reason || null,
      insight: result.insight,
      variants: result.variants,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
