-- ============================================================
-- PostGen Fase 2 — Schema Canônico
-- Sem dependência de posts legados ou membership tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.brand_characters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  gender          TEXT,
  age_range       TEXT,
  ethnicity_notes TEXT,
  physical_traits JSONB DEFAULT '[]',
  style_notes     TEXT,
  archetype       TEXT,
  seed_prompt     TEXT,
  sample_images   JSONB DEFAULT '[]',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.brand_characters ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'brand_characters' AND policyname = 'Allow all for brand_characters'
  ) THEN
    CREATE POLICY "Allow all for brand_characters"
      ON public.brand_characters FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.image_prompt_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL,
  subcategory     TEXT,
  base_template   TEXT NOT NULL,
  variables       JSONB DEFAULT '[]',
  default_values  JSONB DEFAULT '{}',
  platform_params JSONB DEFAULT '{}',
  is_system       BOOLEAN DEFAULT FALSE,
  usage_count     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.image_prompt_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'image_prompt_templates' AND policyname = 'Allow all for image_prompt_templates'
  ) THEN
    CREATE POLICY "Allow all for image_prompt_templates"
      ON public.image_prompt_templates FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.viral_analyses (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id       UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_url         TEXT,
  source_account     TEXT,
  content_sample     TEXT,
  hook_formula       TEXT,
  visual_style       TEXT,
  emotional_trigger  TEXT,
  content_type       TEXT,
  engagement_notes   TEXT,
  patterns_extracted JSONB DEFAULT '{}',
  analyzed_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.viral_analyses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'viral_analyses' AND policyname = 'Allow all for viral_analyses'
  ) THEN
    CREATE POLICY "Allow all for viral_analyses"
      ON public.viral_analyses FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.carousel_storyboards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  post_id      UUID REFERENCES public.posts_v2(id) ON DELETE SET NULL,
  arc_type     TEXT NOT NULL,
  slides_plan  JSONB NOT NULL DEFAULT '[]',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.carousel_storyboards ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'carousel_storyboards' AND policyname = 'Allow all for carousel_storyboards'
  ) THEN
    CREATE POLICY "Allow all for carousel_storyboards"
      ON public.carousel_storyboards FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.media_assets (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id       UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module             TEXT NOT NULL,
  asset_type         TEXT NOT NULL,
  storage_path       TEXT NOT NULL,
  public_url         TEXT NOT NULL,
  prompt_template_id UUID REFERENCES public.image_prompt_templates(id) ON DELETE SET NULL,
  character_id       UUID REFERENCES public.brand_characters(id) ON DELETE SET NULL,
  metadata           JSONB DEFAULT '{}',
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'media_assets' AND policyname = 'Allow all for media_assets'
  ) THEN
    CREATE POLICY "Allow all for media_assets"
      ON public.media_assets FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS image_prompt_templates_workspace_id_idx
  ON public.image_prompt_templates(workspace_id);
CREATE INDEX IF NOT EXISTS viral_analyses_workspace_id_idx
  ON public.viral_analyses(workspace_id);
CREATE INDEX IF NOT EXISTS carousel_storyboards_workspace_id_idx
  ON public.carousel_storyboards(workspace_id);
CREATE INDEX IF NOT EXISTS media_assets_workspace_id_idx
  ON public.media_assets(workspace_id);
CREATE INDEX IF NOT EXISTS media_assets_module_idx
  ON public.media_assets(module);

ALTER TABLE public.posts_v2
  ADD COLUMN IF NOT EXISTS storyboard_id UUID REFERENCES public.carousel_storyboards(id),
  ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES public.brand_characters(id),
  ADD COLUMN IF NOT EXISTS animation_config JSONB,
  ADD COLUMN IF NOT EXISTS prompt_used TEXT;

