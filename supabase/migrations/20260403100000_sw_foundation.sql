-- =============================================================
-- Simwork hard cut - foundation
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS sw_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  limits JSONB NOT NULL DEFAULT '{}',
  price_monthly NUMERIC(12,2) NOT NULL DEFAULT 0,
  price_yearly NUMERIC(12,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO sw_plans (code, name, limits, price_monthly, price_yearly)
VALUES
  ('free', 'Free', '{"workspaces":1,"seats":1}', 0, 0),
  ('starter', 'Starter', '{"workspaces":1,"seats":3}', 49, 490),
  ('pro', 'Pro', '{"workspaces":3,"seats":10}', 149, 1490),
  ('agency', 'Agency', '{"workspaces":10,"seats":50}', 399, 3990),
  ('enterprise', 'Enterprise', '{"workspaces":999,"seats":999}', 0, 0)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS sw_workspaces (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  locale TEXT NOT NULL DEFAULT 'pt-BR',
  plan_id UUID REFERENCES sw_plans(id),
  legacy_plan_code TEXT,
  settings JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sw_workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES sw_workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','editor','viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited','active','suspended')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS sw_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES sw_workspaces(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, workspace_id)
);

CREATE TABLE IF NOT EXISTS sw_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES sw_workspaces(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES sw_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive','trialing','active','past_due','canceled')),
  current_period_end TIMESTAMPTZ,
  gateway TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sw_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  scopes JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sw_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES sw_workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sw_system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES sw_workspaces(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('debug','info','warn','error','fatal')),
  module TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sw_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES sw_workspaces(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  function_name TEXT,
  error_code TEXT,
  message TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  retry_count INTEGER NOT NULL DEFAULT 0,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sw_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','mitigated','resolved')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  module TEXT,
  workspace_id UUID REFERENCES sw_workspaces(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sw_help_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES sw_workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, workspace_id, module_key)
);

CREATE TABLE IF NOT EXISTS sw_dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES sw_workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sw_workspace_members_workspace ON sw_workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sw_workspace_members_user ON sw_workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_sw_system_logs_workspace ON sw_system_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sw_error_logs_workspace ON sw_error_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sw_audit_logs_workspace ON sw_audit_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sw_help_views_workspace ON sw_help_views(workspace_id, module_key);

CREATE TABLE IF NOT EXISTS sw_brand_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES sw_workspaces(id) ON DELETE CASCADE UNIQUE,
  colors JSONB NOT NULL DEFAULT '{}',
  fonts JSONB NOT NULL DEFAULT '{}',
  logos JSONB NOT NULL DEFAULT '{}',
  tone_of_voice TEXT,
  brand_name TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sw_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES sw_workspaces(id) ON DELETE CASCADE UNIQUE,
  title TEXT NOT NULL DEFAULT 'Briefing principal',
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('rascunho','ativo','arquivado')),
  content JSONB NOT NULL DEFAULT '{}',
  completeness_score INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF to_regclass('public.workspaces') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO sw_workspaces (id, name, slug, logo_url, timezone, locale, legacy_plan_code, is_active, created_at, updated_at)
      SELECT
        w.id,
        w.name,
        COALESCE(NULLIF(w.slug, ''), 'workspace-' || SUBSTRING(w.id::text, 1, 8)),
        w.logo_url,
        COALESCE(w.timezone, 'America/Sao_Paulo'),
        COALESCE(w.locale, 'pt-BR'),
        COALESCE(w.plan, 'free'),
        COALESCE(w.is_active, TRUE),
        COALESCE(w.created_at, NOW()),
        COALESCE(w.updated_at, NOW())
      FROM workspaces w
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        logo_url = EXCLUDED.logo_url,
        timezone = EXCLUDED.timezone,
        locale = EXCLUDED.locale,
        legacy_plan_code = EXCLUDED.legacy_plan_code,
        is_active = EXCLUDED.is_active,
        updated_at = EXCLUDED.updated_at
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.workspace_members') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO sw_workspace_members (workspace_id, user_id, role, status, invited_by, invited_at, accepted_at, created_at, updated_at)
      SELECT
        m.workspace_id,
        m.user_id,
        COALESCE(m.role, 'viewer'),
        CASE WHEN COALESCE(m.status, 'active') IN ('invited','active','suspended') THEN COALESCE(m.status, 'active') ELSE 'active' END,
        m.invited_by,
        COALESCE(m.invited_at, NOW()),
        m.accepted_at,
        COALESCE(m.created_at, NOW()),
        COALESCE(m.updated_at, NOW())
      FROM workspace_members m
      ON CONFLICT (workspace_id, user_id) DO UPDATE SET
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        accepted_at = EXCLUDED.accepted_at,
        updated_at = EXCLUDED.updated_at
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.brand_kits') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO sw_brand_kits (workspace_id, colors, fonts, logos, updated_at, created_at)
      SELECT
        bk.workspace_id,
        jsonb_build_object(
          'primary', bk.color_primary,
          'secondary', bk.color_secondary,
          'accent', bk.color_accent,
          'bg_dark', bk.color_bg_dark,
          'bg_light', bk.color_bg_light,
          'text_dark', bk.color_text_dark,
          'text_light', bk.color_text_light,
          'custom', COALESCE(bk.custom_colors, '[]'::jsonb)
        ),
        jsonb_build_object(
          'heading', bk.font_headline,
          'body', bk.font_body,
          'accent', bk.font_accent
        ),
        jsonb_build_object(
          'primary', bk.logo_url,
          'dark', bk.logo_dark_url
        ),
        COALESCE(bk.updated_at, NOW()),
        COALESCE(bk.updated_at, NOW())
      FROM brand_kits bk
      ON CONFLICT (workspace_id) DO UPDATE SET
        colors = EXCLUDED.colors,
        fonts = EXCLUDED.fonts,
        logos = EXCLUDED.logos,
        updated_at = EXCLUDED.updated_at
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.briefings') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO sw_briefings (workspace_id, title, status, content, completeness_score, created_at, updated_at)
      SELECT
        b.workspace_id,
        COALESCE(NULLIF(b.company_name, ''), 'Briefing principal'),
        'ativo',
        jsonb_build_object(
          'company_name', b.company_name,
          'segment', b.segment,
          'target_audience', b.target_audience,
          'main_differentials', b.main_differentials,
          'tone_of_voice', b.tone_of_voice,
          'pain_points', b.pain_points,
          'market_position', b.market_position,
          'avoid_topics', b.avoid_topics,
          'content_pillars', COALESCE(b.content_pillars, '[]'::jsonb),
          'keywords', COALESCE(to_jsonb(b.keywords), '[]'::jsonb),
          'instagram_handle', b.instagram_handle,
          'linkedin_handle', b.linkedin_handle,
          'brand_dna', b.brand_dna,
          'viral_patterns_cache', COALESCE(b.viral_patterns_cache, '{}'::jsonb),
          'last_competitor_analysis', b.last_competitor_analysis
        ),
        COALESCE(b.completeness_score, 0),
        COALESCE(b.created_at, NOW()),
        COALESCE(b.updated_at, NOW())
      FROM briefings b
      ON CONFLICT (workspace_id) DO UPDATE SET
        content = EXCLUDED.content,
        completeness_score = EXCLUDED.completeness_score,
        updated_at = EXCLUDED.updated_at
    $sql$;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_sw_workspace_role(p_workspace_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role
  FROM sw_workspace_members
  WHERE workspace_id = p_workspace_id
    AND user_id = auth.uid()
    AND status = 'active'
  LIMIT 1
$$;

ALTER TABLE sw_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE sw_workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sw_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sw_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sw_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sw_system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sw_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sw_help_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE sw_dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sw_brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE sw_briefings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sw_workspaces_select ON sw_workspaces;
CREATE POLICY sw_workspaces_select ON sw_workspaces
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM sw_workspace_members m
      WHERE m.workspace_id = sw_workspaces.id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS sw_workspaces_insert ON sw_workspaces;
CREATE POLICY sw_workspaces_insert ON sw_workspaces
  FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR owner_id IS NULL);

DROP POLICY IF EXISTS sw_workspaces_update ON sw_workspaces;
CREATE POLICY sw_workspaces_update ON sw_workspaces
  FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR public.get_sw_workspace_role(id) IN ('owner','admin')
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR public.get_sw_workspace_role(id) IN ('owner','admin')
  );

