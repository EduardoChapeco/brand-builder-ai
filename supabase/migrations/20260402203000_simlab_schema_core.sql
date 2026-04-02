-- ============================================================
-- SimLab v2 - core schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.update_simlab_updated_at()
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

CREATE OR REPLACE FUNCTION public.simlab_run_workspace_id(p_run_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id
  FROM public.simlab_runs
  WHERE id = p_run_id;
$$;

CREATE OR REPLACE FUNCTION public.simlab_run_can_access(p_run_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.workspace_member_can_access(public.simlab_run_workspace_id(p_run_id));
$$;

CREATE OR REPLACE FUNCTION public.simlab_run_can_write(p_run_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.workspace_member_can_write(public.simlab_run_workspace_id(p_run_id));
$$;

CREATE OR REPLACE FUNCTION public.simlab_run_can_admin(p_run_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.workspace_member_can_admin(public.simlab_run_workspace_id(p_run_id));
$$;

CREATE OR REPLACE FUNCTION public.simlab_persona_can_access(p_persona_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.simlab_personas p
    WHERE p.id = p_persona_id
      AND (
        (p.workspace_id IS NULL AND p.is_system = TRUE)
        OR public.workspace_member_can_access(p.workspace_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.simlab_persona_can_write(p_persona_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.simlab_personas p
    WHERE p.id = p_persona_id
      AND p.workspace_id IS NOT NULL
      AND public.workspace_member_can_admin(p.workspace_id)
  );
$$;

CREATE TABLE IF NOT EXISTS public.simlab_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  display_name TEXT NOT NULL,
  persona_code TEXT NOT NULL,
  persona_group TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'pt-BR',
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  is_system BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'active',
  current_version_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.simlab_persona_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID NOT NULL REFERENCES public.simlab_personas(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  version_label TEXT NOT NULL DEFAULT 'v1',
  summary TEXT NOT NULL,
  profile_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  trigger_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  calibration_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  prompt_template TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.simlab_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_type TEXT NOT NULL,
  stimulus_type TEXT NOT NULL,
  objective TEXT NOT NULL,
  audience_hint TEXT,
  target_ref TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  verdict TEXT,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  context_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  n_personas INTEGER NOT NULL DEFAULT 2,
  n_agents_per_persona INTEGER NOT NULL DEFAULT 5,
  perturbation_rate NUMERIC(5,4) NOT NULL DEFAULT 0.2000,
  selected_persona_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  model_name TEXT,
  provider_name TEXT,
  winning_variant_id UUID,
  failure_reason TEXT,
  total_cost NUMERIC(12,4),
  total_latency_ms INTEGER,
  result_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.simlab_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.simlab_runs(id) ON DELETE CASCADE,
  variant_key TEXT NOT NULL,
  variant_order INTEGER NOT NULL DEFAULT 0,
  label TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  rendered_text TEXT,
  score NUMERIC(8,4),
  verdict TEXT,
  is_winner BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.simlab_run_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.simlab_runs(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES public.simlab_personas(id) ON DELETE CASCADE,
  persona_version_id UUID NOT NULL REFERENCES public.simlab_persona_versions(id) ON DELETE RESTRICT,
  agent_index INTEGER NOT NULL DEFAULT 0,
  perturbation_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  context_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  prompt_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_name TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  error_message TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.simlab_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.simlab_runs(id) ON DELETE CASCADE,
  run_agent_id UUID REFERENCES public.simlab_run_agents(id) ON DELETE SET NULL,
  persona_id UUID NOT NULL REFERENCES public.simlab_personas(id) ON DELETE CASCADE,
  persona_version_id UUID NOT NULL REFERENCES public.simlab_persona_versions(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES public.simlab_variants(id) ON DELETE SET NULL,
  response_text TEXT NOT NULL,
  response_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  sentiment_score NUMERIC(6,4),
  interest_score NUMERIC(6,4),
  action_intent TEXT,
  trigger_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  barrier_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  latency_ms INTEGER,
  token_usage JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.simlab_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.simlab_runs(id) ON DELETE CASCADE,
  verdict TEXT NOT NULL,
  executive_summary TEXT NOT NULL,
  aggregate_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  segment_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  trigger_map JSONB NOT NULL DEFAULT '{}'::jsonb,
  zone_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  top_improvements JSONB NOT NULL DEFAULT '[]'::jsonb,
  variant_rankings JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_alert JSONB NOT NULL DEFAULT '{}'::jsonb,
  synthesis_model TEXT,
  synthesis_prompt_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.simlab_module_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_type TEXT NOT NULL,
  policy_key TEXT NOT NULL DEFAULT 'default',
  policy_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.simlab_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  simlab_run_id UUID REFERENCES public.simlab_runs(id) ON DELETE SET NULL,
  source_module TEXT NOT NULL,
  source_record_type TEXT NOT NULL,
  source_record_id TEXT,
  metric_key TEXT NOT NULL,
  metric_value NUMERIC(12,4),
  observation_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.simlab_character_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES public.brand_characters(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES public.simlab_personas(id) ON DELETE SET NULL,
  persona_version_id UUID REFERENCES public.simlab_persona_versions(id) ON DELETE SET NULL,
  binding_type TEXT NOT NULL DEFAULT 'validation',
  alignment_score NUMERIC(6,4),
  binding_notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.simlab_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simlab_persona_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simlab_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simlab_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simlab_run_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simlab_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simlab_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simlab_module_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simlab_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simlab_character_bindings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.posts_v2
  ADD COLUMN IF NOT EXISTS latest_simlab_run_id UUID,
  ADD COLUMN IF NOT EXISTS simlab_status TEXT,
  ADD COLUMN IF NOT EXISTS simlab_validated_at TIMESTAMPTZ;

ALTER TABLE public.blog_articles
  ADD COLUMN IF NOT EXISTS latest_simlab_run_id UUID,
  ADD COLUMN IF NOT EXISTS simlab_status TEXT,
  ADD COLUMN IF NOT EXISTS simlab_validated_at TIMESTAMPTZ;

ALTER TABLE public.bio_links
  ADD COLUMN IF NOT EXISTS latest_simlab_run_id UUID,
  ADD COLUMN IF NOT EXISTS simlab_status TEXT,
  ADD COLUMN IF NOT EXISTS simlab_validated_at TIMESTAMPTZ;

ALTER TABLE public.brand_characters
  ADD COLUMN IF NOT EXISTS latest_simlab_run_id UUID,
  ADD COLUMN IF NOT EXISTS simlab_status TEXT,
  ADD COLUMN IF NOT EXISTS simlab_validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS character_kind TEXT;

ALTER TABLE public.news_items
  ADD COLUMN IF NOT EXISTS latest_simlab_run_id UUID,
  ADD COLUMN IF NOT EXISTS simlab_status TEXT,
  ADD COLUMN IF NOT EXISTS simlab_validated_at TIMESTAMPTZ;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'brand_characters_character_kind_check'
  ) THEN
    ALTER TABLE public.brand_characters
      ADD CONSTRAINT brand_characters_character_kind_check
      CHECK (character_kind IN ('mascot', 'spokesperson', 'influencer'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'posts_v2_latest_simlab_run_id_fkey'
  ) THEN
    ALTER TABLE public.posts_v2
      ADD CONSTRAINT posts_v2_latest_simlab_run_id_fkey
      FOREIGN KEY (latest_simlab_run_id)
      REFERENCES public.simlab_runs(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blog_articles_latest_simlab_run_id_fkey'
  ) THEN
    ALTER TABLE public.blog_articles
      ADD CONSTRAINT blog_articles_latest_simlab_run_id_fkey
      FOREIGN KEY (latest_simlab_run_id)
      REFERENCES public.simlab_runs(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bio_links_latest_simlab_run_id_fkey'
  ) THEN
    ALTER TABLE public.bio_links
      ADD CONSTRAINT bio_links_latest_simlab_run_id_fkey
      FOREIGN KEY (latest_simlab_run_id)
      REFERENCES public.simlab_runs(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'brand_characters_latest_simlab_run_id_fkey'
  ) THEN
    ALTER TABLE public.brand_characters
      ADD CONSTRAINT brand_characters_latest_simlab_run_id_fkey
      FOREIGN KEY (latest_simlab_run_id)
      REFERENCES public.simlab_runs(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'news_items_latest_simlab_run_id_fkey'
  ) THEN
    ALTER TABLE public.news_items
      ADD CONSTRAINT news_items_latest_simlab_run_id_fkey
      FOREIGN KEY (latest_simlab_run_id)
      REFERENCES public.simlab_runs(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS simlab_personas_slug_uniq ON public.simlab_personas(slug);
CREATE UNIQUE INDEX IF NOT EXISTS simlab_personas_code_uniq ON public.simlab_personas(persona_code);
CREATE INDEX IF NOT EXISTS simlab_personas_workspace_status_idx ON public.simlab_personas(workspace_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS simlab_persona_versions_persona_version_uniq
  ON public.simlab_persona_versions(persona_id, version_number);
CREATE INDEX IF NOT EXISTS simlab_persona_versions_persona_idx
  ON public.simlab_persona_versions(persona_id, created_at DESC);
CREATE INDEX IF NOT EXISTS simlab_runs_workspace_status_idx
  ON public.simlab_runs(workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS simlab_runs_module_status_idx
  ON public.simlab_runs(module_type, status, created_at DESC);
CREATE INDEX IF NOT EXISTS simlab_variants_run_order_idx
  ON public.simlab_variants(run_id, variant_order);
CREATE INDEX IF NOT EXISTS simlab_run_agents_run_persona_idx
  ON public.simlab_run_agents(run_id, persona_id, agent_index);
CREATE INDEX IF NOT EXISTS simlab_responses_run_idx
  ON public.simlab_responses(run_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS simlab_insights_run_uniq
  ON public.simlab_insights(run_id);
CREATE INDEX IF NOT EXISTS simlab_module_policies_workspace_module_idx
  ON public.simlab_module_policies(workspace_id, module_type, policy_key);
CREATE INDEX IF NOT EXISTS simlab_observations_workspace_metric_idx
  ON public.simlab_observations(workspace_id, source_module, metric_key, observed_at DESC);
CREATE INDEX IF NOT EXISTS simlab_character_bindings_workspace_character_idx
  ON public.simlab_character_bindings(workspace_id, character_id, persona_id);
CREATE INDEX IF NOT EXISTS posts_v2_latest_simlab_run_id_idx
  ON public.posts_v2(latest_simlab_run_id);
CREATE INDEX IF NOT EXISTS blog_articles_latest_simlab_run_id_idx
  ON public.blog_articles(latest_simlab_run_id);
CREATE INDEX IF NOT EXISTS bio_links_latest_simlab_run_id_idx
  ON public.bio_links(latest_simlab_run_id);
CREATE INDEX IF NOT EXISTS brand_characters_latest_simlab_run_id_idx
  ON public.brand_characters(latest_simlab_run_id);
CREATE INDEX IF NOT EXISTS news_items_latest_simlab_run_id_idx
  ON public.news_items(latest_simlab_run_id);
CREATE INDEX IF NOT EXISTS brand_characters_character_kind_idx
  ON public.brand_characters(character_kind);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'simlab_personas_current_version_fkey'
  ) THEN
    ALTER TABLE public.simlab_personas
      ADD CONSTRAINT simlab_personas_current_version_fkey
      FOREIGN KEY (current_version_id)
      REFERENCES public.simlab_persona_versions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'simlab_runs_winning_variant_fkey'
  ) THEN
    ALTER TABLE public.simlab_runs
      ADD CONSTRAINT simlab_runs_winning_variant_fkey
      FOREIGN KEY (winning_variant_id)
      REFERENCES public.simlab_variants(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_simlab_updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_simlab_personas_updated_at') THEN
    CREATE TRIGGER update_simlab_personas_updated_at
      BEFORE UPDATE ON public.simlab_personas
      FOR EACH ROW EXECUTE FUNCTION public.update_simlab_updated_at();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_simlab_updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_simlab_persona_versions_updated_at') THEN
    CREATE TRIGGER update_simlab_persona_versions_updated_at
      BEFORE UPDATE ON public.simlab_persona_versions
      FOR EACH ROW EXECUTE FUNCTION public.update_simlab_updated_at();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_simlab_updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_simlab_runs_updated_at') THEN
    CREATE TRIGGER update_simlab_runs_updated_at
      BEFORE UPDATE ON public.simlab_runs
      FOR EACH ROW EXECUTE FUNCTION public.update_simlab_updated_at();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_simlab_updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_simlab_variants_updated_at') THEN
    CREATE TRIGGER update_simlab_variants_updated_at
      BEFORE UPDATE ON public.simlab_variants
      FOR EACH ROW EXECUTE FUNCTION public.update_simlab_updated_at();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_simlab_updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_simlab_run_agents_updated_at') THEN
    CREATE TRIGGER update_simlab_run_agents_updated_at
      BEFORE UPDATE ON public.simlab_run_agents
      FOR EACH ROW EXECUTE FUNCTION public.update_simlab_updated_at();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_simlab_updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_simlab_insights_updated_at') THEN
    CREATE TRIGGER update_simlab_insights_updated_at
      BEFORE UPDATE ON public.simlab_insights
      FOR EACH ROW EXECUTE FUNCTION public.update_simlab_updated_at();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_simlab_updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_simlab_module_policies_updated_at') THEN
    CREATE TRIGGER update_simlab_module_policies_updated_at
      BEFORE UPDATE ON public.simlab_module_policies
      FOR EACH ROW EXECUTE FUNCTION public.update_simlab_updated_at();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_simlab_updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_simlab_observations_updated_at') THEN
    CREATE TRIGGER update_simlab_observations_updated_at
      BEFORE UPDATE ON public.simlab_observations
      FOR EACH ROW EXECUTE FUNCTION public.update_simlab_updated_at();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_simlab_updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_simlab_character_bindings_updated_at') THEN
    CREATE TRIGGER update_simlab_character_bindings_updated_at
      BEFORE UPDATE ON public.simlab_character_bindings
      FOR EACH ROW EXECUTE FUNCTION public.update_simlab_updated_at();
  END IF;
END $$;
