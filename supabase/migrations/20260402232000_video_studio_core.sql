-- ============================================================
-- Video Studio - canonical media hub schema
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_video_studio_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.video_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  ratio TEXT NOT NULL DEFAULT '16:9',
  fps INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'draft',
  active_timeline_version_id UUID,
  latest_export_id UUID,
  latest_subtitle_track_id UUID,
  latest_analysis_job_id UUID,
  latest_source_asset_id UUID,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.video_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  video_project_id UUID REFERENCES public.video_projects(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  source_asset_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  bucket_name TEXT NOT NULL DEFAULT 'video-assets',
  storage_path TEXT NOT NULL,
  public_url TEXT,
  mime_type TEXT,
  file_name TEXT,
  file_size_bytes BIGINT,
  width INTEGER,
  height INTEGER,
  duration_ms INTEGER,
  waveform_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'uploaded',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.video_timeline_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  video_project_id UUID NOT NULL REFERENCES public.video_projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  timeline_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  command_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (video_project_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.video_subtitle_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  video_project_id UUID NOT NULL REFERENCES public.video_projects(id) ON DELETE CASCADE,
  source_asset_id UUID REFERENCES public.video_assets(id) ON DELETE SET NULL,
  language_code TEXT NOT NULL DEFAULT 'pt-BR',
  provider_name TEXT,
  transcript_text TEXT,
  words_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  style_preset TEXT NOT NULL DEFAULT 'youtube_subtitle',
  style_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  latest_job_id UUID,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.video_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  video_project_id UUID NOT NULL REFERENCES public.video_projects(id) ON DELETE CASCADE,
  export_preset TEXT NOT NULL,
  ratio TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  fps INTEGER NOT NULL DEFAULT 30,
  format TEXT NOT NULL DEFAULT 'mp4',
  codec TEXT NOT NULL DEFAULT 'h264',
  status TEXT NOT NULL DEFAULT 'queued',
  output_asset_id UUID,
  latest_job_id UUID,
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_generated_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  video_project_id UUID REFERENCES public.video_projects(id) ON DELETE SET NULL,
  title TEXT,
  prompt_original TEXT NOT NULL,
  prompt_composed JSONB NOT NULL DEFAULT '{}'::jsonb,
  style_template TEXT,
  camera_movement TEXT,
  lighting_preset TEXT,
  quality_module JSONB NOT NULL DEFAULT '{}'::jsonb,
  negative_prompt TEXT,
  keyframe_asset_id UUID,
  video_asset_id UUID,
  provider_name TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'draft',
  credits_used NUMERIC(12,4) NOT NULL DEFAULT 0,
  latest_job_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.video_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_kind TEXT NOT NULL DEFAULT 'generation',
  thumbnail_url TEXT,
  style_module JSONB NOT NULL DEFAULT '{}'::jsonb,
  camera_module JSONB NOT NULL DEFAULT '{}'::jsonb,
  lighting_module JSONB NOT NULL DEFAULT '{}'::jsonb,
  quality_module JSONB NOT NULL DEFAULT '{}'::jsonb,
  negative_prompt TEXT,
  preview_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.layer_compositions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  video_project_id UUID REFERENCES public.video_projects(id) ON DELETE SET NULL,
  prompt_original TEXT NOT NULL,
  layers JSONB NOT NULL DEFAULT '[]'::jsonb,
  canvas_width INTEGER NOT NULL DEFAULT 1080,
  canvas_height INTEGER NOT NULL DEFAULT 1080,
  final_asset_id UUID,
  status TEXT NOT NULL DEFAULT 'draft',
  latest_job_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scroll_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.websites(id) ON DELETE SET NULL,
  website_page_id UUID REFERENCES public.website_pages(id) ON DELETE SET NULL,
  source_generation_id UUID REFERENCES public.ai_generated_videos(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  scroll_effect_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  section_order INTEGER NOT NULL DEFAULT 0,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  renderer_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  background_video_asset_id UUID,
  background_image_asset_id UUID,
  latest_job_id UUID,
  code_bundle JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  video_project_id UUID REFERENCES public.video_projects(id) ON DELETE CASCADE,
  timeline_version_id UUID REFERENCES public.video_timeline_versions(id) ON DELETE SET NULL,
  subtitle_track_id UUID REFERENCES public.video_subtitle_tracks(id) ON DELETE SET NULL,
  export_id UUID REFERENCES public.video_exports(id) ON DELETE SET NULL,
  generation_id UUID REFERENCES public.ai_generated_videos(id) ON DELETE SET NULL,
  layer_composition_id UUID REFERENCES public.layer_compositions(id) ON DELETE SET NULL,
  scroll_section_id UUID REFERENCES public.scroll_sections(id) ON DELETE SET NULL,
  output_asset_id UUID REFERENCES public.video_assets(id) ON DELETE SET NULL,
  job_type TEXT NOT NULL,
  provider_capability TEXT,
  provider_name TEXT,
  model_name TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  priority INTEGER NOT NULL DEFAULT 100,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  last_heartbeat_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  cost_total NUMERIC(12,4) NOT NULL DEFAULT 0,
  latency_ms INTEGER,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.video_job_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_job_id UUID NOT NULL REFERENCES public.video_jobs(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.video_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_timeline_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_subtitle_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generated_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layer_compositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scroll_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_job_steps ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_projects_status_check') THEN
    ALTER TABLE public.video_projects
      ADD CONSTRAINT video_projects_status_check
      CHECK (status IN ('draft', 'ingesting', 'ready', 'processing', 'failed', 'archived'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_assets_asset_type_check') THEN
    ALTER TABLE public.video_assets
      ADD CONSTRAINT video_assets_asset_type_check
      CHECK (asset_type IN ('video', 'audio', 'image', 'generated_video', 'generated_image', 'subtitle_file'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_exports_status_check') THEN
    ALTER TABLE public.video_exports
      ADD CONSTRAINT video_exports_status_check
      CHECK (status IN ('queued', 'rendering', 'completed', 'failed'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_generated_videos_status_check') THEN
    ALTER TABLE public.ai_generated_videos
      ADD CONSTRAINT ai_generated_videos_status_check
      CHECK (status IN ('draft', 'keyframe_ready', 'approved', 'rendering', 'completed', 'failed'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_jobs_status_check') THEN
    ALTER TABLE public.video_jobs
      ADD CONSTRAINT video_jobs_status_check
      CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_job_steps_status_check') THEN
    ALTER TABLE public.video_job_steps
      ADD CONSTRAINT video_job_steps_status_check
      CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scroll_sections_effect_type_check') THEN
    ALTER TABLE public.scroll_sections
      ADD CONSTRAINT scroll_sections_effect_type_check
      CHECK (scroll_effect_type IN ('parallax', 'sticky', 'reveal', 'horizontal', 'video_scrub', 'text_reveal', 'scale_fade', 'tilt_3d'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_projects_active_timeline_version_id_fkey') THEN
    ALTER TABLE public.video_projects
      ADD CONSTRAINT video_projects_active_timeline_version_id_fkey
      FOREIGN KEY (active_timeline_version_id) REFERENCES public.video_timeline_versions(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_projects_latest_export_id_fkey') THEN
    ALTER TABLE public.video_projects
      ADD CONSTRAINT video_projects_latest_export_id_fkey
      FOREIGN KEY (latest_export_id) REFERENCES public.video_exports(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_projects_latest_subtitle_track_id_fkey') THEN
    ALTER TABLE public.video_projects
      ADD CONSTRAINT video_projects_latest_subtitle_track_id_fkey
      FOREIGN KEY (latest_subtitle_track_id) REFERENCES public.video_subtitle_tracks(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_projects_latest_analysis_job_id_fkey') THEN
    ALTER TABLE public.video_projects
      ADD CONSTRAINT video_projects_latest_analysis_job_id_fkey
      FOREIGN KEY (latest_analysis_job_id) REFERENCES public.video_jobs(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_projects_latest_source_asset_id_fkey') THEN
    ALTER TABLE public.video_projects
      ADD CONSTRAINT video_projects_latest_source_asset_id_fkey
      FOREIGN KEY (latest_source_asset_id) REFERENCES public.video_assets(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_subtitle_tracks_latest_job_id_fkey') THEN
    ALTER TABLE public.video_subtitle_tracks
      ADD CONSTRAINT video_subtitle_tracks_latest_job_id_fkey
      FOREIGN KEY (latest_job_id) REFERENCES public.video_jobs(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_exports_output_asset_id_fkey') THEN
    ALTER TABLE public.video_exports
      ADD CONSTRAINT video_exports_output_asset_id_fkey
      FOREIGN KEY (output_asset_id) REFERENCES public.video_assets(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_exports_latest_job_id_fkey') THEN
    ALTER TABLE public.video_exports
      ADD CONSTRAINT video_exports_latest_job_id_fkey
      FOREIGN KEY (latest_job_id) REFERENCES public.video_jobs(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_generated_videos_keyframe_asset_id_fkey') THEN
    ALTER TABLE public.ai_generated_videos
      ADD CONSTRAINT ai_generated_videos_keyframe_asset_id_fkey
      FOREIGN KEY (keyframe_asset_id) REFERENCES public.video_assets(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_generated_videos_video_asset_id_fkey') THEN
    ALTER TABLE public.ai_generated_videos
      ADD CONSTRAINT ai_generated_videos_video_asset_id_fkey
      FOREIGN KEY (video_asset_id) REFERENCES public.video_assets(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_generated_videos_latest_job_id_fkey') THEN
    ALTER TABLE public.ai_generated_videos
      ADD CONSTRAINT ai_generated_videos_latest_job_id_fkey
      FOREIGN KEY (latest_job_id) REFERENCES public.video_jobs(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'layer_compositions_final_asset_id_fkey') THEN
    ALTER TABLE public.layer_compositions
      ADD CONSTRAINT layer_compositions_final_asset_id_fkey
      FOREIGN KEY (final_asset_id) REFERENCES public.video_assets(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'layer_compositions_latest_job_id_fkey') THEN
    ALTER TABLE public.layer_compositions
      ADD CONSTRAINT layer_compositions_latest_job_id_fkey
      FOREIGN KEY (latest_job_id) REFERENCES public.video_jobs(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scroll_sections_background_video_asset_id_fkey') THEN
    ALTER TABLE public.scroll_sections
      ADD CONSTRAINT scroll_sections_background_video_asset_id_fkey
      FOREIGN KEY (background_video_asset_id) REFERENCES public.video_assets(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scroll_sections_background_image_asset_id_fkey') THEN
    ALTER TABLE public.scroll_sections
      ADD CONSTRAINT scroll_sections_background_image_asset_id_fkey
      FOREIGN KEY (background_image_asset_id) REFERENCES public.video_assets(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scroll_sections_latest_job_id_fkey') THEN
    ALTER TABLE public.scroll_sections
      ADD CONSTRAINT scroll_sections_latest_job_id_fkey
      FOREIGN KEY (latest_job_id) REFERENCES public.video_jobs(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS video_projects_workspace_status_idx
  ON public.video_projects(workspace_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS video_assets_project_type_idx
  ON public.video_assets(video_project_id, asset_type, created_at DESC);

CREATE INDEX IF NOT EXISTS video_timeline_versions_project_active_idx
  ON public.video_timeline_versions(video_project_id, is_active, version_number DESC);

CREATE INDEX IF NOT EXISTS video_subtitle_tracks_project_created_idx
  ON public.video_subtitle_tracks(video_project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS video_exports_project_status_idx
  ON public.video_exports(video_project_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_generated_videos_workspace_status_idx
  ON public.ai_generated_videos(workspace_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS layer_compositions_workspace_status_idx
  ON public.layer_compositions(workspace_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS scroll_sections_workspace_site_idx
  ON public.scroll_sections(workspace_id, site_id, created_at DESC);

CREATE INDEX IF NOT EXISTS video_jobs_workspace_status_priority_idx
  ON public.video_jobs(workspace_id, status, priority ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS video_job_steps_job_step_idx
  ON public.video_job_steps(video_job_id, step_key, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_video_projects_updated_at') THEN
    CREATE TRIGGER update_video_projects_updated_at
      BEFORE UPDATE ON public.video_projects
      FOR EACH ROW EXECUTE FUNCTION public.update_video_studio_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_video_assets_updated_at') THEN
    CREATE TRIGGER update_video_assets_updated_at
      BEFORE UPDATE ON public.video_assets
      FOR EACH ROW EXECUTE FUNCTION public.update_video_studio_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_video_timeline_versions_updated_at') THEN
    CREATE TRIGGER update_video_timeline_versions_updated_at
      BEFORE UPDATE ON public.video_timeline_versions
      FOR EACH ROW EXECUTE FUNCTION public.update_video_studio_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_video_subtitle_tracks_updated_at') THEN
    CREATE TRIGGER update_video_subtitle_tracks_updated_at
      BEFORE UPDATE ON public.video_subtitle_tracks
      FOR EACH ROW EXECUTE FUNCTION public.update_video_studio_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_video_exports_updated_at') THEN
    CREATE TRIGGER update_video_exports_updated_at
      BEFORE UPDATE ON public.video_exports
      FOR EACH ROW EXECUTE FUNCTION public.update_video_studio_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_ai_generated_videos_updated_at') THEN
    CREATE TRIGGER update_ai_generated_videos_updated_at
      BEFORE UPDATE ON public.ai_generated_videos
      FOR EACH ROW EXECUTE FUNCTION public.update_video_studio_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_video_templates_updated_at') THEN
    CREATE TRIGGER update_video_templates_updated_at
      BEFORE UPDATE ON public.video_templates
      FOR EACH ROW EXECUTE FUNCTION public.update_video_studio_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_layer_compositions_updated_at') THEN
    CREATE TRIGGER update_layer_compositions_updated_at
      BEFORE UPDATE ON public.layer_compositions
      FOR EACH ROW EXECUTE FUNCTION public.update_video_studio_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_scroll_sections_updated_at') THEN
    CREATE TRIGGER update_scroll_sections_updated_at
      BEFORE UPDATE ON public.scroll_sections
      FOR EACH ROW EXECUTE FUNCTION public.update_video_studio_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_video_jobs_updated_at') THEN
    CREATE TRIGGER update_video_jobs_updated_at
      BEFORE UPDATE ON public.video_jobs
      FOR EACH ROW EXECUTE FUNCTION public.update_video_studio_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_video_job_steps_updated_at') THEN
    CREATE TRIGGER update_video_job_steps_updated_at
      BEFORE UPDATE ON public.video_job_steps
      FOR EACH ROW EXECUTE FUNCTION public.update_video_studio_updated_at();
  END IF;
END;
$$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'video_projects',
    'video_assets',
    'video_timeline_versions',
    'video_subtitle_tracks',
    'video_exports',
    'ai_generated_videos',
    'video_templates',
    'layer_compositions',
    'scroll_sections',
    'video_jobs',
    'video_job_steps'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = table_name
        AND policyname = format('Allow all for %s', table_name)
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL USING (true) WITH CHECK (true)',
        format('Allow all for %s', table_name),
        table_name
      );
    END IF;
  END LOOP;
END;
$$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('video-assets', 'video-assets', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

INSERT INTO public.video_templates (
  workspace_id,
  name,
  description,
  template_kind,
  style_module,
  camera_module,
  lighting_module,
  quality_module,
  negative_prompt,
  preview_json,
  is_public,
  is_system
)
SELECT * FROM (
  VALUES
    (
      NULL::UUID,
      'Talking Head Viral',
      'Template vertical focado em conteudo falado com look social-first.',
      'generation',
      '{"id":"social_viral","prompt":"eye-catching colors, high contrast, dynamic composition, mobile optimized"}'::jsonb,
      '{"id":"zoom_in","prompt":"slow zoom in, rack focus"}'::jsonb,
      '{"id":"natural","prompt":"natural daylight, window light, soft shadows"}'::jsonb,
      '{"id":"clean_social","prompt":"clean skin detail, crisp edges, stable face framing"}'::jsonb,
      'low quality, watermark, subtitles baked in, distorted hands, deformed face',
      '{"ratio":"9:16","duration_seconds":5}'::jsonb,
      TRUE,
      TRUE
    ),
    (
      NULL::UUID,
      'Product Showcase',
      'Template para produto hero com orbita e luz de estúdio.',
      'generation',
      '{"id":"hyperrealistic_8k","prompt":"photorealistic, 8K ultra HD, shot on Sony A7 IV, sharp details"}'::jsonb,
      '{"id":"orbit","prompt":"circular orbit shot, 360 camera movement"}'::jsonb,
      '{"id":"studio","prompt":"studio lighting setup, three-point lighting, professional illumination"}'::jsonb,
      '{"id":"product_crisp","prompt":"macro detail, premium reflections, high fidelity"}'::jsonb,
      'blur, low detail, watermark, typography, deformed geometry',
      '{"ratio":"1:1","duration_seconds":5}'::jsonb,
      TRUE,
      TRUE
    ),
    (
      NULL::UUID,
      'Cinematic Storytelling',
      'Template para cenas narrativas com dolly e golden hour.',
      'generation',
      '{"id":"cinematic_hollywood","prompt":"cinematic color grading, film grain, anamorphic lens, shallow DOF"}'::jsonb,
      '{"id":"dolly_in","prompt":"dolly in shot, camera tracking forward"}'::jsonb,
      '{"id":"golden_hour","prompt":"golden hour lighting, warm tones, long shadows, magic hour"}'::jsonb,
      '{"id":"cinematic_finish","prompt":"soft bloom, tasteful grain, premium dynamic range"}'::jsonb,
      'watermark, low quality, text overlay, extra limbs, broken anatomy',
      '{"ratio":"16:9","duration_seconds":10}'::jsonb,
      TRUE,
      TRUE
    ),
    (
      NULL::UUID,
      'Urban Street Style',
      'Template handheld documental para lifestyle e moda.',
      'generation',
      '{"id":"documentary","prompt":"handheld camera feel, natural lighting, authentic atmosphere, journalistic"}'::jsonb,
      '{"id":"handheld","prompt":"handheld camera, slight shake, documentary feel"}'::jsonb,
      '{"id":"natural","prompt":"natural daylight, window light, soft shadows"}'::jsonb,
      '{"id":"texture_authentic","prompt":"natural motion blur, street texture, candid feeling"}'::jsonb,
      'watermark, low quality, staged composition, unreadable faces',
      '{"ratio":"9:16","duration_seconds":5}'::jsonb,
      TRUE,
      TRUE
    ),
    (
      NULL::UUID,
      'Corporate Professional',
      'Template B2B limpo com camera estática e luz de estúdio.',
      'generation',
      '{"id":"corporate_clean","prompt":"clean professional look, soft lighting, neutral background"}'::jsonb,
      '{"id":"static","prompt":"static camera, tripod shot, no movement"}'::jsonb,
      '{"id":"studio","prompt":"studio lighting setup, three-point lighting, professional illumination"}'::jsonb,
      '{"id":"corporate_clean","prompt":"clean whites, balanced contrast, presentation-ready"}'::jsonb,
      'watermark, text overlay, extreme lens distortion, broken anatomy',
      '{"ratio":"16:9","duration_seconds":5}'::jsonb,
      TRUE,
      TRUE
    )
) AS seed (
  workspace_id,
  name,
  description,
  template_kind,
  style_module,
  camera_module,
  lighting_module,
  quality_module,
  negative_prompt,
  preview_json,
  is_public,
  is_system
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.video_templates existing
  WHERE existing.workspace_id IS NULL
    AND existing.name = seed.name
);
