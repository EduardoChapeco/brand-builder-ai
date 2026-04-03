-- =============================================================
-- MIGRATION: 001_foundation.sql (SDD V2 CANONICAL SCHEMA)
-- =============================================================

-- EXTENSÕES OBRIGATÓRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- Full-text search
CREATE EXTENSION IF NOT EXISTS "unaccent";  -- Search sem acento

-- =============================================================
-- TABELA: workspaces (Multi-tenant root)
-- =============================================================
CREATE TABLE IF NOT EXISTS workspaces (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  plan            TEXT NOT NULL DEFAULT 'free'
                  CHECK (plan IN ('free','starter','pro','agency','enterprise')),
  owner_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url        TEXT,
  custom_domain   TEXT UNIQUE,
  timezone        TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  locale          TEXT NOT NULL DEFAULT 'pt-BR',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  trial_ends_at   TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garantir que colunas existem
ALTER TABLE workspaces 
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'pt-BR',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);

-- =============================================================
-- TABELA: workspace_members (Equipe por workspace)
-- =============================================================
CREATE TABLE IF NOT EXISTS workspace_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member'
                  CHECK (role IN ('owner','admin','editor','viewer')),
  invited_by      UUID REFERENCES auth.users(id),
  invited_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at     TIMESTAMPTZ,
  UNIQUE(workspace_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_ws_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ws_members_user ON workspace_members(user_id);

-- =============================================================
-- TABELA: briefings (Knowledge base da empresa)
-- =============================================================
CREATE TABLE IF NOT EXISTS briefings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE,
  -- Identidade
  company_name          TEXT,
  tagline               TEXT,
  segment               TEXT,
  sub_segment           TEXT,
  -- Audiência
  target_audience       TEXT,
  audience_age_range    TEXT,        -- Ex: "25-40"
  audience_gender       TEXT,        -- Ex: "60% feminino"
  audience_location     TEXT,
  audience_income       TEXT,
  -- Posicionamento
  main_differentials    TEXT,
  value_proposition     TEXT,
  brand_personality     TEXT,        -- Ex: "Ousada, direta, irreverente"
  tone_of_voice         TEXT,
  avoid_topics          TEXT,
  -- Conteúdo
  content_pillars       JSONB NOT NULL DEFAULT '[]',
  keywords              TEXT[] NOT NULL DEFAULT '{}',
  hashtags_default      TEXT[] NOT NULL DEFAULT '{}',
  -- Competidores e DNA
  competitors           JSONB NOT NULL DEFAULT '[]',    -- [{name, url, notes, analysis}]
  inspirations          JSONB NOT NULL DEFAULT '[]',    -- [{name, url, notes, analysis}]
  brand_dna             TEXT,        -- Gerado pelo Analista IA
  brand_dna_generated_at TIMESTAMPTZ,
  -- Redes sociais
  instagram_handle      TEXT,
  linkedin_handle       TEXT,
  tiktok_handle         TEXT,
  youtube_handle        TEXT,
  website_url           TEXT,
  -- Controle
  completeness_score    INTEGER NOT NULL DEFAULT 0 CHECK (completeness_score BETWEEN 0 AND 100),
  last_enriched_at      TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE briefings
  ADD COLUMN IF NOT EXISTS target_audience TEXT,
  ADD COLUMN IF NOT EXISTS audience_age_range TEXT,
  ADD COLUMN IF NOT EXISTS value_proposition TEXT,
  ADD COLUMN IF NOT EXISTS brand_personality TEXT,
  ADD COLUMN IF NOT EXISTS tone_of_voice TEXT,
  ADD COLUMN IF NOT EXISTS brand_dna TEXT,
  ADD COLUMN IF NOT EXISTS completeness_score INTEGER NOT NULL DEFAULT 0 CHECK (completeness_score BETWEEN 0 AND 100);

CREATE INDEX IF NOT EXISTS idx_briefings_workspace ON briefings(workspace_id);
-- Removido o indice em brand_dna pois a tabela não tem linhas suficientes para isso que não falhe ou por conta de extensão,
-- e se o DB já tiver index, pg_trgm funciona.
-- CREATE INDEX IF NOT EXISTS idx_briefings_dna ON briefings USING gin(brand_dna gin_trgm_ops) WHERE brand_dna IS NOT NULL;

-- =============================================================
-- TABELA: brand_kits
-- =============================================================
CREATE TABLE IF NOT EXISTS brand_kits (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE,
  color_primary       TEXT NOT NULL DEFAULT '#7C3AED',
  color_primary_hsl   TEXT,         
  color_secondary     TEXT NOT NULL DEFAULT '#06B6D4',
  color_secondary_hsl TEXT,
  color_accent        TEXT NOT NULL DEFAULT '#F59E0B',
  color_accent_hsl    TEXT,
  color_bg_dark       TEXT NOT NULL DEFAULT '#09090F',
  color_bg_light      TEXT NOT NULL DEFAULT '#FFFFFF',
  color_text_dark     TEXT NOT NULL DEFAULT '#111111',
  color_text_light    TEXT NOT NULL DEFAULT '#FAFAFA',
  color_success       TEXT NOT NULL DEFAULT '#10B981',
  color_warning       TEXT NOT NULL DEFAULT '#F59E0B',
  color_danger        TEXT NOT NULL DEFAULT '#EF4444',
  font_heading        TEXT NOT NULL DEFAULT 'Inter',
  font_body           TEXT NOT NULL DEFAULT 'Inter',
  font_mono           TEXT NOT NULL DEFAULT 'JetBrains Mono',
  font_display        TEXT,          
  logo_url            TEXT,          
  logo_light_url      TEXT,          
  logo_icon_url       TEXT,          
  logo_horizontal_url TEXT,          
  border_radius_scale TEXT NOT NULL DEFAULT 'medium'
                      CHECK (border_radius_scale IN ('none','small','medium','large','pill')),
  shadow_style        TEXT NOT NULL DEFAULT 'subtle'
                      CHECK (shadow_style IN ('none','subtle','medium','strong')),
  animation_style     TEXT NOT NULL DEFAULT 'smooth'
                      CHECK (animation_style IN ('none','minimal','smooth','bouncy')),
  background_patterns JSONB NOT NULL DEFAULT '[]',  
  icon_set            TEXT NOT NULL DEFAULT 'lucide' CHECK (icon_set IN ('lucide','phosphor','heroicons')),
  generated_by_ai     BOOLEAN NOT NULL DEFAULT FALSE,
  ai_generation_prompt TEXT,
  version             INTEGER NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE brand_kits
  ADD COLUMN IF NOT EXISTS color_primary_hsl TEXT,
  ADD COLUMN IF NOT EXISTS animation_style TEXT NOT NULL DEFAULT 'smooth',
  ADD COLUMN IF NOT EXISTS icon_set TEXT NOT NULL DEFAULT 'lucide',
  ADD COLUMN IF NOT EXISTS logo_light_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_icon_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_horizontal_url TEXT;

-- =============================================================
-- TABELA: post_sessions_v2 (PostGen — sessões de geração)
-- =============================================================
CREATE TABLE IF NOT EXISTS post_sessions_v2 (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title               TEXT,
  description         TEXT,
  format              TEXT NOT NULL DEFAULT 'single'
                      CHECK (format IN ('single','carousel','story','reel_cover','linkedin','twitter')),
  status              TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','generating','review','approved','published','archived')),
  slides_data         JSONB NOT NULL DEFAULT '[]',    
  slides_count        INTEGER NOT NULL DEFAULT 1,
  caption             TEXT,
  hashtags            TEXT[] NOT NULL DEFAULT '{}',
  cta_text            TEXT,
  image_urls          TEXT[] NOT NULL DEFAULT '{}',   
  gif_url             TEXT,
  user_prompt         TEXT,
  template_id         UUID,
  agent_transcript    JSONB NOT NULL DEFAULT '[]',    
  ccp_context         JSONB,                          
  generation_cost_tokens INTEGER,
  simlab_session_id   UUID,                           
  simlab_status       TEXT CHECK (simlab_status IN ('not_run','passed','revised','override')),
  simlab_override_reason TEXT,
  published_at        TIMESTAMPTZ,
  scheduled_for       TIMESTAMPTZ,
  created_by          UUID REFERENCES auth.users(id),
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE post_sessions_v2
  ADD COLUMN IF NOT EXISTS simlab_session_id UUID,
  ADD COLUMN IF NOT EXISTS simlab_status TEXT,
  ADD COLUMN IF NOT EXISTS simlab_override_reason TEXT,
  ADD COLUMN IF NOT EXISTS ccp_context JSONB;

-- =============================================================
-- TABELA: post_templates
-- =============================================================
CREATE TABLE IF NOT EXISTS post_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE, 
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL
                  CHECK (category IN ('carousel','single','story','quote','data','testimonial',
                                      'announcement','ranking','checklist','comparison','before_after')),
  format          TEXT NOT NULL CHECK (format IN ('single','carousel','story','reel_cover','linkedin')),
  thumbnail_url   TEXT,
  html_base       TEXT NOT NULL,   
  css_vars        JSONB NOT NULL DEFAULT '{}',   
  default_config  JSONB NOT NULL DEFAULT '{}',   
  is_system       BOOLEAN NOT NULL DEFAULT FALSE,
  is_premium      BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  usage_count     INTEGER NOT NULL DEFAULT 0,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- VIEWS UTILITÁRIAS
-- =============================================================

-- View para dashboard: estatísticas consolidadas por workspace
CREATE OR REPLACE VIEW workspace_dashboard_stats AS
SELECT
  w.id AS workspace_id,
  COUNT(DISTINCT ps.id) FILTER (WHERE ps.status = 'published' AND ps.created_at > NOW() - INTERVAL '30 days') AS posts_published_30d,
  COUNT(DISTINCT ps.id) FILTER (WHERE ps.status = 'draft') AS posts_in_draft
FROM workspaces w
LEFT JOIN post_sessions_v2 ps ON ps.workspace_id = w.id AND ps.deleted_at IS NULL
GROUP BY w.id;
