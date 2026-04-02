-- ============================================================
-- SimLab v2 - RLS policies and bio_links public read
-- ============================================================

DROP POLICY IF EXISTS "BioLinks public published read" ON public.bio_links;
DROP POLICY IF EXISTS "SimLab personas readable" ON public.simlab_personas;
DROP POLICY IF EXISTS "SimLab personas writable by admins" ON public.simlab_personas;
DROP POLICY IF EXISTS "SimLab persona versions readable" ON public.simlab_persona_versions;
DROP POLICY IF EXISTS "SimLab persona versions writable by admins" ON public.simlab_persona_versions;
DROP POLICY IF EXISTS "SimLab runs readable by members" ON public.simlab_runs;
DROP POLICY IF EXISTS "SimLab runs writable by editors" ON public.simlab_runs;
DROP POLICY IF EXISTS "SimLab run variants readable by members" ON public.simlab_variants;
DROP POLICY IF EXISTS "SimLab run variants writable by editors" ON public.simlab_variants;
DROP POLICY IF EXISTS "SimLab run agents readable by members" ON public.simlab_run_agents;
DROP POLICY IF EXISTS "SimLab run agents writable by editors" ON public.simlab_run_agents;
DROP POLICY IF EXISTS "SimLab responses readable by members" ON public.simlab_responses;
DROP POLICY IF EXISTS "SimLab responses writable by editors" ON public.simlab_responses;
DROP POLICY IF EXISTS "SimLab insights readable by members" ON public.simlab_insights;
DROP POLICY IF EXISTS "SimLab insights writable by editors" ON public.simlab_insights;
DROP POLICY IF EXISTS "SimLab module policies readable" ON public.simlab_module_policies;
DROP POLICY IF EXISTS "SimLab module policies writable by admins" ON public.simlab_module_policies;
DROP POLICY IF EXISTS "SimLab observations readable by members" ON public.simlab_observations;
DROP POLICY IF EXISTS "SimLab observations writable by editors" ON public.simlab_observations;
DROP POLICY IF EXISTS "SimLab character bindings readable by members" ON public.simlab_character_bindings;
DROP POLICY IF EXISTS "SimLab character bindings writable by editors" ON public.simlab_character_bindings;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bio_links'
      AND policyname = 'BioLinks public published read'
  ) THEN
    CREATE POLICY "BioLinks public published read"
      ON public.bio_links
      FOR SELECT
      USING (is_published = TRUE);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'simlab_module_policies'
      AND policyname = 'SimLab module policies readable'
  ) THEN
    CREATE POLICY "SimLab module policies readable"
      ON public.simlab_module_policies
      FOR SELECT
      USING (
        auth.uid() IS NOT NULL
        AND (
          (workspace_id IS NULL AND is_default = TRUE)
          OR public.workspace_member_can_access(workspace_id)
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'simlab_module_policies'
      AND policyname = 'SimLab module policies writable by admins'
  ) THEN
    CREATE POLICY "SimLab module policies writable by admins"
      ON public.simlab_module_policies
      FOR ALL
      USING (
        workspace_id IS NOT NULL
        AND public.workspace_member_can_admin(workspace_id)
      )
      WITH CHECK (
        workspace_id IS NOT NULL
        AND public.workspace_member_can_admin(workspace_id)
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'simlab_observations'
      AND policyname = 'SimLab observations readable by members'
  ) THEN
    CREATE POLICY "SimLab observations readable by members"
      ON public.simlab_observations
      FOR SELECT
      USING (public.workspace_member_can_access(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'simlab_observations'
      AND policyname = 'SimLab observations writable by editors'
  ) THEN
    CREATE POLICY "SimLab observations writable by editors"
      ON public.simlab_observations
      FOR ALL
      USING (public.workspace_member_can_write(workspace_id))
      WITH CHECK (public.workspace_member_can_write(workspace_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'simlab_character_bindings'
      AND policyname = 'SimLab character bindings readable by members'
  ) THEN
    CREATE POLICY "SimLab character bindings readable by members"
      ON public.simlab_character_bindings
      FOR SELECT
      USING (public.workspace_member_can_access(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'simlab_character_bindings'
      AND policyname = 'SimLab character bindings writable by editors'
  ) THEN
    CREATE POLICY "SimLab character bindings writable by editors"
      ON public.simlab_character_bindings
      FOR ALL
      USING (public.workspace_member_can_write(workspace_id))
      WITH CHECK (public.workspace_member_can_write(workspace_id));
  END IF;
END $$;


DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'simlab_personas'
      AND policyname = 'SimLab personas readable'
  ) THEN
    CREATE POLICY "SimLab personas readable"
      ON public.simlab_personas
      FOR SELECT
      USING (
        auth.uid() IS NOT NULL
        AND (
          (workspace_id IS NULL AND is_system = TRUE)
          OR public.workspace_member_can_access(workspace_id)
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'simlab_personas'
      AND policyname = 'SimLab personas writable by admins'
  ) THEN
    CREATE POLICY "SimLab personas writable by admins"
      ON public.simlab_personas
      FOR ALL
      USING (
        workspace_id IS NOT NULL
        AND public.workspace_member_can_admin(workspace_id)
      )
      WITH CHECK (
        workspace_id IS NOT NULL
        AND public.workspace_member_can_admin(workspace_id)
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'simlab_persona_versions'
      AND policyname = 'SimLab persona versions readable'
  ) THEN
    CREATE POLICY "SimLab persona versions readable"
      ON public.simlab_persona_versions
      FOR SELECT
      USING (
        auth.uid() IS NOT NULL
        AND public.simlab_persona_can_access(persona_id)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'simlab_persona_versions'
      AND policyname = 'SimLab persona versions writable by admins'
  ) THEN
    CREATE POLICY "SimLab persona versions writable by admins"
      ON public.simlab_persona_versions
      FOR ALL
      USING (public.simlab_persona_can_write(persona_id))
      WITH CHECK (public.simlab_persona_can_write(persona_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'simlab_runs'
      AND policyname = 'SimLab runs readable by members'
  ) THEN
    CREATE POLICY "SimLab runs readable by members"
      ON public.simlab_runs
      FOR SELECT
      USING (public.simlab_run_can_access(id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'simlab_runs'
      AND policyname = 'SimLab runs writable by editors'
  ) THEN
    CREATE POLICY "SimLab runs writable by editors"
      ON public.simlab_runs
      FOR ALL
      USING (public.simlab_run_can_write(id))
      WITH CHECK (public.simlab_run_can_write(id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'simlab_variants'
      AND policyname = 'SimLab run variants readable by members'
  ) THEN
    CREATE POLICY "SimLab run variants readable by members"
      ON public.simlab_variants
      FOR SELECT
      USING (public.simlab_run_can_access(run_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'simlab_variants'
      AND policyname = 'SimLab run variants writable by editors'
  ) THEN
    CREATE POLICY "SimLab run variants writable by editors"
      ON public.simlab_variants
      FOR ALL
      USING (public.simlab_run_can_write(run_id))
      WITH CHECK (public.simlab_run_can_write(run_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'simlab_run_agents'
      AND policyname = 'SimLab run agents readable by members'
  ) THEN
    CREATE POLICY "SimLab run agents readable by members"
      ON public.simlab_run_agents
      FOR SELECT
      USING (public.simlab_run_can_access(run_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'simlab_run_agents'
      AND policyname = 'SimLab run agents writable by editors'
  ) THEN
    CREATE POLICY "SimLab run agents writable by editors"
      ON public.simlab_run_agents
      FOR ALL
      USING (public.simlab_run_can_write(run_id))
      WITH CHECK (public.simlab_run_can_write(run_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'simlab_responses'
      AND policyname = 'SimLab responses readable by members'
  ) THEN
    CREATE POLICY "SimLab responses readable by members"
      ON public.simlab_responses
      FOR SELECT
      USING (public.simlab_run_can_access(run_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'simlab_responses'
      AND policyname = 'SimLab responses writable by editors'
  ) THEN
    CREATE POLICY "SimLab responses writable by editors"
      ON public.simlab_responses
      FOR ALL
      USING (public.simlab_run_can_write(run_id))
      WITH CHECK (public.simlab_run_can_write(run_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'simlab_insights'
      AND policyname = 'SimLab insights readable by members'
  ) THEN
    CREATE POLICY "SimLab insights readable by members"
      ON public.simlab_insights
      FOR SELECT
      USING (public.simlab_run_can_access(run_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'simlab_insights'
      AND policyname = 'SimLab insights writable by editors'
  ) THEN
    CREATE POLICY "SimLab insights writable by editors"
      ON public.simlab_insights
      FOR ALL
      USING (public.simlab_run_can_write(run_id))
      WITH CHECK (public.simlab_run_can_write(run_id));
  END IF;
END $$;
