-- ============================================================
-- Phase 3 Incremental Schema
-- Built on top of the current PostGen workspace MVP
-- ============================================================

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

CREATE TABLE IF NOT EXISTS public.agent_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  prd_id UUID REFERENCES public.agent_prds(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  duration_ms INTEGER,
  success BOOLEAN DEFAULT TRUE,
  error_msg TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.agent_execution_log ENABLE ROW LEVEL SECURITY;

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
  fetched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, source_url)
);
ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;

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
  instagram_post_id UUID REFERENCES public.posts_v2(id) ON DELETE SET NULL,
  agent_prd_id UUID REFERENCES public.agent_prds(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.blog_articles ENABLE ROW LEVEL SECURITY;

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

CREATE TABLE IF NOT EXISTS public.message_masks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  msg_id TEXT NOT NULL,
  real_message TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.message_masks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.news_items
  ADD COLUMN IF NOT EXISTS blog_article_id UUID;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'news_items_blog_article_id_fkey'
      AND table_name = 'news_items'
  ) THEN
    ALTER TABLE public.news_items
      ADD CONSTRAINT news_items_blog_article_id_fkey
      FOREIGN KEY (blog_article_id) REFERENCES public.blog_articles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'agent_prds' AND policyname = 'Allow all for agent_prds'
  ) THEN
    CREATE POLICY "Allow all for agent_prds" ON public.agent_prds FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'agent_execution_log' AND policyname = 'Allow all for agent_execution_log'
  ) THEN
    CREATE POLICY "Allow all for agent_execution_log" ON public.agent_execution_log FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'rss_sources' AND policyname = 'RSS sources global read'
  ) THEN
    CREATE POLICY "RSS sources global read" ON public.rss_sources FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'news_items' AND policyname = 'Allow all for news_items'
  ) THEN
    CREATE POLICY "Allow all for news_items" ON public.news_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'blog_articles' AND policyname = 'Allow all for blog_articles'
  ) THEN
    CREATE POLICY "Allow all for blog_articles" ON public.blog_articles FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'landing_pages' AND policyname = 'Allow all for landing_pages'
  ) THEN
    CREATE POLICY "Allow all for landing_pages" ON public.landing_pages FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Allow all for projects'
  ) THEN
    CREATE POLICY "Allow all for projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'platform_conversations' AND policyname = 'Allow all for platform_conversations'
  ) THEN
    CREATE POLICY "Allow all for platform_conversations" ON public.platform_conversations FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lovable_integrations' AND policyname = 'Allow all for lovable_integrations'
  ) THEN
    CREATE POLICY "Allow all for lovable_integrations" ON public.lovable_integrations FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'deploy_integrations' AND policyname = 'Allow all for deploy_integrations'
  ) THEN
    CREATE POLICY "Allow all for deploy_integrations" ON public.deploy_integrations FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'message_masks' AND policyname = 'Allow all for message_masks'
  ) THEN
    CREATE POLICY "Allow all for message_masks" ON public.message_masks FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS news_items_workspace_status_idx ON public.news_items(workspace_id, status, fetched_at DESC);
CREATE INDEX IF NOT EXISTS news_items_workspace_relevance_idx ON public.news_items(workspace_id, relevance_score DESC);
CREATE INDEX IF NOT EXISTS blog_articles_workspace_status_idx ON public.blog_articles(workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS landing_pages_workspace_status_idx ON public.landing_pages(workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS projects_workspace_status_idx ON public.projects(workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS platform_conversations_workspace_project_idx ON public.platform_conversations(workspace_id, project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS message_masks_workspace_created_idx ON public.message_masks(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_prds_workspace_module_idx ON public.agent_prds(workspace_id, module_type, created_at DESC);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_v2') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_blog_articles_updated_at') THEN
      CREATE TRIGGER update_blog_articles_updated_at
        BEFORE UPDATE ON public.blog_articles
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_v2();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_landing_pages_updated_at') THEN
      CREATE TRIGGER update_landing_pages_updated_at
        BEFORE UPDATE ON public.landing_pages
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_v2();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_projects_updated_at') THEN
      CREATE TRIGGER update_projects_updated_at
        BEFORE UPDATE ON public.projects
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_v2();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_lovable_integrations_updated_at') THEN
      CREATE TRIGGER update_lovable_integrations_updated_at
        BEFORE UPDATE ON public.lovable_integrations
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_v2();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_deploy_integrations_updated_at') THEN
      CREATE TRIGGER update_deploy_integrations_updated_at
        BEFORE UPDATE ON public.deploy_integrations
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_v2();
    END IF;
  END IF;
END $$;

INSERT INTO public.rss_sources (name, url, category, locale, is_system, is_active)
VALUES
  ('G1 Tecnologia', 'https://g1.globo.com/rss/g1/tecnologia/', 'tech', 'pt-BR', true, true),
  ('G1 Economia', 'https://g1.globo.com/rss/g1/economia/', 'business', 'pt-BR', true, true),
  ('Agência Brasil', 'https://agenciabrasil.ebc.com.br/rss.xml', 'general', 'pt-BR', true, true),
  ('Exame', 'https://exame.com/feed/', 'business', 'pt-BR', true, true),
  ('Forbes Brasil', 'https://forbes.com.br/feed/', 'business', 'pt-BR', true, true),
  ('MIT Technology Review BR', 'https://mittechreview.com.br/feed/', 'tech', 'pt-BR', true, true),
  ('TechCrunch', 'https://techcrunch.com/feed/', 'tech', 'en', true, true),
  ('The Verge', 'https://www.theverge.com/rss/index.xml', 'tech', 'en', true, true),
  ('Marketing Dive', 'https://www.marketingdive.com/feeds/news/', 'marketing', 'en', true, true),
  ('Healthcare IT News', 'https://www.healthcareitnews.com/home/feed', 'health', 'en', true, true),
  ('Law.com', 'https://www.law.com/rss/', 'legal', 'en', true, true),
  ('Search Engine Journal', 'https://www.searchenginejournal.com/feed/', 'marketing', 'en', true, true)
ON CONFLICT (url) DO NOTHING;
