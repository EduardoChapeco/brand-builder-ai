import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createRemotionComposition,
  createServiceClient,
  logRemotionGeneration,
  queueRemotionRenderJob,
  readJsonBody,
  resolveTemplateByHint,
  resolveWorkspaceBrandBindings,
  respondForQueuedJob,
  safeJsonResponse,
  toBoolean,
  toOptionalText,
} from "../_shared/remotion.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await readJsonBody(req);
    const workspaceId = toOptionalText(body.workspace_id);
    const brandingKind = toOptionalText(body.branding_kind) || "logo_reveal";
    const runNow = toBoolean(body.run_now, false);

    if (!workspaceId) {
      return safeJsonResponse({ error: "workspace_id e obrigatorio." }, 400);
    }

    const supabase = createServiceClient();
    const brand = await resolveWorkspaceBrandBindings(supabase, workspaceId);

    const template = await resolveTemplateByHint(supabase, workspaceId, {
      ...body,
      category: "branding",
      template_key: brandingKind === "lower_third" ? "logo_reveal" : brandingKind,
    });

    const composition = await createRemotionComposition(supabase, {
      workspaceId,
      name: toOptionalText(body.name) || `Brand ${brandingKind}`,
      category: "branding",
      template,
      inputProps: {
        templateKey: brandingKind === "lower_third" ? "logo_reveal" : template.template_key,
        title: toOptionalText(body.title) || brand.watermarkText || "Brand Reveal",
        tagline: toOptionalText(body.tagline) || "Cerebro Brand Motion",
        subtitle: toOptionalText(body.subtitle),
        ctaText: toOptionalText(body.ctaText),
        lowerThird: brandingKind === "lower_third"
          ? {
            name: toOptionalText(body.person_name) || "Nome Sobrenome",
            title: toOptionalText(body.person_title) || "Cargo / Funcao",
            position: toOptionalText(body.position) || "bottom-left",
          }
          : null,
        dimensions: { width: 1920, height: 1080 },
        durationInFrames: brandingKind === "intro" || brandingKind === "outro" ? 120 : 90,
        fps: 30,
        brand,
      },
      brandBindings: brand,
      metadata: {
        source_module: "brand_kit",
        branding_kind: brandingKind,
      },
      generatedByAi: true,
      aiPrompt: `Generate branding motion: ${brandingKind}`,
    });

    await logRemotionGeneration(supabase, {
      workspaceId,
      compositionId: composition.id,
      templateId: template.id,
      promptOriginal: `Generate branding motion: ${brandingKind}`,
      promptEnriched: JSON.stringify(composition.input_props),
      providerName: "cerebro",
      modelName: "template-guardrails",
      requestPayload: body,
      resultPayload: { branding_kind: brandingKind },
    });

    if (runNow) {
      const { job, dispatch } = await queueRemotionRenderJob(supabase, {
        workspaceId,
        composition,
      });

      return respondForQueuedJob({
        jobId: String(job.id),
        accepted: dispatch.dispatched,
        dispatchError: dispatch.error || null,
        composition,
      });
    }

    return safeJsonResponse({
      composition_id: composition.id,
      composition,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
