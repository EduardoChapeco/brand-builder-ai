
-- Create missing tables referenced by the application code

-- 1. image_prompt_templates
CREATE TABLE public.image_prompt_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'portrait',
  subcategory text,
  base_template text NOT NULL DEFAULT '',
  variables jsonb DEFAULT '[]'::jsonb,
  default_values jsonb DEFAULT '{}'::jsonb,
  platform_params jsonb DEFAULT '{}'::jsonb,
  is_system boolean DEFAULT false,
  usage_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.image_prompt_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for image_prompt_templates" ON public.image_prompt_templates FOR ALL TO public USING (true) WITH CHECK (true);

-- 2. brand_characters
CREATE TABLE public.brand_characters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  gender text DEFAULT 'Feminino',
  age_range text DEFAULT '30-40s',
  ethnicity_notes text,
  signature_item text,
  archetype text DEFAULT 'entrepreneur',
  expression_default text DEFAULT 'Confiante',
  physical_traits jsonb DEFAULT '[]'::jsonb,
  style_notes text,
  seed_prompt text,
  sample_images jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.brand_characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for brand_characters" ON public.brand_characters FOR ALL TO public USING (true) WITH CHECK (true);

-- 3. media_assets
CREATE TABLE public.media_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module text NOT NULL DEFAULT 'general',
  asset_type text NOT NULL DEFAULT 'image',
  storage_path text,
  public_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  prompt_template_id uuid REFERENCES public.image_prompt_templates(id) ON DELETE SET NULL,
  character_id uuid REFERENCES public.brand_characters(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for media_assets" ON public.media_assets FOR ALL TO public USING (true) WITH CHECK (true);

-- 4. viral_analyses
CREATE TABLE public.viral_analyses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_url text,
  source_account text,
  content_sample text,
  hook_formula text,
  visual_style text,
  engagement_notes text,
  content_type text,
  emotional_trigger text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.viral_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for viral_analyses" ON public.viral_analyses FOR ALL TO public USING (true) WITH CHECK (true);

-- 5. carousel_storyboards
CREATE TABLE public.carousel_storyboards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  topic text NOT NULL DEFAULT '',
  arc_type text DEFAULT 'hook_reveal',
  slides_plan jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.carousel_storyboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for carousel_storyboards" ON public.carousel_storyboards FOR ALL TO public USING (true) WITH CHECK (true);

-- 6. Add missing columns to api_keys
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS last_used_at timestamptz;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS last_error text;

-- 7. Add missing columns to briefings
ALTER TABLE public.briefings ADD COLUMN IF NOT EXISTS viral_patterns_cache jsonb;
ALTER TABLE public.briefings ADD COLUMN IF NOT EXISTS last_competitor_analysis timestamptz;
