
-- Create update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- TABELA 1: Briefing da empresa
CREATE TABLE public.briefing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT,
  segment TEXT,
  tone_of_voice TEXT,
  primary_color TEXT DEFAULT '#7C3AED',
  secondary_color TEXT DEFAULT '#06B6D4',
  font_preference TEXT,
  visual_style TEXT,
  target_audience TEXT,
  main_differentials TEXT,
  competitors JSONB DEFAULT '[]'::jsonb,
  inspirations JSONB DEFAULT '[]'::jsonb,
  brand_dna TEXT,
  logo_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.briefing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for briefing" ON public.briefing FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_briefing_updated_at BEFORE UPDATE ON public.briefing FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TABELA 2: Mensagens do chat
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT,
  post_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);

-- TABELA 3: Posts gerados
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  format TEXT CHECK (format IN ('single', 'carousel')),
  slides_count INTEGER DEFAULT 1,
  html_content JSONB,
  image_urls JSONB,
  caption TEXT,
  hashtags TEXT,
  template_name TEXT,
  is_saved_template BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for posts" ON public.posts FOR ALL USING (true) WITH CHECK (true);

-- TABELA 4: Templates
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  preview_url TEXT,
  html_base TEXT,
  category TEXT,
  tags TEXT[],
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for templates" ON public.templates FOR ALL USING (true) WITH CHECK (true);

-- TABELA 5: Análises de concorrentes
CREATE TABLE public.competitor_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  name TEXT,
  extracted_dna TEXT,
  screenshot_url TEXT,
  raw_content TEXT,
  analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.competitor_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for analyses" ON public.competitor_analyses FOR ALL USING (true) WITH CHECK (true);