ALTER TABLE public.briefings
  ADD COLUMN IF NOT EXISTS viral_patterns_cache JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_competitor_analysis TIMESTAMPTZ;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_brand_characters_updated_at'
  ) THEN
    CREATE TRIGGER update_brand_characters_updated_at
      BEFORE UPDATE ON public.brand_characters
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_v2();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_carousel_storyboards_updated_at'
  ) THEN
    CREATE TRIGGER update_carousel_storyboards_updated_at
      BEFORE UPDATE ON public.carousel_storyboards
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_v2();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.image_prompt_templates
    WHERE is_system = true AND name = 'Retrato Editorial Limpo'
  ) THEN
    INSERT INTO public.image_prompt_templates (
      workspace_id, name, category, subcategory, base_template, variables, default_values, platform_params, is_system
    ) VALUES
      (
        NULL,
        'Retrato Editorial Limpo',
        'portrait',
        'editorial',
        '[DESCRICAO_DO_ASSUNTO] — modo: Clean — estilo: editorial ultra-realista, foto 8K — camera: Canon EOS R5, lente 85mm f/1.4 — iluminacao: key light 5600K, fill 3200K, backlight 3000K — composicao: sujeito levemente a esquerda, espaco negativo a direita — cores: paleta [PALETA_DA_MARCA] em roupas e reflexos — [TARGET_PLATFORM_PARAMS]',
        '[
          {"id":"subject_description","label":"Descricao do Assunto","placeholder":"executiva segurando tablet","type":"text"},
          {"id":"brand_palette","label":"Paleta da Marca","placeholder":"#7C3AED, #06B6D4, #F59E0B","type":"text"}
        ]'::jsonb,
        '{"subject_description":"empreendedora de bracos cruzados","brand_palette":"#7C3AED, #06B6D4, #F59E0B"}'::jsonb,
        '{"midjourney":{"suffix":"--ar {ratio} --v 6 --style raw --q 2 --stylize 750"},"dalle3":{"prefix":"IMPORTANT: Do not add any text to the image. ","suffix":"Photorealistic. High resolution. No watermarks. No text overlays."}}'::jsonb,
        TRUE
      ),
      (
        NULL,
        'Retrato Editorial Bold',
        'portrait',
        'editorial',
        '[DESCRICAO_DO_ASSUNTO] — modo: Bold — estilo: editorial ultra-realista, foto 8K — reflexos em tons da paleta [PALETA_DA_MARCA] — elementos abstratos: linhas dinamicas, cortes geometricos, glitch translucido — [TARGET_PLATFORM_PARAMS]',
        '[
          {"id":"subject_description","label":"Descricao do Assunto","placeholder":"fundadora em pose confiante","type":"text"},
          {"id":"brand_palette","label":"Paleta da Marca","placeholder":"#7C3AED, #06B6D4, #F59E0B","type":"text"}
        ]'::jsonb,
        '{"subject_description":"fundadora olhando para camera","brand_palette":"#7C3AED, #06B6D4, #F59E0B"}'::jsonb,
        '{"midjourney":{"suffix":"--ar {ratio} --v 6 --style raw --q 2 --stylize 750"}}'::jsonb,
        TRUE
      ),
      (
        NULL,
        'Hero Shot de Produto',
        'product',
        'hero',
        'Use the uploaded product image as the exact product reference. Create an ultra-realistic premium product photography scene where [PRODUCT_TYPE] is the hero of the frame. Solid background [BG_COLOR]. [ELEMENTS]. Soft studio lighting, gentle shadows, ultra-sharp focus. [TARGET_PLATFORM_PARAMS]',
        '[
          {"id":"product_type","label":"Tipo de Produto","placeholder":"frasco de perfume premium","type":"text"},
          {"id":"bg_color","label":"Cor de Fundo","placeholder":"#0D1117","type":"text"},
          {"id":"elements","label":"Elementos","placeholder":"reflexos premium e props sutis","type":"text"}
        ]'::jsonb,
        '{"product_type":"frasco de perfume premium","bg_color":"#0D1117","elements":"reflexos premium e props sutis"}'::jsonb,
        '{"midjourney":{"suffix":"--ar {ratio} --v 6 --style raw --q 2"}}'::jsonb,
        TRUE
      ),
      (
        NULL,
        'Flat Lay de Produto',
        'product',
        'flatlay',
        'Create a commercial flat-lay image featuring multiple copies of [PRODUCT_TYPE] arranged organically in a dense overlapping pile. Perfect top-down camera angle. [MOOD]. [TARGET_PLATFORM_PARAMS]',
        '[
          {"id":"product_type","label":"Tipo de Produto","placeholder":"barra de chocolate artesanal","type":"text"},
          {"id":"mood","label":"Mood Visual","placeholder":"fresh and energetic snack aesthetic","type":"text"}
        ]'::jsonb,
        '{"product_type":"barra de chocolate artesanal","mood":"fresh and energetic snack aesthetic"}'::jsonb,
        '{"midjourney":{"suffix":"--ar {ratio} --v 6 --style raw --q 2"}}'::jsonb,
        TRUE
      ),
      (
        NULL,
        'Textura Grainy Abstrata',
        'texture',
        'abstract',
        'Abstract grainy texture, [COLOR_1], [COLOR_2] and [COLOR_3], organic flowing shapes, bold graphic design aesthetic, high contrast, smooth grain overlay, no text. [TARGET_PLATFORM_PARAMS]',
        '[
          {"id":"color_1","label":"Cor 1","placeholder":"#111827","type":"text"},
          {"id":"color_2","label":"Cor 2","placeholder":"#7C3AED","type":"text"},
          {"id":"color_3","label":"Cor 3","placeholder":"#06B6D4","type":"text"}
        ]'::jsonb,
        '{"color_1":"#111827","color_2":"#7C3AED","color_3":"#06B6D4"}'::jsonb,
        '{"stable_diffusion":{"suffix":", masterpiece, best quality, photorealistic, 8k uhd, dslr","negative_prompt":"text, watermark, logo, words, letters"}}'::jsonb,
        TRUE
      ),
      (
        NULL,
        'Editorial Surrealista',
        'editorial',
        'surreal',
        'Create a surreal minimalist editorial portrait. The character [SUBJECT_DESCRIPTION] in a vast empty space with a soft gradient background [COLOR_PALETTE]. A single bright [ACCENT_COLOR] light streak illuminating the face with dramatic glow. [TARGET_PLATFORM_PARAMS]',
        '[
          {"id":"subject_description","label":"Descricao do Assunto","placeholder":"criadora em pose contemplativa","type":"text"},
          {"id":"color_palette","label":"Paleta","placeholder":"#0F172A, #7C3AED, #F8FAFC","type":"text"},
          {"id":"accent_color","label":"Cor de Destaque","placeholder":"#06B6D4","type":"text"}
        ]'::jsonb,
        '{"subject_description":"criadora em pose contemplativa","color_palette":"#0F172A, #7C3AED, #F8FAFC","accent_color":"#06B6D4"}'::jsonb,
        '{"midjourney":{"suffix":"--ar {ratio} --v 6 --style raw --q 2 --stylize 750"}}'::jsonb,
        TRUE
      );
  END IF;
END $$;
