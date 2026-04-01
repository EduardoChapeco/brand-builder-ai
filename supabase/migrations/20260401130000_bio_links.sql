-- ============================================================
-- Bio Links Premium
-- Incremental over the current MVP workspace model
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bio_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  theme_id TEXT DEFAULT 'glass-dark',
  theme_config JSONB DEFAULT '{}'::jsonb,
  profile JSONB DEFAULT '{}'::jsonb,
  links JSONB DEFAULT '[]'::jsonb,
  blocks JSONB DEFAULT '[]'::jsonb,
  seo_config JSONB DEFAULT '{}'::jsonb,
  published_html TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.bio_links
  ADD COLUMN IF NOT EXISTS theme_id TEXT DEFAULT 'glass-dark',
  ADD COLUMN IF NOT EXISTS blocks JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS seo_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS published_html TEXT,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;

ALTER TABLE public.bio_links ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bio_links'
      AND policyname = 'BioLinks public published read'
  ) THEN
    CREATE POLICY "BioLinks public published read"
      ON public.bio_links FOR SELECT
      USING (is_published = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bio_links'
      AND policyname = 'BioLinks workspace insert'
  ) THEN
    CREATE POLICY "BioLinks workspace insert"
      ON public.bio_links FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bio_links'
      AND policyname = 'BioLinks workspace update'
  ) THEN
    CREATE POLICY "BioLinks workspace update"
      ON public.bio_links FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bio_links'
      AND policyname = 'BioLinks workspace delete'
  ) THEN
    CREATE POLICY "BioLinks workspace delete"
      ON public.bio_links FOR DELETE
      USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS bio_links_workspace_id_idx ON public.bio_links(workspace_id);
CREATE INDEX IF NOT EXISTS bio_links_is_published_idx ON public.bio_links(is_published);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_v2')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_bio_links_updated_at') THEN
    CREATE TRIGGER update_bio_links_updated_at
      BEFORE UPDATE ON public.bio_links
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_v2();
  END IF;
END $$;
