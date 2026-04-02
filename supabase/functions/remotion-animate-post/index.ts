import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createRemotionComposition,
  createServiceClient,
  logRemotionGeneration,
  queueRemotionRenderJob,
  readJsonBody,
  requireWorkspaceRow,
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
    const postId = toOptionalText(body.post_id);

    if (!workspaceId || !postId) {
      return safeJsonResponse({ error: "workspace_id e post_id sao obrigatorios." }, 400);
    }

    const supabase = createServiceClient();
    const post = await requireWorkspaceRow<{
      id: string;
      title?: string | null;
      caption?: string | null;
      slides_html?: unknown;
      slides_count?: number | null;
      storyboard_id?: string | null;
    }>(supabase, "posts_v2", workspaceId, postId, "Post");

    const template = await resolveTemplateByHint(supabase, workspaceId, {
      ...body,
      category: (post.slides_count || 1) > 1 ? "carousel" : "social_post",
      template_key: (post.slides_count || 1) > 1 ? "animated_carousel" : "social_post",
    });
    const brand = await resolveWorkspaceBrandBindings(supabase, workspaceId);
    const slides = Array.isArray(post.slides_html)
      ? post.slides_html.map((html, index) => ({
        title: typeof html === "string" ? `Slide ${index + 1}` : `Slide ${index + 1}`,
        body: typeof html === "string" ? html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 220) : "",
      }))
      : [];

    const composition = await createRemotionComposition(supabase, {
      workspaceId,
      sourcePostId: post.id,
      sourceStoryboardId: post.storyboard_id || null,
      name: post.title || "Animated Post",
      category: (post.slides_count || 1) > 1 ? "carousel" : "social_post",
      template,
      inputProps: {
        templateKey: template.template_key,
        title: post.title || "Animated Post",
        subtitle: post.caption || null,
        slides,
        dimensions: (post.slides_count || 1) > 1 ? { width: 1080, height: 1350 } : { width: 1080, height: 1080 },
        durationInFrames: Math.max(120, slides.length > 1 ? slides.length * 90 : 150),
        fps: 30,
        brand,
      },
      brandBindings: brand,
      metadata: {
        source_module: "generator_page",
        source_post_id: post.id,
      },
      generatedByAi: true,
      aiPrompt: `Animate post ${post.id}`,
    });

    await supabase
      .from("posts_v2")
      .update({
        remotion_composition_id: composition.id,
      })
      .eq("id", post.id)
      .eq("workspace_id", workspaceId);

    await logRemotionGeneration(supabase, {
      workspaceId,
      compositionId: composition.id,
      templateId: template.id,
      promptOriginal: `Animate post ${post.id}`,
      promptEnriched: JSON.stringify(composition.input_props),
      providerName: "cerebro",
      modelName: "template-guardrails",
      requestPayload: body,
      resultPayload: {
        post_id: post.id,
        template_key: template.template_key,
      },
    });

    if (toBoolean(body.run_now, false)) {
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