DROP POLICY IF EXISTS sw_workspace_members_select ON sw_workspace_members;
CREATE POLICY sw_workspace_members_select ON sw_workspace_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.get_sw_workspace_role(workspace_id) IN ('owner','admin')
  );

DROP POLICY IF EXISTS sw_workspace_members_write ON sw_workspace_members;
CREATE POLICY sw_workspace_members_write ON sw_workspace_members
  FOR ALL
  USING (public.get_sw_workspace_role(workspace_id) IN ('owner','admin'))
  WITH CHECK (public.get_sw_workspace_role(workspace_id) IN ('owner','admin'));

DROP POLICY IF EXISTS sw_profiles_access ON sw_profiles;
CREATE POLICY sw_profiles_access ON sw_profiles
  FOR ALL
  USING (
    user_id = auth.uid()
    OR public.get_sw_workspace_role(workspace_id) IN ('owner','admin')
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.get_sw_workspace_role(workspace_id) IN ('owner','admin')
  );

DROP POLICY IF EXISTS sw_subscriptions_access ON sw_subscriptions;
CREATE POLICY sw_subscriptions_access ON sw_subscriptions
  FOR ALL
  USING (public.get_sw_workspace_role(workspace_id) IN ('owner','admin'))
  WITH CHECK (public.get_sw_workspace_role(workspace_id) IN ('owner','admin'));

