-- ============================================================
-- SDD Website Builder Canonical Sections
-- TASK-010 / TASK-012
-- Canonical page sections with legacy content_blocks compatibility
-- ============================================================

ALTER TABLE public.website_pages
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE public.website_pages AS p
SET workspace_id = w.workspace_id
FROM public.websites AS w
WHERE p.website_id = w.id
  AND p.workspace_id IS NULL;

CREATE OR REPLACE FUNCTION public.sync_website_page_workspace_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.website_id IS NOT NULL THEN
    SELECT w.workspace_id
    INTO NEW.workspace_id
    FROM public.websites AS w
    WHERE w.id = NEW.website_id;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'sync_website_page_workspace_id_trigger'
  ) THEN
    CREATE TRIGGER sync_website_page_workspace_id_trigger
      BEFORE INSERT OR UPDATE OF website_id
      ON public.website_pages
      FOR EACH ROW
      EXECUTE FUNCTION public.sync_website_page_workspace_id();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_website_pages_workspace_active
  ON public.website_pages(workspace_id, website_id, sort_order)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.website_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.website_pages(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL
    CHECK (
      section_type IN (
        'hero',
        'features',
        'benefits',
        'pricing',
        'faq',
        'testimonials',
        'cta',
        'contact_form',
        'gallery',
        'video_embed',
        'stats',
        'team',
        'blog_feed',
        'newsletter',
        'social_proof',
        'comparison_table',
        'timeline',
        'custom_html',
        'legacy_block'
      )
    ),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  bg_type TEXT NOT NULL DEFAULT 'color'
    CHECK (bg_type IN ('color', 'gradient', 'image', 'pattern')),
  bg_value TEXT,
  padding_top TEXT NOT NULL DEFAULT 'lg',
  padding_bottom TEXT NOT NULL DEFAULT 'lg',
  style_override JSONB NOT NULL DEFAULT '{}'::jsonb,
  scroll_animation TEXT NOT NULL DEFAULT 'none'
    CHECK (scroll_animation IN ('none', 'fade_up', 'fade_in', 'slide_left', 'slide_right', 'zoom_in')),
  version INTEGER NOT NULL DEFAULT 1,
  snapshot_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_sections_page_sort_active
  ON public.website_sections(page_id, sort_order)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_website_sections_workspace_active
  ON public.website_sections(workspace_id, page_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_website_sections_content_gin
  ON public.website_sections
  USING gin (content);

CREATE INDEX IF NOT EXISTS idx_website_sections_snapshot_history_gin
  ON public.website_sections
  USING gin (snapshot_history);

ALTER TABLE public.website_sections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'website_sections'
      AND policyname = 'Website sections readable by members'
  ) THEN
    CREATE POLICY "Website sections readable by members"
      ON public.website_sections
      FOR SELECT
      USING (deleted_at IS NULL AND public.workspace_member_can_access(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'website_sections'
      AND policyname = 'Website sections writable by editors'
  ) THEN
    CREATE POLICY "Website sections writable by editors"
      ON public.website_sections
      FOR ALL
      USING (public.workspace_member_can_write(workspace_id))
      WITH CHECK (public.workspace_member_can_write(workspace_id));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_v2') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = 'update_website_pages_updated_at_v2'
    ) THEN
      CREATE TRIGGER update_website_pages_updated_at_v2
        BEFORE UPDATE ON public.website_pages
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_v2();
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = 'update_website_sections_updated_at'
    ) THEN
      CREATE TRIGGER update_website_sections_updated_at
        BEFORE UPDATE ON public.website_sections
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_v2();
    END IF;
  END IF;
END $$;
