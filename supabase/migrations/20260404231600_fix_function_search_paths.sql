
-- =====================================================
-- MIGRATION: fix_function_search_paths
-- Data: 2026-04-04
-- Propósito: Fixar search_path nas funções restantes
-- =====================================================

-- 1. log_error
DO $$ 
DECLARE func_def TEXT;
BEGIN
  SELECT pg_get_functiondef(oid) INTO func_def FROM pg_proc WHERE proname = 'log_error' AND pronamespace = 'public'::regnamespace LIMIT 1;
  IF func_def IS NOT NULL THEN
    EXECUTE format('ALTER FUNCTION public.log_error SET search_path = public');
  END IF;
END $$;

-- 2. add_owner_to_workspace_on_create
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_owner_to_workspace_on_create' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.add_owner_to_workspace_on_create() SET search_path = public';
  END IF;
END $$;

-- 3. handle_new_user
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.handle_new_user() SET search_path = public';
  END IF;
END $$;

-- 4. handle_updated_at
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.handle_updated_at() SET search_path = public';
  END IF;
END $$;

-- 5. Corrigir workspaces INSERT policy (WITH CHECK always true)
DROP POLICY IF EXISTS "users_can_create_workspaces" ON public.workspaces;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workspaces' AND policyname = 'authenticated_users_can_create_workspaces'
  ) THEN
    CREATE POLICY authenticated_users_can_create_workspaces ON public.workspaces
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;
