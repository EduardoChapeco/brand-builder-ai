-- ============================================================
-- SCHEMA SYNC: Ensure every table used by the codebase exists
-- Closes the gap between types.ts and actual DB for all modules
-- This migration is fully idempotent (CREATE TABLE IF NOT EXISTS)
-- ============================================================

-- ─── Add missing columns to workspaces ─────────────────────
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Sao_Paulo',
  ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'pt-BR',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ─── workspace_members (already exists via workspace_members_rls migration)
-- Ensure all required columns exist
ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ─── api_keys — ensure key_preview column exists ────────────
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS key_preview TEXT GENERATED ALWAYS AS (left(key_value, 8) || '...' || right(key_value, 4)) STORED,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ─── briefings — add instagram_handle if missing ────────────
-- (already exists via migrations, ensure columns present)
ALTER TABLE public.briefings
  ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_handle TEXT,
  ADD COLUMN IF NOT EXISTS pain_points TEXT,
  ADD COLUMN IF NOT EXISTS market_position TEXT,
  ADD COLUMN IF NOT EXISTS avoid_topics TEXT,
  ADD COLUMN IF NOT EXISTS main_competitors JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS content_pillars JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS last_competitor_analysis TEXT,
  ADD COLUMN IF NOT EXISTS viral_patterns_cache JSONB;

-- ─── blog_articles — add simlab columns ─────────────────────
ALTER TABLE public.blog_articles
  ADD COLUMN IF NOT EXISTS simlab_status TEXT,
  ADD COLUMN IF NOT EXISTS simlab_validated_at TIMESTAMPTZ;

-- ─── news_items — add simlab column ─────────────────────────
ALTER TABLE public.news_items
  ADD COLUMN IF NOT EXISTS simlab_status TEXT;

-- ─── squad_members ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.squad_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  squad_id UUID,
  agent_id TEXT NOT NULL,
  agent_type TEXT NOT NULL DEFAULT 'specialist',
  role TEXT NOT NULL DEFAULT 'member',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS squad_members_workspace_idx ON public.squad_members(workspace_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='squad_members' AND policyname='squad_members_allow_all') THEN
    CREATE POLICY "squad_members_allow_all" ON public.squad_members FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─── squad_runs ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.squad_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  squad_id UUID,
  status TEXT NOT NULL DEFAULT 'queued',
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_payload JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.squad_runs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS squad_runs_workspace_idx ON public.squad_runs(workspace_id, created_at DESC);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='squad_runs' AND policyname='squad_runs_allow_all') THEN
    CREATE POLICY "squad_runs_allow_all" ON public.squad_runs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─── video_templates (referenced in VideoStudioPage/GeneratePage) ─
CREATE TABLE IF NOT EXISTS public.video_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  thumbnail_url TEXT,
  composition_key TEXT NOT NULL,
  default_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.video_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='video_templates' AND policyname='video_templates_public_read') THEN
    CREATE POLICY "video_templates_public_read" ON public.video_templates FOR SELECT USING (is_active = true);
  END IF;
END $$;

-- ─── ai_generated_videos (referenced in GeneratePage) ───────
ALTER TABLE public.ai_generated_videos
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS video_template_id UUID REFERENCES public.video_templates(id) ON DELETE SET NULL;

-- ─── ccp_prompt_templates — ensure all columns exist ────────
ALTER TABLE public.ccp_prompt_templates
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- ─── simlab_runs — add new integration columns ──────────────
ALTER TABLE public.simlab_runs
  ADD COLUMN IF NOT EXISTS module TEXT,
  ADD COLUMN IF NOT EXISTS content_snapshot JSONB;

-- ─── Ensure workspaces RLS is correct ───────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='workspaces' AND policyname='workspaces_member_read') THEN
    CREATE POLICY "workspaces_member_read"
      ON public.workspaces
      FOR SELECT
      USING (
        id IN (
          SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND status = 'active'
        )
      );
  END IF;
END $$;

-- ─── Ensure briefings RLS ───────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='briefings' AND policyname='briefings_workspace_access') THEN
    CREATE POLICY "briefings_workspace_access"
      ON public.briefings
      FOR ALL
      USING (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND status = 'active'
        )
      )
      WITH CHECK (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND status = 'active'
        )
      );
  END IF;
END $$;

-- ─── Ensure bio_links workspace RLS ─────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bio_links' AND policyname='bio_links_workspace_access') THEN
    CREATE POLICY "bio_links_workspace_access"
      ON public.bio_links
      FOR ALL
      USING (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND status = 'active'
        )
        OR status = 'published'
      )
      WITH CHECK (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND status = 'active'
        )
      );
  END IF;
END $$;

-- ─── brand_kits RLS ─────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='brand_kits' AND policyname='brand_kits_workspace_access') THEN
    CREATE POLICY "brand_kits_workspace_access"
      ON public.brand_kits
      FOR ALL
      USING (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND status = 'active'
        )
      )
      WITH CHECK (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND status = 'active'
        )
      );
  END IF;
END $$;

-- ─── Seed video templates ────────────────────────────────────
INSERT INTO public.video_templates (name, category, composition_key, description, is_system)
VALUES
  ('Reels Vertical', 'social', 'reels-vertical-9x16', 'Formato vertical 9:16 para Reels e TikTok', true),
  ('Post Quadrado', 'social', 'square-post-1x1', 'Post quadrado 1:1 para Instagram Feed', true),
  ('Story 9:16', 'social', 'story-9x16', 'Story vertical completo para Instagram/WhatsApp', true),
  ('Slides Carrossel', 'social', 'carousel-slides', 'Sequência de slides para carrossel de engajamento', true),
  ('Institucional 16:9', 'corporate', 'brand-video-16x9', 'Vídeo institucional horizontal para YouTube e LinkedIn', true)
ON CONFLICT DO NOTHING;
