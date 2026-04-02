import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createServiceClient,
  safeJsonResponse,
} from "../_shared/video.ts";

const EFFECT_PRESETS: Record<string, Record<string, unknown>> = {
  parallax: { intensity: 0.28, reveal: "fade", pin: false, media_mode: "background" },
  sticky: { intensity: 0.12, reveal: "clip", pin: true, media_mode: "background" },
  reveal: { intensity: 0.18, reveal: "clip", pin: false, media_mode: "background" },
  horizontal: { intensity: 0.2, reveal: "slide", pin: false, media_mode: "background" },
  video_scrub: { intensity: 1, reveal: "scrub", pin: true, media_mode: "timeline" },
  text_reveal: { intensity: 0.22, reveal: "word", pin: false, media_mode: "background" },
  scale_fade: { intensity: 0.16, reveal: "scale_fade", pin: false, media_mode: "background" },
  tilt_3d: { intensity: 0.14, reveal: "tilt", pin: false, media_mode: "background" },
};

const titleFromObjective = (objective: string) =>
  objective.trim().split(/[.!?]/)[0].slice(0, 70) || "Nova secao motion";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();
    const {
      workspace_id,
      site_id,
      website_page_id,
      objective,
      section_name,
      scroll_effect_type = "parallax",
      supporting_text,
      cta_label,
      background_video_asset_id,
      background_image_asset_id,
      attach_to_page = false,
    } = await req.json() as {
      workspace_id?: string;
      site_id?: string | null;
      website_page_id?: string | null;
      objective?: string;
      section_name?: string | null;
      scroll_effect_type?: string;
      supporting_text?: string | null;
      cta_label?: string | null;
      background_video_asset_id?: string | null;
      background_image_asset_id?: string | null;
      attach_to_page?: boolean;
    };

    if (!workspace_id || !objective?.trim()) {
      return safeJsonResponse({ error: "workspace_id e objective sao obrigatorios." }, 400);
    }

    const { data: brandKit } = await supabase
      .from("brand_kits")
      .select("color_primary,color_secondary,color_accent,font_headline,font_body")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    const preset = EFFECT_PRESETS[scroll_effect_type] || EFFECT_PRESETS.parallax;
    const content = {
      headline: titleFromObjective(objective),
      body: supporting_text?.trim() || objective.trim(),
      cta: cta_label?.trim() || "Saiba mais",
      objective: objective.trim(),
    };

    const rendererConfig = {
      version: 1,
      effect: scroll_effect_type,
      preset,
      theme: {
        primary: brandKit?.color_primary || "#7C3AED",
        secondary: brandKit?.color_secondary || "#18181B",
        accent: brandKit?.color_accent || "#F59E0B",
        headline_font: brandKit?.font_headline || "Space Grotesk",
        body_font: brandKit?.font_body || "DM Sans",
      },
    };

    const codeBundle = {
      renderer: "motion-section-v1",
      component: "ScrollMotionSection",
      props: {
        effect: scroll_effect_type,
      },
    };

    const { data: section, error } = await supabase
      .from("scroll_sections")
      .insert({
        workspace_id,
        site_id: site_id || null,
        website_page_id: website_page_id || null,
        name: section_name?.trim() || titleFromObjective(objective),
        scroll_effect_type,
        status: "draft",
        content,
        renderer_config: rendererConfig,
        preview_data: {
          objective: objective.trim(),
          background_mode: background_video_asset_id ? "video" : background_image_asset_id ? "image" : "gradient",
        },
        background_video_asset_id: background_video_asset_id || null,
        background_image_asset_id: background_image_asset_id || null,
        code_bundle: codeBundle,
      })
      .select("*")
      .single();

    if (error || !section) {
      throw error || new Error("Nao foi possivel criar scroll_section.");
    }

    let attached = false;
    if (attach_to_page && website_page_id) {
      const { data: page, error: pageError } = await supabase
        .from("website_pages")
        .select("id,content_blocks")
        .eq("id", website_page_id)
        .single();

      if (pageError || !page) {
        throw pageError || new Error("Pagina do site nao encontrada para anexar a section.");
      }

      const blocks = Array.isArray(page.content_blocks) ? page.content_blocks : [];
      const nextBlocks = [
        ...blocks,
        {
          id: crypto.randomUUID(),
          type: "scroll_section_ref",
          effect: "none",
          content: {
            scroll_section_id: section.id,
            section_name: section.name,
          },
        },
      ];

      const { error: updateError } = await supabase
        .from("website_pages")
        .update({ content_blocks: nextBlocks })
        .eq("id", website_page_id);

      if (updateError) throw updateError;
      attached = true;
    }

    return safeJsonResponse({
      section_id: section.id,
      attached,
      section,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
