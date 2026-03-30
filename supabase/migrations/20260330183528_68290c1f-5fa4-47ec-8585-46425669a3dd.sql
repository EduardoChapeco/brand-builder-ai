
-- Add missing columns to api_keys
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS calls_today INTEGER DEFAULT 0;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 100;

-- Table: posts_v2
CREATE TABLE public.posts_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT,
  format TEXT,
  slides_html JSONB DEFAULT '[]'::jsonb,
  slides_count INTEGER DEFAULT 0,
  caption TEXT,
  hashtags TEXT,
  template_id TEXT,
  visual_mode TEXT,
  funnel_type TEXT,
  source_topic TEXT,
  source_url TEXT,
  image_urls JSONB,
  generation_meta JSONB,
  status TEXT DEFAULT 'ready',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.posts_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for posts_v2" ON public.posts_v2 FOR ALL TO public USING (true) WITH CHECK (true);

-- Table: rss_feeds
CREATE TABLE public.rss_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT,
  url TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rss_feeds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for rss_feeds" ON public.rss_feeds FOR ALL TO public USING (true) WITH CHECK (true);
