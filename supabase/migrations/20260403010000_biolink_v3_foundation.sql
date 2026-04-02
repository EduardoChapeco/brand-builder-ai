-- ============================================================
-- Bio Link Inteligente V3
-- Foundation schema + compatibility backfill
-- ============================================================

CREATE TABLE IF NOT EXISTS public.public_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_type TEXT NOT NULL DEFAULT 'bio_link',
  record_id UUID NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  verified BOOLEAN NOT NULL DEFAULT false,
  dns_status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.public_domains ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.bio_links
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS bio_text TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS header_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS background_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS theme_key TEXT NOT NULL DEFAULT 'brand-auto',
  ADD COLUMN IF NOT EXISTS theme_tokens JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS layout_template_key TEXT NOT NULL DEFAULT 'creator-standard',
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS seo_image_url TEXT,
  ADD COLUMN IF NOT EXISTS meta_pixel_id TEXT,
  ADD COLUMN IF NOT EXISTS ga4_measurement_id TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_pixel_id TEXT,
  ADD COLUMN IF NOT EXISTS gtm_id TEXT,
  ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cta_text TEXT,
  ADD COLUMN IF NOT EXISTS cta_url TEXT,
  ADD COLUMN IF NOT EXISTS cta_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_views INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_clicks INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS latest_version_number INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS published_version_id UUID,
  ADD COLUMN IF NOT EXISTS public_domain_id UUID,
  ADD COLUMN IF NOT EXISTS latest_simlab_run_id UUID;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bio_links_status_check'
  ) THEN
    ALTER TABLE public.bio_links
      ADD CONSTRAINT bio_links_status_check
      CHECK (status IN ('draft', 'published', 'paused', 'scheduled'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bio_links_public_domain_id_fkey'
  ) THEN
    ALTER TABLE public.bio_links
      ADD CONSTRAINT bio_links_public_domain_id_fkey
      FOREIGN KEY (public_domain_id) REFERENCES public.public_domains(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.bio_link_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bio_link_id UUID NOT NULL REFERENCES public.bio_links(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL,
  size TEXT NOT NULL DEFAULT 'XL',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  position INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  layout_slot TEXT,
  visibility_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  draft_only BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bio_link_blocks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bio_link_blocks_size_check'
  ) THEN
    ALTER TABLE public.bio_link_blocks
      ADD CONSTRAINT bio_link_blocks_size_check
      CHECK (size IN ('S', 'M', 'L', 'XL', 'F'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.bio_link_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bio_link_id UUID NOT NULL REFERENCES public.bio_links(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'published',
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bio_link_id, version_number)
);

ALTER TABLE public.bio_link_versions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.public_page_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_type TEXT NOT NULL DEFAULT 'bio_link',
  record_type TEXT NOT NULL DEFAULT 'bio_link',
  record_id UUID NOT NULL REFERENCES public.bio_links(id) ON DELETE CASCADE,
  published_version_id UUID REFERENCES public.bio_link_versions(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,
  event_type TEXT NOT NULL,
  block_id UUID REFERENCES public.bio_link_blocks(id) ON DELETE SET NULL,
  block_type TEXT,
  target_url TEXT,
  session_id TEXT,
  visitor_id TEXT,
  referrer TEXT,
  user_agent TEXT,
  device_type TEXT,
  country TEXT,
  city TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.public_page_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT,
  primary_email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  source_module TEXT NOT NULL DEFAULT 'bio_link',
  source_record_id UUID REFERENCES public.bio_links(id) ON DELETE SET NULL,
  source_block_id UUID REFERENCES public.bio_link_blocks(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  last_interaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.crm_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  source_module TEXT NOT NULL DEFAULT 'bio_link',
  source_record_id UUID REFERENCES public.bio_links(id) ON DELETE SET NULL,
  source_block_id UUID REFERENCES public.bio_link_blocks(id) ON DELETE SET NULL,
  interaction_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.crm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  source_module TEXT NOT NULL DEFAULT 'bio_link',
  source_record_id UUID REFERENCES public.bio_links(id) ON DELETE SET NULL,
  source_block_id UUID REFERENCES public.bio_link_blocks(id) ON DELETE SET NULL,
  subject TEXT,
  body TEXT,
  fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'new',
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.crm_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  source_module TEXT NOT NULL DEFAULT 'bio_link',
  source_record_id UUID REFERENCES public.bio_links(id) ON DELETE SET NULL,
  source_block_id UUID REFERENCES public.bio_link_blocks(id) ON DELETE SET NULL,
  service_name TEXT,
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_bookings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.crm_event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  source_module TEXT NOT NULL DEFAULT 'bio_link',
  source_record_id UUID REFERENCES public.bio_links(id) ON DELETE SET NULL,
  source_block_id UUID REFERENCES public.bio_link_blocks(id) ON DELETE SET NULL,
  event_name TEXT,
  event_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'registered',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_event_registrations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.crm_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  source_module TEXT NOT NULL DEFAULT 'bio_link',
  source_record_id UUID REFERENCES public.bio_links(id) ON DELETE SET NULL,
  source_block_id UUID REFERENCES public.bio_link_blocks(id) ON DELETE SET NULL,
  asset_name TEXT,
  asset_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_downloads ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.crm_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, label)
);

ALTER TABLE public.crm_tags ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.crm_contact_tags (
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.crm_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, tag_id)
);

ALTER TABLE public.crm_contact_tags ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.crm_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_module TEXT NOT NULL DEFAULT 'bio_link',
  name TEXT NOT NULL,
  subject TEXT,
  body_html TEXT,
  audience_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  total_recipients INTEGER NOT NULL DEFAULT 0,
  total_sent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

ALTER TABLE public.crm_campaigns ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.crm_campaign_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.crm_campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_campaign_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS public_domains_workspace_idx ON public.public_domains(workspace_id, module_type);
CREATE INDEX IF NOT EXISTS bio_link_blocks_biolink_position_idx ON public.bio_link_blocks(bio_link_id, position);
CREATE INDEX IF NOT EXISTS bio_link_versions_biolink_version_idx ON public.bio_link_versions(bio_link_id, version_number DESC);
CREATE INDEX IF NOT EXISTS public_page_events_record_created_idx ON public.public_page_events(record_id, created_at DESC);
CREATE INDEX IF NOT EXISTS public_page_events_slug_event_idx ON public.public_page_events(slug, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_contacts_workspace_email_idx ON public.crm_contacts(workspace_id, lower(primary_email));
CREATE INDEX IF NOT EXISTS crm_messages_workspace_created_idx ON public.crm_messages(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_bookings_workspace_date_idx ON public.crm_bookings(workspace_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS crm_event_regs_workspace_created_idx ON public.crm_event_registrations(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_downloads_workspace_created_idx ON public.crm_downloads(workspace_id, created_at DESC);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_v2') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_public_domains_updated_at') THEN
      CREATE TRIGGER update_public_domains_updated_at
        BEFORE UPDATE ON public.public_domains
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_v2();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_bio_link_blocks_updated_at_v3') THEN
      CREATE TRIGGER update_bio_link_blocks_updated_at_v3
        BEFORE UPDATE ON public.bio_link_blocks
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_v2();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_crm_contacts_updated_at') THEN
      CREATE TRIGGER update_crm_contacts_updated_at
        BEFORE UPDATE ON public.crm_contacts
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_v2();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_crm_bookings_updated_at') THEN
      CREATE TRIGGER update_crm_bookings_updated_at
        BEFORE UPDATE ON public.crm_bookings
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_v2();
    END IF;
  END IF;
END $$;

UPDATE public.bio_links
SET
  display_name = COALESCE(display_name, profile ->> 'title', slug),
  username = COALESCE(username, profile ->> 'handle', slug),
  bio_text = COALESCE(bio_text, profile ->> 'bio'),
  avatar_url = COALESCE(avatar_url, profile ->> 'avatar'),
  theme_key = COALESCE(NULLIF(theme_key, ''), theme_id, 'brand-auto'),
  theme_tokens = CASE
    WHEN theme_tokens = '{}'::jsonb THEN COALESCE(theme_config, '{}'::jsonb)
    ELSE theme_tokens
  END,
  background_config = CASE
    WHEN background_config = '{}'::jsonb THEN jsonb_build_object(
      'type', 'gradient',
      'color', '#111827',
      'gradientFrom', '#111827',
      'gradientTo', '#312e81',
      'gradientAngle', 135,
      'blur', 0
    )
    ELSE background_config
  END,
  seo_title = COALESCE(seo_title, seo_config ->> 'title', profile ->> 'title', slug),
  seo_description = COALESCE(seo_description, seo_config ->> 'description', profile ->> 'bio'),
  social_links = CASE
    WHEN social_links = '[]'::jsonb THEN COALESCE((profile -> 'socialLinks'), '[]'::jsonb)
    ELSE social_links
  END,
  status = CASE
    WHEN is_published = true THEN 'published'
    ELSE status
  END
WHERE TRUE;

INSERT INTO public.bio_link_blocks (
  bio_link_id,
  workspace_id,
  block_type,
  size,
  config,
  position,
  is_visible,
  visibility_rules,
  draft_only
)
SELECT
  bl.id,
  bl.workspace_id,
  CASE COALESCE(item.value ->> 'type', 'link')
    WHEN 'link' THEN 'link_simple'
    WHEN 'site_card' THEN 'feature_link'
    WHEN 'blog_card' THEN 'link_thumbnail'
    WHEN 'youtube' THEN 'video_embed'
    WHEN 'spotify' THEN 'spotify_embed'
    WHEN 'map' THEN 'map'
    WHEN 'newsletter' THEN 'newsletter'
    ELSE 'link_simple'
  END,
  CASE COALESCE(item.value ->> 'type', 'link')
    WHEN 'newsletter' THEN 'F'
    WHEN 'map' THEN 'XL'
    WHEN 'youtube' THEN 'XL'
    ELSE 'XL'
  END,
  item.value,
  item.ordinality - 1,
  true,
  '{}'::jsonb,
  false
FROM public.bio_links bl
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(bl.blocks, '[]'::jsonb)) WITH ORDINALITY AS item(value, ordinality)
WHERE NOT EXISTS (
  SELECT 1 FROM public.bio_link_blocks existing WHERE existing.bio_link_id = bl.id
);

WITH published_candidates AS (
  SELECT
    bl.*,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'type', b.block_type,
          'size', b.size,
          'position', b.position,
          'isVisible', b.is_visible,
          'draftOnly', b.draft_only,
          'layoutSlot', b.layout_slot,
          'visibilityRules', b.visibility_rules,
          'config', b.config
        )
        ORDER BY b.position
      ) FILTER (WHERE b.id IS NOT NULL),
      '[]'::jsonb
    ) AS blocks_json
  FROM public.bio_links bl
  LEFT JOIN public.bio_link_blocks b ON b.bio_link_id = bl.id
  WHERE bl.is_published = true
    AND bl.published_version_id IS NULL
  GROUP BY bl.id
), inserted_versions AS (
  INSERT INTO public.bio_link_versions (
    bio_link_id,
    workspace_id,
    version_number,
    status,
    snapshot,
    summary
  )
  SELECT
    pc.id,
    pc.workspace_id,
    1,
    'published',
    jsonb_build_object(
      'id', pc.id,
      'workspaceId', pc.workspace_id,
      'slug', pc.slug,
      'status', 'published',
      'displayName', COALESCE(pc.display_name, pc.slug),
      'username', COALESCE(pc.username, pc.slug),
      'bioText', COALESCE(pc.bio_text, ''),
      'avatarUrl', pc.avatar_url,
      'headerConfig', COALESCE(pc.header_config, '{}'::jsonb),
      'background', COALESCE(pc.background_config, '{}'::jsonb),
      'themeKey', COALESCE(pc.theme_key, 'brand-auto'),
      'themeTokens', COALESCE(pc.theme_tokens, '{}'::jsonb),
      'layoutTemplateKey', COALESCE(pc.layout_template_key, 'creator-standard'),
      'socialLinks', COALESCE(pc.social_links, '[]'::jsonb),
      'cta', jsonb_build_object(
        'enabled', pc.cta_enabled,
        'text', COALESCE(pc.cta_text, ''),
        'url', COALESCE(pc.cta_url, '')
      ),
      'seo', jsonb_build_object(
        'title', COALESCE(pc.seo_title, pc.slug),
        'description', COALESCE(pc.seo_description, ''),
        'imageUrl', pc.seo_image_url
      ),
      'tracking', jsonb_build_object(
        'metaPixelId', pc.meta_pixel_id,
        'ga4MeasurementId', pc.ga4_measurement_id,
        'tiktokPixelId', pc.tiktok_pixel_id,
        'gtmId', pc.gtm_id
      ),
      'blocks', pc.blocks_json,
      'publishedAt', COALESCE(pc.published_at, now())
    ),
    'Migrated from legacy Bio Link publish state'
  FROM published_candidates pc
  RETURNING id, bio_link_id
)
UPDATE public.bio_links bl
SET
  published_version_id = iv.id,
  latest_version_number = 1,
  published_at = COALESCE(bl.published_at, now()),
  status = 'published'
FROM inserted_versions iv
WHERE iv.bio_link_id = bl.id;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bio_links' AND policyname = 'BioLinks public published read v3') THEN
    CREATE POLICY "BioLinks public published read v3"
      ON public.bio_links
      FOR SELECT
      USING (status = 'published' AND published_version_id IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bio_link_versions' AND policyname = 'BioLink versions public read') THEN
    CREATE POLICY "BioLink versions public read"
      ON public.bio_link_versions
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.bio_links bl
          WHERE bl.published_version_id = bio_link_versions.id
            AND bl.status = 'published'
        )
      );
  END IF;
