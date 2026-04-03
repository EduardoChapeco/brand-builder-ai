-- ============================================================
-- DEV BYPASS MIGRATION: Temporarily disable read restrictions
-- "sem login por enquanto" - user requested to bypass login
-- This allows the UI to render and fetch data without auth.uid()
-- ============================================================

DO $$ BEGIN
  -- Allow public read on workspaces
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='workspaces' AND policyname='dev_bypass_workspaces_read') THEN
    CREATE POLICY "dev_bypass_workspaces_read" ON public.workspaces FOR SELECT USING (true);
  END IF;

  -- Allow public read on brand_kits
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='brand_kits' AND policyname='dev_bypass_brand_kits_read') THEN
    CREATE POLICY "dev_bypass_brand_kits_read" ON public.brand_kits FOR SELECT USING (true);
  END IF;

  -- Allow public read on briefings
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='briefings' AND policyname='dev_bypass_briefings_read') THEN
    CREATE POLICY "dev_bypass_briefings_read" ON public.briefings FOR SELECT USING (true);
  END IF;

  -- Allow public read on bios
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bio_links' AND policyname='dev_bypass_bio_links_read') THEN
    CREATE POLICY "dev_bypass_bio_links_read" ON public.bio_links FOR SELECT USING (true);
  END IF;
  
  -- Allow public read on workspace_members
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='workspace_members' AND policyname='dev_bypass_workspace_members_read') THEN
    CREATE POLICY "dev_bypass_workspace_members_read" ON public.workspace_members FOR SELECT USING (true);
  END IF;
END $$;
