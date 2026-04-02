-- ============================================================
-- RLS Hardening — Bio Link & CRM Module
-- Replaces permissive "Allow all" policies with proper
-- workspace-scoped isolation for all BioLink V3 tables.
-- ============================================================

-- ─── bio_link_blocks ───────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bio_link_blocks'
      AND policyname = 'Allow all for bio_link_blocks'
  ) THEN
    DROP POLICY "Allow all for bio_link_blocks" ON public.bio_link_blocks;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bio_link_blocks' AND policyname = 'bio_link_blocks_workspace_isolation') THEN
    CREATE POLICY "bio_link_blocks_workspace_isolation"
      ON public.bio_link_blocks
      FOR ALL
      USING (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members
          WHERE user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.bio_links bl
          WHERE bl.id = bio_link_id
            AND bl.status = 'published'
        )
      )
      WITH CHECK (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ─── bio_link_versions ─────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bio_link_versions'
      AND policyname = 'Allow all for bio_link_versions'
  ) THEN
    DROP POLICY "Allow all for bio_link_versions" ON public.bio_link_versions;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bio_link_versions' AND policyname = 'bio_link_versions_workspace_isolation') THEN
    CREATE POLICY "bio_link_versions_workspace_isolation"
      ON public.bio_link_versions
      FOR ALL
      USING (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members
          WHERE user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.bio_links bl
          WHERE bl.published_version_id = bio_link_versions.id
            AND bl.status = 'published'
        )
      )
      WITH CHECK (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ─── public_page_events ────────────────────────────────────
-- Events are insert-only from the public page (no auth required to track)
-- Reads are restricted to workspace owners

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'public_page_events'
      AND policyname = 'Allow all for public_page_events'
  ) THEN
    DROP POLICY "Allow all for public_page_events" ON public.public_page_events;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'public_page_events' AND policyname = 'public_page_events_insert_anon') THEN
    CREATE POLICY "public_page_events_insert_anon"
      ON public.public_page_events
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'public_page_events' AND policyname = 'public_page_events_read_workspace') THEN
    CREATE POLICY "public_page_events_read_workspace"
      ON public.public_page_events
      FOR SELECT
      USING (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ─── crm_contacts ──────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'crm_contacts'
      AND policyname = 'Allow all for crm_contacts'
  ) THEN
    DROP POLICY "Allow all for crm_contacts" ON public.crm_contacts;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_contacts' AND policyname = 'crm_contacts_insert_anon') THEN
    CREATE POLICY "crm_contacts_insert_anon"
      ON public.crm_contacts
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_contacts' AND policyname = 'crm_contacts_workspace_isolation') THEN
    CREATE POLICY "crm_contacts_workspace_isolation"
      ON public.crm_contacts
      FOR SELECT
      USING (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_contacts' AND policyname = 'crm_contacts_update_workspace') THEN
    CREATE POLICY "crm_contacts_update_workspace"
      ON public.crm_contacts
      FOR UPDATE
      USING (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ─── crm_messages ──────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'crm_messages'
      AND policyname = 'Allow all for crm_messages'
  ) THEN
    DROP POLICY "Allow all for crm_messages" ON public.crm_messages;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_messages' AND policyname = 'crm_messages_insert_anon') THEN
    CREATE POLICY "crm_messages_insert_anon"
      ON public.crm_messages
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_messages' AND policyname = 'crm_messages_workspace_isolation') THEN
    CREATE POLICY "crm_messages_workspace_isolation"
      ON public.crm_messages
      FOR SELECT
      USING (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ─── crm_interactions ──────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'crm_interactions'
      AND policyname = 'Allow all for crm_interactions'
  ) THEN
    DROP POLICY "Allow all for crm_interactions" ON public.crm_interactions;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_interactions' AND policyname = 'crm_interactions_workspace_isolation') THEN
    CREATE POLICY "crm_interactions_workspace_isolation"
      ON public.crm_interactions
      FOR ALL
      USING (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members
          WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ─── crm_bookings ──────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'crm_bookings'
      AND policyname = 'Allow all for crm_bookings'
  ) THEN
    DROP POLICY "Allow all for crm_bookings" ON public.crm_bookings;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_bookings' AND policyname = 'crm_bookings_workspace_isolation') THEN
    CREATE POLICY "crm_bookings_workspace_isolation"
      ON public.crm_bookings
      FOR ALL
      USING (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members
          WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (true);
  END IF;
END $$;

-- ─── crm_event_registrations ───────────────────────────────

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'crm_event_registrations'
      AND policyname = 'Allow all for crm_event_registrations'
  ) THEN
    DROP POLICY "Allow all for crm_event_registrations" ON public.crm_event_registrations;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_event_registrations' AND policyname = 'crm_event_regs_workspace') THEN
    CREATE POLICY "crm_event_regs_workspace"
      ON public.crm_event_registrations
      FOR ALL
      USING (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members
          WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (true);
  END IF;
END $$;

-- ─── crm_downloads ─────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'crm_downloads'
      AND policyname = 'Allow all for crm_downloads'
  ) THEN
    DROP POLICY "Allow all for crm_downloads" ON public.crm_downloads;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_downloads' AND policyname = 'crm_downloads_workspace') THEN
    CREATE POLICY "crm_downloads_workspace"
      ON public.crm_downloads
      FOR ALL
      USING (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members
          WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (true);
  END IF;
END $$;

-- ─── crm_tags + crm_contact_tags ───────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_tags' AND policyname = 'Allow all for crm_tags') THEN
    DROP POLICY "Allow all for crm_tags" ON public.crm_tags;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_tags' AND policyname = 'crm_tags_workspace') THEN
    CREATE POLICY "crm_tags_workspace"
      ON public.crm_tags
      FOR ALL
      USING (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members
          WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_contact_tags' AND policyname = 'Allow all for crm_contact_tags') THEN
    DROP POLICY "Allow all for crm_contact_tags" ON public.crm_contact_tags;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_contact_tags' AND policyname = 'crm_contact_tags_workspace') THEN
    CREATE POLICY "crm_contact_tags_workspace"
      ON public.crm_contact_tags
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.crm_contacts c
          JOIN public.workspace_members wm ON wm.workspace_id = c.workspace_id
          WHERE c.id = contact_id AND wm.user_id = auth.uid()
        )
      )
      WITH CHECK (true);
  END IF;
END $$;

-- ─── crm_campaigns + crm_campaign_events ───────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_campaigns' AND policyname = 'Allow all for crm_campaigns') THEN
    DROP POLICY "Allow all for crm_campaigns" ON public.crm_campaigns;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_campaigns' AND policyname = 'crm_campaigns_workspace') THEN
    CREATE POLICY "crm_campaigns_workspace"
      ON public.crm_campaigns
      FOR ALL
      USING (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members
          WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_campaign_events' AND policyname = 'Allow all for crm_campaign_events') THEN
    DROP POLICY "Allow all for crm_campaign_events" ON public.crm_campaign_events;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_campaign_events' AND policyname = 'crm_campaign_events_workspace') THEN
    CREATE POLICY "crm_campaign_events_workspace"
      ON public.crm_campaign_events
      FOR ALL
      USING (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members
          WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (true);
  END IF;
END $$;

-- ─── public_domains ────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'public_domains' AND policyname = 'Allow all for public_domains') THEN
    DROP POLICY "Allow all for public_domains" ON public.public_domains;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'public_domains' AND policyname = 'public_domains_workspace') THEN
    CREATE POLICY "public_domains_workspace"
      ON public.public_domains
      FOR ALL
      USING (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members
          WHERE user_id = auth.uid()
        )
        OR verified = true
      )
      WITH CHECK (
        workspace_id IN (
          SELECT workspace_id FROM public.workspace_members
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;