END $$;

-- Compatibility layer for the current web client. Remove after auth rollout.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'public_domains' AND policyname = 'Allow all for public_domains') THEN
    CREATE POLICY "Allow all for public_domains" ON public.public_domains FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bio_link_blocks' AND policyname = 'Allow all for bio_link_blocks') THEN
    CREATE POLICY "Allow all for bio_link_blocks" ON public.bio_link_blocks FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bio_link_versions' AND policyname = 'Allow all for bio_link_versions') THEN
    CREATE POLICY "Allow all for bio_link_versions" ON public.bio_link_versions FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'public_page_events' AND policyname = 'Allow all for public_page_events') THEN
    CREATE POLICY "Allow all for public_page_events" ON public.public_page_events FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_contacts' AND policyname = 'Allow all for crm_contacts') THEN
    CREATE POLICY "Allow all for crm_contacts" ON public.crm_contacts FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_interactions' AND policyname = 'Allow all for crm_interactions') THEN
    CREATE POLICY "Allow all for crm_interactions" ON public.crm_interactions FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_messages' AND policyname = 'Allow all for crm_messages') THEN
    CREATE POLICY "Allow all for crm_messages" ON public.crm_messages FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_bookings' AND policyname = 'Allow all for crm_bookings') THEN
    CREATE POLICY "Allow all for crm_bookings" ON public.crm_bookings FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_event_registrations' AND policyname = 'Allow all for crm_event_registrations') THEN
    CREATE POLICY "Allow all for crm_event_registrations" ON public.crm_event_registrations FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_downloads' AND policyname = 'Allow all for crm_downloads') THEN
    CREATE POLICY "Allow all for crm_downloads" ON public.crm_downloads FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_tags' AND policyname = 'Allow all for crm_tags') THEN
    CREATE POLICY "Allow all for crm_tags" ON public.crm_tags FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_contact_tags' AND policyname = 'Allow all for crm_contact_tags') THEN
    CREATE POLICY "Allow all for crm_contact_tags" ON public.crm_contact_tags FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_campaigns' AND policyname = 'Allow all for crm_campaigns') THEN
    CREATE POLICY "Allow all for crm_campaigns" ON public.crm_campaigns FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_campaign_events' AND policyname = 'Allow all for crm_campaign_events') THEN
    CREATE POLICY "Allow all for crm_campaign_events" ON public.crm_campaign_events FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
