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
