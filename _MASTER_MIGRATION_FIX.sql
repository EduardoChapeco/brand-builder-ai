-- ============================================================
-- SAFETY MIGRATION: Ensure all Phase 3 core tables exist
-- This migration is idempotent and safe to run multiple times.
-- Intended to fix environments where earlier migrations were
-- partially applied or ran out of order.
-- ============================================================

-- bio_links (core publishing table)
CREATE TABLE IF NOT EXISTS public.bio_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  theme_id TEXT DEFAULT 'glass-dark',
  theme_config JSONB DEFAULT '{}'::jsonb,
  profile JSONB DEFAULT '{}'::jsonb,
  links JSONB DEFAULT '[]'::jsonb,
  blocks JSONB DEFAULT '[]'::jsonb,
  seo_config JSONB DEFAULT '{}'::jsonb,
  published_html TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  latest_simlab_run_id TEXT,
  simlab_status TEXT,
  simlab_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.bio_links ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS bio_links_workspace_id_idx ON public.bio_links(workspace_id);
CREATE INDEX IF NOT EXISTS bio_links_is_published_idx ON public.bio_links(is_published);

-- rss_sources
CREATE TABLE IF NOT EXISTS public.rss_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  category TEXT,
  locale TEXT DEFAULT 'pt-BR',
  is_system BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.rss_sources ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rss_sources' AND policyname='RSS sources global read') THEN
    CREATE POLICY "RSS sources global read" ON public.rss_sources FOR SELECT USING (true);
  END IF;
END $$;

-- news_items
CREATE TABLE IF NOT EXISTS public.news_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rss_source_id UUID REFERENCES public.rss_sources(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  source_url TEXT NOT NULL,
  content_markdown TEXT,
  categories TEXT[] DEFAULT '{}'::text[],
  relevance_score INTEGER DEFAULT 0,
  relevance_reason TEXT,
  status TEXT DEFAULT 'new',
  published_at TIMESTAMPTZ,
  blog_article_id UUID,
  content_piece_ids UUID[] DEFAULT '{}'::uuid[],
  content_extracted BOOLEAN DEFAULT FALSE,
  latest_simlab_run_id TEXT,
  simlab_status TEXT,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, source_url)
);
ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS news_items_workspace_status_idx ON public.news_items(workspace_id, status, fetched_at DESC);
CREATE INDEX IF NOT EXISTS news_items_workspace_relevance_idx ON public.news_items(workspace_id, relevance_score DESC);

-- agent_prds
CREATE TABLE IF NOT EXISTS public.agent_prds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_type TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'balanced',
  status TEXT NOT NULL DEFAULT 'draft',
  original_prompt TEXT NOT NULL,
  brand_context_hash TEXT,
  identification JSONB DEFAULT '{}'::jsonb,
  fragments JSONB DEFAULT '{}'::jsonb,
  specialist_results JSONB DEFAULT '{}'::jsonb,
  assembled_prd TEXT,
  qa_score INTEGER,
  final_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.agent_prds ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agent_prds' AND policyname='Allow all for agent_prds') THEN
    CREATE POLICY "Allow all for agent_prds" ON public.agent_prds FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- blog_articles
CREATE TABLE IF NOT EXISTS public.blog_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT,
  meta_description TEXT,
  keywords TEXT[] DEFAULT '{}'::text[],
  content_markdown TEXT,
  content_html TEXT,
  layout_template TEXT DEFAULT 'medium_clean',
  hero_image_url TEXT,
  status TEXT DEFAULT 'draft',
  source_type TEXT DEFAULT 'manual',
  source_url TEXT,
  news_item_id UUID REFERENCES public.news_items(id) ON DELETE SET NULL,
  agent_prd_id UUID REFERENCES public.agent_prds(id) ON DELETE SET NULL,
  latest_simlab_run_id TEXT,
  simlab_status TEXT,
  simlab_validated_at TIMESTAMPTZ,
  instagram_post_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.blog_articles ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS blog_articles_workspace_status_idx ON public.blog_articles(workspace_id, status, created_at DESC);

-- Add news_item blog_article FK if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'news_items_blog_article_id_fkey' AND table_name = 'news_items'
  ) THEN
    ALTER TABLE public.news_items
      ADD CONSTRAINT news_items_blog_article_id_fkey
      FOREIGN KEY (blog_article_id) REFERENCES public.blog_articles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- projects
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft',
  entry_file TEXT DEFAULT '/src/App.tsx',
  source_files_json JSONB DEFAULT '{}'::jsonb,
  preview_meta JSONB DEFAULT '{}'::jsonb,
  deploy_meta JSONB DEFAULT '{}'::jsonb,
  lovable_project_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- landing_pages
