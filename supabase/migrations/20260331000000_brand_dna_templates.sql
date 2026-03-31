-- ============================================================
-- Brand DNA Templates — Sistema de Clonagem de Identidade Visual
-- Idempotente: usa IF NOT EXISTS em tudo
-- ============================================================

-- TABELA: brand_templates
CREATE TABLE IF NOT EXISTS public.brand_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_url      TEXT NOT NULL,
  source_name     TEXT,
  source_platform TEXT DEFAULT 'web',
  layout_dna      JSONB DEFAULT '{}',
  brand_dna       JSONB DEFAULT '{}',
  copy_dna        JSONB DEFAULT '{}',
  html_template   TEXT,
  screenshot_url  TEXT,
  thumbnail_url   TEXT,
  style_tags      TEXT[] DEFAULT '{}',
  category        TEXT DEFAULT 'social',
  status          TEXT DEFAULT 'pending',
  error_message   TEXT,
  is_public       BOOLEAN DEFAULT true,
  view_count      INTEGER DEFAULT 0,
  use_count       INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  analyzed_at     TIMESTAMPTZ
);

-- Índices (idempotentes)
CREATE INDEX IF NOT EXISTS brand_templates_workspace_id_idx ON public.brand_templates(workspace_id);
CREATE INDEX IF NOT EXISTS brand_templates_is_public_idx   ON public.brand_templates(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS brand_templates_status_idx      ON public.brand_templates(status);
CREATE INDEX IF NOT EXISTS brand_templates_source_url_idx  ON public.brand_templates(source_url);

-- RLS
ALTER TABLE public.brand_templates ENABLE ROW LEVEL SECURITY;

-- Policies idempotentes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'brand_templates' AND policyname = 'Allow all for brand_templates'
  ) THEN
    CREATE POLICY "Allow all for brand_templates"
      ON public.brand_templates FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
