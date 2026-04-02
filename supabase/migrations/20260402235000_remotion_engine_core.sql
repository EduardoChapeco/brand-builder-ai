-- ============================================================
-- Remotion Engine - canonical motion layer for Video Studio
-- ============================================================

CREATE TABLE IF NOT EXISTS public.remotion_component_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  preset_key TEXT NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  contract_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_contract JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.remotion_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  template_key TEXT NOT NULL,
  thumbnail_url TEXT,
  preview_gif_url TEXT,
  props_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_props JSONB NOT NULL DEFAULT '{}'::jsonb,
  renderer_contract JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.remotion_compositions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  video_project_id UUID REFERENCES public.video_projects(id) ON DELETE SET NULL,
  source_post_id UUID REFERENCES public.posts_v2(id) ON DELETE SET NULL,
  source_storyboard_id UUID REFERENCES public.carousel_storyboards(id) ON DELETE SET NULL,
  source_scroll_section_id UUID REFERENCES public.scroll_sections(id) ON DELETE SET NULL,
  source_simlab_run_id UUID REFERENCES public.simlab_runs(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.remotion_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  template_key TEXT NOT NULL,
  remotion_composition_key TEXT NOT NULL DEFAULT 'CerebroMotionTemplate',
  props_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_props JSONB NOT NULL DEFAULT '{}'::jsonb,
  input_props JSONB NOT NULL DEFAULT '{}'::jsonb,
  timing_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  brand_bindings JSONB NOT NULL DEFAULT '{}'::jsonb,
  asset_requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  render_preset JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by_ai BOOLEAN NOT NULL DEFAULT FALSE,
  ai_prompt TEXT,
  experimental_code_path BOOLEAN NOT NULL DEFAULT FALSE,
  tsx_code TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.remotion_ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  composition_id UUID NOT NULL REFERENCES public.remotion_compositions(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.remotion_templates(id) ON DELETE SET NULL,
  prompt_original TEXT NOT NULL,
  prompt_enriched TEXT,
  model_name TEXT,
  provider_name TEXT,
  tokens_in INTEGER,
  tokens_out INTEGER,
  generation_ms INTEGER,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.remotion_component_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remotion_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remotion_compositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remotion_ai_generations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.video_jobs
  ADD COLUMN IF NOT EXISTS remotion_composition_id UUID;

ALTER TABLE public.video_exports
  ADD COLUMN IF NOT EXISTS remotion_composition_id UUID;

ALTER TABLE public.scroll_sections
  ADD COLUMN IF NOT EXISTS remotion_composition_id UUID;

ALTER TABLE public.posts_v2
  ADD COLUMN IF NOT EXISTS remotion_composition_id UUID;

ALTER TABLE public.carousel_storyboards
  ADD COLUMN IF NOT EXISTS remotion_composition_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'remotion_compositions_status_check') THEN
    ALTER TABLE public.remotion_compositions
      ADD CONSTRAINT remotion_compositions_status_check
      CHECK (status IN ('draft', 'ready', 'rendering', 'error', 'archived'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'remotion_component_presets_scope_key_unique') THEN
    ALTER TABLE public.remotion_component_presets
      ADD CONSTRAINT remotion_component_presets_scope_key_unique
      UNIQUE (workspace_id, preset_key);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'remotion_templates_scope_key_unique') THEN
    ALTER TABLE public.remotion_templates
      ADD CONSTRAINT remotion_templates_scope_key_unique
      UNIQUE (workspace_id, template_key, name);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_jobs_remotion_composition_id_fkey') THEN
    ALTER TABLE public.video_jobs
      ADD CONSTRAINT video_jobs_remotion_composition_id_fkey
      FOREIGN KEY (remotion_composition_id) REFERENCES public.remotion_compositions(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_exports_remotion_composition_id_fkey') THEN
    ALTER TABLE public.video_exports
      ADD CONSTRAINT video_exports_remotion_composition_id_fkey
      FOREIGN KEY (remotion_composition_id) REFERENCES public.remotion_compositions(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scroll_sections_remotion_composition_id_fkey') THEN
    ALTER TABLE public.scroll_sections
      ADD CONSTRAINT scroll_sections_remotion_composition_id_fkey
      FOREIGN KEY (remotion_composition_id) REFERENCES public.remotion_compositions(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_v2_remotion_composition_id_fkey') THEN
    ALTER TABLE public.posts_v2
      ADD CONSTRAINT posts_v2_remotion_composition_id_fkey
      FOREIGN KEY (remotion_composition_id) REFERENCES public.remotion_compositions(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carousel_storyboards_remotion_composition_id_fkey') THEN
    ALTER TABLE public.carousel_storyboards
      ADD CONSTRAINT carousel_storyboards_remotion_composition_id_fkey
      FOREIGN KEY (remotion_composition_id) REFERENCES public.remotion_compositions(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS remotion_component_presets_workspace_category_idx
  ON public.remotion_component_presets(workspace_id, category, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS remotion_templates_workspace_category_idx
  ON public.remotion_templates(workspace_id, category, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS remotion_compositions_workspace_status_idx
  ON public.remotion_compositions(workspace_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS remotion_compositions_template_key_idx
  ON public.remotion_compositions(template_key, remotion_composition_key);

CREATE INDEX IF NOT EXISTS remotion_ai_generations_workspace_created_idx
  ON public.remotion_ai_generations(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS video_jobs_remotion_composition_idx
  ON public.video_jobs(remotion_composition_id, created_at DESC);

CREATE INDEX IF NOT EXISTS video_exports_remotion_composition_idx
  ON public.video_exports(remotion_composition_id, created_at DESC);

CREATE INDEX IF NOT EXISTS scroll_sections_remotion_composition_idx
  ON public.scroll_sections(remotion_composition_id, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_remotion_component_presets_updated_at') THEN
    CREATE TRIGGER update_remotion_component_presets_updated_at
      BEFORE UPDATE ON public.remotion_component_presets
      FOR EACH ROW EXECUTE FUNCTION public.update_video_studio_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_remotion_templates_updated_at') THEN
    CREATE TRIGGER update_remotion_templates_updated_at
      BEFORE UPDATE ON public.remotion_templates
      FOR EACH ROW EXECUTE FUNCTION public.update_video_studio_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_remotion_compositions_updated_at') THEN
    CREATE TRIGGER update_remotion_compositions_updated_at
      BEFORE UPDATE ON public.remotion_compositions
      FOR EACH ROW EXECUTE FUNCTION public.update_video_studio_updated_at();
  END IF;
END;
$$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'remotion_component_presets',
    'remotion_templates',
    'remotion_compositions',
    'remotion_ai_generations'
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

INSERT INTO public.remotion_component_presets (
  workspace_id,
  preset_key,
  category,
  name,
  description,
  contract_schema,
  default_contract,
  metadata,
  is_system,
  is_active
)
SELECT * FROM (
  VALUES
    (
      NULL::UUID,
      'fade',
      'transition',
      'Fade',
      'Dissolve clean entre sequencias.',
      '{"durationFrames":{"type":"number","minimum":6,"maximum":45}}'::jsonb,
      '{"durationFrames":12}'::jsonb,
      '{"kind":"transition"}'::jsonb,
      TRUE,
      TRUE
    ),
    (
      NULL::UUID,
      'slide_left',
      'transition',
      'Slide Left',
      'Entrada lateral com deslocamento cinematografico.',
      '{"durationFrames":{"type":"number","minimum":6,"maximum":45}}'::jsonb,
      '{"durationFrames":14}'::jsonb,
      '{"kind":"transition"}'::jsonb,
      TRUE,
      TRUE
    ),
    (
      NULL::UUID,
      'tiktok_bold',
      'subtitle_style',
      'TikTok Bold',
      'Legenda palavra a palavra com pop e destaque.',
      '{"position":{"type":"string"},"highlightColor":{"type":"string"}}'::jsonb,
      '{"position":"center","highlightColor":"#F59E0B"}'::jsonb,
      '{"kind":"subtitle"}'::jsonb,
      TRUE,
      TRUE
    ),
    (
      NULL::UUID,
      'lower_third_clean',
      'overlay',
      'Lower Third Clean',
      'Barra de identificacao para talking heads e demos.',
      '{"position":{"type":"string"},"accentColor":{"type":"string"}}'::jsonb,
      '{"position":"bottom-left","accentColor":"#F59E0B"}'::jsonb,
      '{"kind":"overlay"}'::jsonb,
      TRUE,
      TRUE
    ),
    (
      NULL::UUID,
      'gradient_flow',
      'background_loop',
      'Gradient Flow',
      'Fundo de gradiente animado para hero e motion site.',
      '{"speed":{"type":"number"},"accentColor":{"type":"string"}}'::jsonb,
      '{"speed":0.55,"accentColor":"#8B5CF6"}'::jsonb,
      '{"kind":"background"}'::jsonb,
      TRUE,
      TRUE
    )
) AS seed (
  workspace_id,
  preset_key,
  category,
  name,
  description,
  contract_schema,
  default_contract,
  metadata,
  is_system,
  is_active
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.remotion_component_presets existing
  WHERE existing.workspace_id IS NOT DISTINCT FROM seed.workspace_id
    AND existing.preset_key = seed.preset_key
);

INSERT INTO public.remotion_templates (
  workspace_id,
  name,
  description,
  category,
  template_key,
  props_schema,
  default_props,
  renderer_contract,
  tags,
  is_system,
  is_public,
  is_active
)
SELECT * FROM (
  VALUES
    (
      NULL::UUID,
      'Social Post Motion',
      'Post quadrado ou retrato com headline, subtitulo e CTA animados.',
      'social_post',
      'social_post',
      '{"title":{"type":"string"},"subtitle":{"type":"string"},"ctaText":{"type":"string"}}'::jsonb,
      '{"title":"Headline da marca","subtitle":"Subtitulo com contexto","ctaText":"Saiba mais","dimensions":{"width":1080,"height":1080},"durationInFrames":150,"fps":30}'::jsonb,
      '{"previewMode":"player","supports":["gif","mp4"],"brandAware":true}'::jsonb,
      ARRAY['social','post','brand'],
      TRUE,
      TRUE,
      TRUE
    ),
    (
      NULL::UUID,
      'Story Vertical Motion',
      'Story/Reel 9:16 para headlines de alto impacto.',
      'story_vertical',
      'story_vertical',
      '{"title":{"type":"string"},"subtitle":{"type":"string"},"ctaText":{"type":"string"}}'::jsonb,
      '{"title":"Oferta principal","subtitle":"Contexto rapido","ctaText":"Deslize","dimensions":{"width":1080,"height":1920},"durationInFrames":150,"fps":30}'::jsonb,
      '{"previewMode":"player","supports":["mp4"],"brandAware":true}'::jsonb,
      ARRAY['story','reel','vertical'],
      TRUE,
      TRUE,
      TRUE
    ),
    (
      NULL::UUID,
      'Animated Carousel',
      'Sequencia em video baseada em slides e transicoes de carrossel.',
      'carousel',
      'animated_carousel',
      '{"slides":{"type":"array"},"transition":{"type":"string"}}'::jsonb,
      '{"slides":[{"title":"Slide 1","body":"Mensagem principal"},{"title":"Slide 2","body":"Desdobramento"}],"transition":"fade","dimensions":{"width":1080,"height":1350},"durationInFrames":180,"fps":30}'::jsonb,
      '{"previewMode":"player","supports":["mp4","gif"],"brandAware":true}'::jsonb,
      ARRAY['carousel','social','slides'],
      TRUE,
      TRUE,
      TRUE
    ),
    (
      NULL::UUID,
      'Logo Reveal',
      'Reveal do logo com tagline para intro e outro branded.',
      'branding',
      'logo_reveal',
      '{"title":{"type":"string"},"tagline":{"type":"string"}}'::jsonb,
      '{"title":"Marca","tagline":"Seu posicionamento aqui","dimensions":{"width":1920,"height":1080},"durationInFrames":120,"fps":30}'::jsonb,
      '{"previewMode":"player","supports":["mp4","webm"],"brandAware":true}'::jsonb,
      ARRAY['branding','intro','logo'],
      TRUE,
      TRUE,
      TRUE
    ),
    (
      NULL::UUID,
      'Hero Background Loop',
      'Loop animado para hero e motion sections do Site Builder.',
      'motion_site',
      'hero_background',
      '{"headline":{"type":"string"},"body":{"type":"string"}}'::jsonb,
      '{"headline":"Hero background","body":"Loop animado","dimensions":{"width":1920,"height":1080},"durationInFrames":240,"fps":30}'::jsonb,
      '{"previewMode":"player","supports":["mp4","webm"],"brandAware":true}'::jsonb,
      ARRAY['site','hero','background'],
      TRUE,
      TRUE,
      TRUE
    ),
    (
      NULL::UUID,
      'Data Summary Video',
      'Video de KPIs e relatorios para SimLab, analytics e resultados.',
      'data_video',
      'data_summary',
      '{"title":{"type":"string"},"dataPoints":{"type":"array"}}'::jsonb,
      '{"title":"Resultados","dataPoints":[{"label":"Engajamento","value":42},{"label":"CTR","value":18}],"dimensions":{"width":1920,"height":1080},"durationInFrames":180,"fps":30}'::jsonb,
      '{"previewMode":"player","supports":["mp4"],"brandAware":true}'::jsonb,
      ARRAY['data','kpi','report'],
      TRUE,
      TRUE,
      TRUE
    )
) AS seed (
  workspace_id,
  name,
  description,
  category,
  template_key,
  props_schema,
  default_props,
  renderer_contract,
  tags,
  is_system,
  is_public,
  is_active
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.remotion_templates existing
  WHERE existing.workspace_id IS NOT DISTINCT FROM seed.workspace_id
    AND existing.template_key = seed.template_key
    AND existing.name = seed.name
);