CREATE TABLE IF NOT EXISTS public.landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_type TEXT DEFAULT 'from_scratch',
  source_url TEXT,
  status TEXT DEFAULT 'draft',
  screenshots_json JSONB DEFAULT '[]'::jsonb,
  dom_content TEXT,
  sections_analysis JSONB DEFAULT '{}'::jsonb,
  sections_json JSONB DEFAULT '[]'::jsonb,
  full_html TEXT,
  full_css TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  agent_prd_id UUID REFERENCES public.agent_prds(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

-- platform_conversations
CREATE TABLE IF NOT EXISTS public.platform_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'chat',
  user_message TEXT NOT NULL,
  assistant_response TEXT,
  diff_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.platform_conversations ENABLE ROW LEVEL SECURITY;

-- lovable_integrations
CREATE TABLE IF NOT EXISTS public.lovable_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  lovable_project_id TEXT,
  lovable_workspace_id TEXT,
  status TEXT DEFAULT 'inactive',
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.lovable_integrations ENABLE ROW LEVEL SECURITY;

-- deploy_integrations
CREATE TABLE IF NOT EXISTS public.deploy_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token_enc TEXT,
  refresh_token_enc TEXT,
  account_login TEXT,
  account_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, provider)
);
ALTER TABLE public.deploy_integrations ENABLE ROW LEVEL SECURITY;

-- message_masks
CREATE TABLE IF NOT EXISTS public.message_masks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  msg_id TEXT NOT NULL,
  real_message TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.message_masks ENABLE ROW LEVEL SECURITY;

-- Add legacy open-access policies (compat layer, overridden by workspace_members_rls)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='blog_articles' AND policyname='Allow all for blog_articles') THEN
    CREATE POLICY "Allow all for blog_articles" ON public.blog_articles FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='news_items' AND policyname='Allow all for news_items') THEN
    CREATE POLICY "Allow all for news_items" ON public.news_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='projects' AND policyname='Allow all for projects') THEN
    CREATE POLICY "Allow all for projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='landing_pages' AND policyname='Allow all for landing_pages') THEN
    CREATE POLICY "Allow all for landing_pages" ON public.landing_pages FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='platform_conversations' AND policyname='Allow all for platform_conversations') THEN
    CREATE POLICY "Allow all for platform_conversations" ON public.platform_conversations FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lovable_integrations' AND policyname='Allow all for lovable_integrations') THEN
    CREATE POLICY "Allow all for lovable_integrations" ON public.lovable_integrations FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='deploy_integrations' AND policyname='Allow all for deploy_integrations') THEN
    CREATE POLICY "Allow all for deploy_integrations" ON public.deploy_integrations FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='message_masks' AND policyname='Allow all for message_masks') THEN
    CREATE POLICY "Allow all for message_masks" ON public.message_masks FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bio_links' AND policyname='BioLinks workspace insert') THEN
    CREATE POLICY "BioLinks workspace insert" ON public.bio_links FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bio_links' AND policyname='BioLinks workspace update') THEN
    CREATE POLICY "BioLinks workspace update" ON public.bio_links FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bio_links' AND policyname='BioLinks workspace delete') THEN
    CREATE POLICY "BioLinks workspace delete" ON public.bio_links FOR DELETE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bio_links' AND policyname='BioLinks public published read') THEN
    CREATE POLICY "BioLinks public published read" ON public.bio_links FOR SELECT USING (is_published = true);
  END IF;
END $$;

-- Seed RSS sources
INSERT INTO public.rss_sources (name, url, category, locale, is_system, is_active)
VALUES
  ('G1 Tecnologia', 'https://g1.globo.com/rss/g1/tecnologia/', 'tech', 'pt-BR', true, true),
  ('G1 Economia', 'https://g1.globo.com/rss/g1/economia/', 'business', 'pt-BR', true, true),
  ('Exame', 'https://exame.com/feed/', 'business', 'pt-BR', true, true),
  ('Forbes Brasil', 'https://forbes.com.br/feed/', 'business', 'pt-BR', true, true),
  ('TechCrunch', 'https://techcrunch.com/feed/', 'tech', 'en', true, true),
  ('The Verge', 'https://www.theverge.com/rss/index.xml', 'tech', 'en', true, true),
  ('Marketing Dive', 'https://www.marketingdive.com/feeds/news/', 'marketing', 'en', true, true),
  ('Search Engine Journal', 'https://www.searchenginejournal.com/feed/', 'marketing', 'en', true, true)
ON CONFLICT (url) DO NOTHING;
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