DROP POLICY IF EXISTS sw_audit_logs_read ON sw_audit_logs;
CREATE POLICY sw_audit_logs_read ON sw_audit_logs
  FOR SELECT
  USING (public.get_sw_workspace_role(workspace_id) IN ('owner','admin'));

DROP POLICY IF EXISTS sw_system_logs_read ON sw_system_logs;
CREATE POLICY sw_system_logs_read ON sw_system_logs
  FOR SELECT
  USING (workspace_id IS NULL OR public.get_sw_workspace_role(workspace_id) IN ('owner','admin'));

DROP POLICY IF EXISTS sw_error_logs_read ON sw_error_logs;
CREATE POLICY sw_error_logs_read ON sw_error_logs
  FOR SELECT
  USING (workspace_id IS NULL OR public.get_sw_workspace_role(workspace_id) IN ('owner','admin'));

DROP POLICY IF EXISTS sw_help_views_access ON sw_help_views;
CREATE POLICY sw_help_views_access ON sw_help_views
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS sw_dashboard_widgets_access ON sw_dashboard_widgets;
CREATE POLICY sw_dashboard_widgets_access ON sw_dashboard_widgets
  FOR ALL
  USING (
    user_id = auth.uid()
    OR public.get_sw_workspace_role(workspace_id) IN ('owner','admin')
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.get_sw_workspace_role(workspace_id) IN ('owner','admin')
  );

DROP POLICY IF EXISTS sw_brand_kits_access ON sw_brand_kits;
CREATE POLICY sw_brand_kits_access ON sw_brand_kits
  FOR ALL
  USING (public.get_sw_workspace_role(workspace_id) IS NOT NULL)
  WITH CHECK (public.get_sw_workspace_role(workspace_id) IN ('owner','admin','editor'));

DROP POLICY IF EXISTS sw_briefings_access ON sw_briefings;
CREATE POLICY sw_briefings_access ON sw_briefings
  FOR ALL
  USING (public.get_sw_workspace_role(workspace_id) IS NOT NULL)
  WITH CHECK (public.get_sw_workspace_role(workspace_id) IN ('owner','admin','editor'));
