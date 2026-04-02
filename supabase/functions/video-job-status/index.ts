import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createServiceClient,
  safeJsonResponse,
} from "../_shared/video.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();
    const { job_id, job_ids } = await req.json() as {
      job_id?: string;
      job_ids?: string[];
    };

    const ids = [job_id, ...(Array.isArray(job_ids) ? job_ids : [])]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

    if (ids.length === 0) {
      return safeJsonResponse({ error: "job_id ou job_ids sao obrigatorios." }, 400);
    }

    const { data: jobs, error } = await supabase
      .from("video_jobs")
      .select("*")
      .in("id", ids);

    if (error) throw error;

    const relatedExportIds = (jobs || []).map((job) => job.export_id).filter(Boolean);
    const relatedSubtitleIds = (jobs || []).map((job) => job.subtitle_track_id).filter(Boolean);
    const relatedGenerationIds = (jobs || []).map((job) => job.generation_id).filter(Boolean);
    const relatedSectionIds = (jobs || []).map((job) => job.scroll_section_id).filter(Boolean);

    const [{ data: exports }, { data: subtitles }, { data: generations }, { data: sections }] = await Promise.all([
      relatedExportIds.length
        ? supabase.from("video_exports").select("*").in("id", relatedExportIds)
        : Promise.resolve({ data: [] }),
      relatedSubtitleIds.length
        ? supabase.from("video_subtitle_tracks").select("*").in("id", relatedSubtitleIds)
        : Promise.resolve({ data: [] }),
      relatedGenerationIds.length
        ? supabase.from("ai_generated_videos").select("*").in("id", relatedGenerationIds)
        : Promise.resolve({ data: [] }),
      relatedSectionIds.length
        ? supabase.from("scroll_sections").select("*").in("id", relatedSectionIds)
        : Promise.resolve({ data: [] }),
    ]);

    const payload = (jobs || []).map((job) => ({
      job,
      export: (exports || []).find((item) => item.id === job.export_id) || null,
      subtitle_track: (subtitles || []).find((item) => item.id === job.subtitle_track_id) || null,
      generation: (generations || []).find((item) => item.id === job.generation_id) || null,
      scroll_section: (sections || []).find((item) => item.id === job.scroll_section_id) || null,
    }));

    return safeJsonResponse({
      jobs: payload,
      job: payload[0] || null,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
