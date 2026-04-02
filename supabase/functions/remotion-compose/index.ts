import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createRemotionComposition,
  createServiceClient,
  logRemotionGeneration,
  mergeRecords,
  readJsonBody,
  requireWorkspaceRow,
  resolveTemplateByHint,
  resolveWorkspaceBrandBindings,
  safeJsonResponse,
  toNumber,
  toOptionalText,
  toRecord,
} from "../_shared/remotion.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await readJsonBody(req);
    const workspaceId = toOptionalText(body.workspace_id);
    const projectId = toOptionalText(body.project_id);
    const promptOriginal = toOptionalText(body.prompt_original) || toOptionalText(body.prompt);
    const category = toOptionalText(body.category) || "social_post";
    const name = toOptionalText(body.name) || toOptionalText(body.title) || "Remotion Composition";

    if (!workspaceId) {
      return safeJsonResponse({ error: "workspace_id e obrigatorio." }, 400);
    }

    const supabase = createServiceClient();
    if (projectId) {
      await requireWorkspaceRow(supabase, "video_projects", workspaceId, projectId, "Projeto de video");
    }

    const template = await resolveTemplateByHint(supabase, workspaceId, body);
    const brand = await resolveWorkspaceBrandBindings(supabase, workspaceId);
    const dimensions = mergeRecords(
      toRecord(template.default_props).dimensions,
      toRecord(body.dimensions),
    );

    const durationInFrames = toNumber(
      body.durationInFrames,
      toNumber(toRecord(template.default_props).durationInFrames, 150),
    );
    const fps = toNumber(body.fps, toNumber(toRecord(template.default_props).fps, 30));

    const inputProps = mergeRecords(
      template.default_props,
      {
        templateKey: template.template_key,
        title: toOptionalText(body.title) || promptOriginal || template.name,
        subtitle: toOptionalText(body.subtitle) || toOptionalText(body.description),
        ctaText: toOptionalText(body.ctaText) || toOptionalText(body.cta_label),
        tagline: toOptionalText(body.tagline),
        slides: Array.isArray(body.slides) ? body.slides : [],
        dataPoints: Array.isArray(body.dataPoints) ? body.dataPoints : [],
        dimensions: {
          width: toNumber(dimensions.width, 1920),
          height: toNumber(dimensions.height, 1080),
        },
        durationInFrames,
        fps,
        brand,
      },
      toRecord(body.input_props),
    );

    const composition = await createRemotionComposition(supabase, {
      workspaceId,
      videoProjectId: projectId,
      name,
      category,
      template,
      inputProps,
      timingOverrides: toRecord(body.timing_overrides),
      brandBindings: brand,
      assetRequirements: toRecord(body.asset_requirements),
      renderPreset: mergeRecords(template.renderer_contract, toRecord(body.render_preset)),
      metadata: mergeRecords(
        toRecord(body.metadata),
        {
          source_module: toOptionalText(body.source_module) || "video_studio_motion",
          source_ref: toRecord(body.source_ref),
        },
      ),
      generatedByAi: true,
      aiPrompt: promptOriginal,
    });

    if (promptOriginal) {
      await logRemotionGeneration(supabase, {
        workspaceId,
        compositionId: composition.id,
        templateId: template.id,
        promptOriginal,
        promptEnriched: JSON.stringify(inputProps),
        providerName: "cerebro",
        modelName: "template-guardrails",
        requestPayload: body,
        resultPayload: {
          template_key: template.template_key,
          category,
          input_props: inputProps,
        },
      });
    }

    return safeJsonResponse({
      composition_id: composition.id,
      composition,
      props_schema: composition.props_schema,
      default_props: composition.default_props,
      renderer_contract: composition.render_preset,
      template: {
        id: template.id,
        name: template.name,
        template_key: template.template_key,
        category: template.category,
      },
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
