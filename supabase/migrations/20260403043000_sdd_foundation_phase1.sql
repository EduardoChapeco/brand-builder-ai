-- ============================================================
-- SDD Phase 1 Foundation Complement
-- TASK-001 / TASK-004
-- Canonical compatibility bridge for encrypted api_keys and workspace helpers
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS key_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS key_preview TEXT,
  ADD COLUMN IF NOT EXISTS calls_this_month INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_limit INTEGER NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS last_429_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE public.api_keys
SET key_preview = COALESCE(key_preview, CASE WHEN key_value IS NOT NULL AND length(key_value) > 0 THEN '...' || RIGHT(key_value, 4) ELSE NULL END)
WHERE key_preview IS NULL;

CREATE OR REPLACE FUNCTION public.get_api_key(p_key_id UUID, p_app_secret TEXT)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    CASE
      WHEN key_encrypted IS NOT NULL AND p_app_secret IS NOT NULL AND length(p_app_secret) > 0
        THEN pgp_sym_decrypt(key_encrypted, p_app_secret)::TEXT
      ELSE NULL
    END,
    key_value
  )
  FROM public.api_keys
  WHERE id = p_key_id
    AND deleted_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.get_user_workspace_role(p_workspace_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wm.role
  FROM public.workspace_members wm
  WHERE wm.workspace_id = p_workspace_id
    AND wm.user_id = auth.uid()
    AND wm.status = 'active'
  LIMIT 1;
$$;

CREATE INDEX IF NOT EXISTS idx_api_keys_workspace_provider_active_v2
  ON public.api_keys(workspace_id, provider, is_active)
  WHERE deleted_at IS NULL;
