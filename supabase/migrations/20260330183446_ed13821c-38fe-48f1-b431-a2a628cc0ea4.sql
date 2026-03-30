
-- Table: workspaces
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for workspaces" ON public.workspaces FOR ALL TO public USING (true) WITH CHECK (true);

-- Table: brand_kits
CREATE TABLE public.brand_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  color_primary TEXT NOT NULL DEFAULT '#7C3AED',
  color_secondary TEXT NOT NULL DEFAULT '#06B6D4',
  color_accent TEXT NOT NULL DEFAULT '#F59E0B',
  color_bg_dark TEXT NOT NULL DEFAULT '#09090F',
  color_bg_light TEXT NOT NULL DEFAULT '#FFFFFF',
  color_text_dark TEXT NOT NULL DEFAULT '#111111',
  color_text_light TEXT NOT NULL DEFAULT '#F8FAFC',
  custom_colors JSONB DEFAULT '[]'::jsonb,
  font_headline TEXT NOT NULL DEFAULT 'Bebas Neue',
  font_body TEXT NOT NULL DEFAULT 'DM Sans',
  font_accent TEXT NOT NULL DEFAULT 'Playfair Display',
  logo_url TEXT,
  logo_dark_url TEXT,
  watermark_text TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id)
);
ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for brand_kits" ON public.brand_kits FOR ALL TO public USING (true) WITH CHECK (true);

-- Table: briefings
CREATE TABLE public.briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_name TEXT,
  segment TEXT,
  target_audience TEXT,
  main_differentials TEXT,
  tone_of_voice TEXT,
  pain_points TEXT,
  market_position TEXT,
  avoid_topics TEXT,
  main_competitors JSONB DEFAULT '[]'::jsonb,
  content_pillars JSONB DEFAULT '[]'::jsonb,
  keywords TEXT[],
  instagram_handle TEXT,
  linkedin_handle TEXT,
  brand_dna TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id)
);
ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for briefings" ON public.briefings FOR ALL TO public USING (true) WITH CHECK (true);

-- Table: api_keys
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  alias TEXT,
  key_value TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for api_keys" ON public.api_keys FOR ALL TO public USING (true) WITH CHECK (true);

-- Table: brand_templates
CREATE TABLE public.brand_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  source_name TEXT,
  source_platform TEXT,
  layout_dna JSONB,
  brand_dna JSONB,
  copy_dna JSONB,
  html_template TEXT,
  screenshot_url TEXT,
  style_tags TEXT[],
  category TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  analyzed_at TIMESTAMPTZ,
  layout_style JSONB
);
ALTER TABLE public.brand_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for brand_templates" ON public.brand_templates FOR ALL TO public USING (true) WITH CHECK (true);

-- Table: competitor_analyses_v2
CREATE TABLE public.competitor_analyses_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  name TEXT,
  dna_text TEXT,
  raw_markdown TEXT,
  analyzed_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.competitor_analyses_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for competitor_analyses_v2" ON public.competitor_analyses_v2 FOR ALL TO public USING (true) WITH CHECK (true);
