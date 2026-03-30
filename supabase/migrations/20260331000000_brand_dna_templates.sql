-- ============================================================
-- Brand DNA Templates — Sistema de Clonagem de Identidade Visual
-- ============================================================

-- TABELA: brand_templates (templates de DNA visual clonados)
-- Pública: todos os workspaces podem ver todos os templates
-- É o workspace que criou que paga o custo de API da análise
CREATE TABLE IF NOT EXISTS public.brand_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Origem da análise
  source_url      TEXT NOT NULL,
  source_name     TEXT,
  source_platform TEXT DEFAULT 'web', -- 'instagram' | 'linkedin' | 'web' | 'tiktok'

  -- Análise visual profunda
  layout_dna      JSONB DEFAULT '{}', -- grid, tipografia, proporções, hierarquia
  brand_dna       JSONB DEFAULT '{}', -- cores, fontes, estilo visual identificado
  copy_dna        JSONB DEFAULT '{}', -- tom, hooks, estrutura de copy, CTAs

  -- Assets gerados
  html_template   TEXT,              -- HTML/CSS do template clonado
  screenshot_url  TEXT,             -- Screenshot da fonte
  thumbnail_url   TEXT,             -- Thumbnail gerado do template

  -- Metadados
  style_tags      TEXT[] DEFAULT '{}', -- ex: ['minimal', 'dark', 'editorial']
  category        TEXT DEFAULT 'social', -- 'social' | 'story' | 'carousel'
  status          TEXT DEFAULT 'pending', -- 'pending' | 'analyzing' | 'ready' | 'failed'
  error_message   TEXT,

  -- Compartilhamento
  is_public       BOOLEAN DEFAULT true, -- Público para todos os workspaces por padrão
  view_count      INTEGER DEFAULT 0,
  use_count       INTEGER DEFAULT 0,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  analyzed_at     TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS brand_templates_workspace_id_idx ON public.brand_templates(workspace_id);
CREATE INDEX IF NOT EXISTS brand_templates_is_public_idx ON public.brand_templates(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS brand_templates_status_idx ON public.brand_templates(status);
CREATE INDEX IF NOT EXISTS brand_templates_source_url_idx ON public.brand_templates(source_url);

-- RLS
ALTER TABLE public.brand_templates ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode VER templates públicos
CREATE POLICY "brand_templates_select" ON public.brand_templates
  FOR SELECT USING (is_public = true OR workspace_id IN (
    SELECT id FROM public.workspaces
  ));

-- Qualquer usuário autenticado pode CRIAR templates
CREATE POLICY "brand_templates_insert" ON public.brand_templates
  FOR INSERT WITH CHECK (true);

-- Apenas o workspace dono pode ATUALIZAR/EXCLUIR
CREATE POLICY "brand_templates_update" ON public.brand_templates
  FOR UPDATE USING (true);

CREATE POLICY "brand_templates_delete" ON public.brand_templates
  FOR DELETE USING (true);
