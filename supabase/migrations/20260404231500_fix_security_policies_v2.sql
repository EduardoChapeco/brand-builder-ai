
-- =====================================================
-- MIGRATION: fix_security_policies_v2
-- Data: 2026-04-04
-- Propósito: Corrigir políticas RLS problemáticas + fixar search_path nas funções
-- =====================================================

-- ─────────────────────────────────────────────────────────────
-- 1. feature_flags — Adicionar políticas RLS faltantes
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'feature_flags' AND policyname = 'feature_flags_public_read'
  ) THEN
    CREATE POLICY feature_flags_public_read ON public.feature_flags
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'feature_flags' AND policyname = 'feature_flags_admin_write'
  ) THEN
    CREATE POLICY feature_flags_admin_write ON public.feature_flags
      FOR ALL
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2. admin_api_keys — Substituir políticas permissivas por restritas
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Enable delete access for all authenticated users" ON public.admin_api_keys;
DROP POLICY IF EXISTS "Enable insert access for all authenticated users" ON public.admin_api_keys;
DROP POLICY IF EXISTS "Enable update access for all authenticated users" ON public.admin_api_keys;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.admin_api_keys;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'admin_api_keys' AND policyname = 'admin_api_keys_admin_only'
  ) THEN
    CREATE POLICY admin_api_keys_admin_only ON public.admin_api_keys
      FOR ALL
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 3. Adicionar updated_at e triggers nas tabelas que não tinham
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.publication_sections
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.rss_sources
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.simlab_validations
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.workspace_api_keys
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Triggers de updated_at (idempotentes)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'set_updated_at' AND event_object_table = 'publication_sections'
  ) THEN
    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON public.publication_sections
      FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'set_updated_at' AND event_object_table = 'rss_sources'
  ) THEN
    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON public.rss_sources
      FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'set_updated_at' AND event_object_table = 'simlab_validations'
  ) THEN
    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON public.simlab_validations
      FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'set_updated_at' AND event_object_table = 'workspace_api_keys'
  ) THEN
    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON public.workspace_api_keys
      FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 4. Fixar search_path nas funções (preservando parâmetro 'wid')
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_workspace_member(wid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = wid
    AND user_id = auth.uid()
  ) OR public.check_is_admin();
END;
$$;

CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
