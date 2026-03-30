-- ============================================================
-- PostGen Multi-Tenant Schema (Phase 1)
-- ============================================================

-- TABELA 1: Workspaces (uma por empresa)
CREATE TABLE IF NOT EXISTS public.workspaces (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE,
  logo_url      TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA 2: Briefing da empresa (base de conhecimento)
CREATE TABLE IF NOT EXISTS public.briefings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_name        TEXT,
  segment             TEXT,
  target_audience     TEXT,
  main_differentials  TEXT,
  tone_of_voice       TEXT,
  main_competitors    JSONB DEFAULT '[]',
  market_position     TEXT,
  pain_points         TEXT,
  content_pillars     JSONB DEFAULT '[]',
  keywords            TEXT[],
  avoid_topics        TEXT,
  instagram_handle    TEXT,
  linkedin_handle     TEXT,
  brand_dna           TEXT,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA 3: Brand Kit
CREATE TABLE IF NOT EXISTS public.brand_kits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  color_primary     TEXT DEFAULT '#7C3AED',
  color_secondary   TEXT DEFAULT '#06B6D4',
  color_accent      TEXT DEFAULT '#F59E0B',
  color_bg_dark     TEXT DEFAULT '#09090F',
  color_bg_light    TEXT DEFAULT '#FFFFFF',
  color_text_dark   TEXT DEFAULT '#111111',
  color_text_light  TEXT DEFAULT '#F8FAFC',
  custom_colors     JSONB DEFAULT '[]',
  font_headline     TEXT DEFAULT 'Bebas Neue',
  font_body         TEXT DEFAULT 'DM Sans',
  font_accent       TEXT DEFAULT 'Playfair Display',
  logo_url          TEXT,
  logo_dark_url     TEXT,
  watermark_text    TEXT,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA 4: Chaves de API (orquestrador round-robin)
CREATE TABLE IF NOT EXISTS public.api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,
  alias           TEXT,
  key_value       TEXT NOT NULL,
  calls_today     INTEGER DEFAULT 0,
  daily_limit     INTEGER DEFAULT 100,
  is_active       BOOLEAN DEFAULT TRUE,
  last_error      TEXT,
  last_used_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA 5: RSS Feeds cadastrados
CREATE TABLE IF NOT EXISTS public.rss_feeds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name            TEXT,
  url             TEXT NOT NULL,
  category        TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  last_fetched_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA 6: Posts gerados
CREATE TABLE IF NOT EXISTS public.posts_v2 (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title           TEXT,
  format          TEXT NOT NULL DEFAULT 'post',
  slides_html     JSONB NOT NULL DEFAULT '[]',
  slides_count    INTEGER DEFAULT 1,
  caption         TEXT,
  hashtags        TEXT,
  template_id     TEXT,
  visual_mode     TEXT,
  funnel_type     TEXT,
  image_urls      JSONB,
  source_topic    TEXT,
  source_url      TEXT,
  generation_meta JSONB,
  status          TEXT DEFAULT 'draft',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA 7: Análise de concorrentes
CREATE TABLE IF NOT EXISTS public.competitor_analyses_v2 (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  name            TEXT,
  dna_text        TEXT,
  screenshot_url  TEXT,
  raw_markdown    TEXT,
  analyzed_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, url)
);

-- One active briefing and brand kit per workspace
CREATE UNIQUE INDEX IF NOT EXISTS briefings_workspace_id_unique
  ON public.briefings (workspace_id);

CREATE UNIQUE INDEX IF NOT EXISTS brand_kits_workspace_id_unique
  ON public.brand_kits (workspace_id);

-- Enable RLS on all new tables
ALTER TABLE public.workspaces             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.briefings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_kits             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rss_feeds              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts_v2               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_analyses_v2 ENABLE ROW LEVEL SECURITY;

-- Open policies for single-user MVP
CREATE POLICY "Allow all for workspaces"             ON public.workspaces             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for briefings"              ON public.briefings              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for brand_kits"             ON public.brand_kits             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for api_keys"               ON public.api_keys               FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for rss_feeds"              ON public.rss_feeds              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for posts_v2"               ON public.posts_v2               FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for competitor_analyses_v2" ON public.competitor_analyses_v2 FOR ALL USING (true) WITH CHECK (true);

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_v2()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_briefings_updated_at
  BEFORE UPDATE ON public.briefings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_v2();

CREATE TRIGGER update_brand_kits_updated_at
  BEFORE UPDATE ON public.brand_kits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_v2();

-- Storage bucket for exported slides and generated backgrounds
INSERT INTO storage.buckets (id, name, public)
VALUES ('postgen', 'postgen', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "PostGen bucket public read" ON storage.objects;
CREATE POLICY "PostGen bucket public read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'postgen');

DROP POLICY IF EXISTS "PostGen bucket insert" ON storage.objects;
CREATE POLICY "PostGen bucket insert"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'postgen');

DROP POLICY IF EXISTS "PostGen bucket update" ON storage.objects;
CREATE POLICY "PostGen bucket update"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'postgen')
  WITH CHECK (bucket_id = 'postgen');

DROP POLICY IF EXISTS "PostGen bucket delete" ON storage.objects;
CREATE POLICY "PostGen bucket delete"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'postgen');
