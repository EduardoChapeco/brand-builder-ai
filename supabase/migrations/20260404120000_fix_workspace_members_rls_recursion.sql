-- ============================================================
-- Fix workspace_members RLS recursion
-- ============================================================
-- Problem:
-- The existing SELECT policy on public.workspace_members calls
-- public.workspace_member_can_access(workspace_id), and that helper
-- queries public.workspace_members again. This creates infinite
-- recursion during policy evaluation and breaks workspace shell reads.
--
-- Strategy:
-- - keep workspace_member_can_* helpers for other tables
-- - rewrite ONLY workspace_members policies so they do not depend on
--   workspace_member_can_access/workspace_member_can_admin
-- - allow:
--   * the user to read their own membership row
--   * platform admins (profiles.is_admin = true) to read/manage rows
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND COALESCE(p.is_admin, false) = true
  );
$$;

DROP POLICY IF EXISTS "Workspace members visible to self or workspace" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace members insert by admins" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace members update by admins" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace members delete by admins" ON public.workspace_members;
DROP POLICY IF EXISTS "dev_bypass_workspace_members_read" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace members visible to self or platform admins" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace members insert by platform admins" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace members update by platform admins" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace members delete by platform admins" ON public.workspace_members;

CREATE POLICY "Workspace members visible to self or platform admins"
  ON public.workspace_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_platform_admin()
  );

CREATE POLICY "Workspace members insert by platform admins"
  ON public.workspace_members
  FOR INSERT
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "Workspace members update by platform admins"
  ON public.workspace_members
  FOR UPDATE
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "Workspace members delete by platform admins"
  ON public.workspace_members
  FOR DELETE
  USING (public.is_platform_admin());
