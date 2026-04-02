-- ============================================================
-- Workspace Members + Workspace RLS Hardening
-- Canonical workspace ownership and member-based access control
-- ============================================================

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor',
  status TEXT NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id),
  CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  CHECK (status IN ('active', 'invited', 'disabled'))
);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.workspace_member_has_role(
  p_workspace_id UUID,
  p_roles TEXT[] DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = auth.uid()
      AND wm.status = 'active'
      AND (
        p_roles IS NULL
        OR COALESCE(array_length(p_roles, 1), 0) = 0
        OR wm.role = ANY (p_roles)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.workspace_member_can_access(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.workspace_member_has_role(p_workspace_id, ARRAY['owner', 'admin', 'editor', 'viewer']);
$$;

CREATE OR REPLACE FUNCTION public.workspace_member_can_write(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.workspace_member_has_role(p_workspace_id, ARRAY['owner', 'admin', 'editor']);
$$;

CREATE OR REPLACE FUNCTION public.workspace_member_can_admin(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.workspace_member_has_role(p_workspace_id, ARRAY['owner', 'admin']);
$$;

CREATE OR REPLACE FUNCTION public.attach_workspace_owner_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_user_id UUID;
BEGIN
  owner_user_id := COALESCE(NEW.created_by, auth.uid());

  IF owner_user_id IS NULL THEN
    RAISE EXCEPTION 'workspace owner could not be resolved';
  END IF;

  INSERT INTO public.workspace_members (
    workspace_id,
    user_id,
    role,
    status,
    joined_at
  )
  VALUES (
    NEW.id,
    owner_user_id,
    'owner',
    'active',
    now()
  )
  ON CONFLICT (workspace_id, user_id) DO UPDATE
    SET role = EXCLUDED.role,
        status = EXCLUDED.status,
        updated_at = now();

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_v2') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_workspace_members_updated_at') THEN
      CREATE TRIGGER update_workspace_members_updated_at
        BEFORE UPDATE ON public.workspace_members
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_v2();
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'attach_workspace_owner_membership_trigger') THEN
    CREATE TRIGGER attach_workspace_owner_membership_trigger
      AFTER INSERT ON public.workspaces
      FOR EACH ROW EXECUTE FUNCTION public.attach_workspace_owner_membership();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS workspace_members_user_workspace_idx
  ON public.workspace_members(user_id, workspace_id);

CREATE INDEX IF NOT EXISTS workspace_members_workspace_role_idx
  ON public.workspace_members(workspace_id, role, status);

DROP POLICY IF EXISTS "Allow all for workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Allow all for briefings" ON public.briefings;
DROP POLICY IF EXISTS "Allow all for brand_kits" ON public.brand_kits;
DROP POLICY IF EXISTS "Allow all for posts_v2" ON public.posts_v2;
DROP POLICY IF EXISTS "Allow all for blog_articles" ON public.blog_articles;
DROP POLICY IF EXISTS "Allow all for brand_characters" ON public.brand_characters;
DROP POLICY IF EXISTS "Allow all for image_prompt_templates" ON public.image_prompt_templates;
DROP POLICY IF EXISTS "Allow all for media_assets" ON public.media_assets;
DROP POLICY IF EXISTS "Allow all for viral_analyses" ON public.viral_analyses;
DROP POLICY IF EXISTS "Allow all for carousel_storyboards" ON public.carousel_storyboards;
DROP POLICY IF EXISTS "Allow all for news_items" ON public.news_items;
DROP POLICY IF EXISTS "Allow all for landing_pages" ON public.landing_pages;
DROP POLICY IF EXISTS "Allow all for projects" ON public.projects;
DROP POLICY IF EXISTS "Allow all for platform_conversations" ON public.platform_conversations;
DROP POLICY IF EXISTS "Allow all for lovable_integrations" ON public.lovable_integrations;
DROP POLICY IF EXISTS "Allow all for deploy_integrations" ON public.deploy_integrations;
DROP POLICY IF EXISTS "Allow all for message_masks" ON public.message_masks;
DROP POLICY IF EXISTS "Allow all for api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Allow all for brand_templates" ON public.brand_templates;
DROP POLICY IF EXISTS "Allow all for competitor_analyses_v2" ON public.competitor_analyses_v2;
DROP POLICY IF EXISTS "Allow all for messages" ON public.messages;
DROP POLICY IF EXISTS "BioLinks workspace insert" ON public.bio_links;
DROP POLICY IF EXISTS "BioLinks workspace update" ON public.bio_links;
DROP POLICY IF EXISTS "BioLinks workspace delete" ON public.bio_links;
DROP POLICY IF EXISTS "BioLinks public published read" ON public.bio_links;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workspace_members'
      AND policyname = 'Workspace members visible to self or workspace'
  ) THEN
    CREATE POLICY "Workspace members visible to self or workspace"
      ON public.workspace_members
      FOR SELECT
      USING (
        user_id = auth.uid()
        OR public.workspace_member_can_access(workspace_id)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workspace_members'
      AND policyname = 'Workspace members insert by admins'
  ) THEN
    CREATE POLICY "Workspace members insert by admins"
      ON public.workspace_members
      FOR INSERT
      WITH CHECK (
        public.workspace_member_can_admin(workspace_id)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workspace_members'
      AND policyname = 'Workspace members update by admins'
  ) THEN
    CREATE POLICY "Workspace members update by admins"
      ON public.workspace_members
      FOR UPDATE
      USING (
        public.workspace_member_can_admin(workspace_id)
      )
      WITH CHECK (
        public.workspace_member_can_admin(workspace_id)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workspace_members'
      AND policyname = 'Workspace members delete by admins'
  ) THEN
    CREATE POLICY "Workspace members delete by admins"
      ON public.workspace_members
      FOR DELETE
      USING (
        public.workspace_member_can_admin(workspace_id)
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workspaces'
      AND policyname = 'Workspaces readable by members'
  ) THEN
    CREATE POLICY "Workspaces readable by members"
      ON public.workspaces
      FOR SELECT
      USING (public.workspace_member_can_access(id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workspaces'
      AND policyname = 'Workspaces insert by authenticated users'
  ) THEN
    CREATE POLICY "Workspaces insert by authenticated users"
      ON public.workspaces
      FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workspaces'
      AND policyname = 'Workspaces manageable by admins'
  ) THEN
    CREATE POLICY "Workspaces manageable by admins"
      ON public.workspaces
      FOR UPDATE
      USING (public.workspace_member_can_admin(id))
      WITH CHECK (public.workspace_member_can_admin(id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workspaces'
      AND policyname = 'Workspaces deletable by admins'
  ) THEN
    CREATE POLICY "Workspaces deletable by admins"
      ON public.workspaces
      FOR DELETE
      USING (public.workspace_member_can_admin(id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'briefings'
      AND policyname = 'Briefings readable by members'
  ) THEN
    CREATE POLICY "Briefings readable by members"
      ON public.briefings
      FOR SELECT
      USING (public.workspace_member_can_access(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'briefings'
      AND policyname = 'Briefings writable by editors'
  ) THEN
    CREATE POLICY "Briefings writable by editors"
      ON public.briefings
      FOR ALL
      USING (public.workspace_member_can_write(workspace_id))
      WITH CHECK (public.workspace_member_can_write(workspace_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brand_kits'
      AND policyname = 'Brand kits readable by members'
  ) THEN
    CREATE POLICY "Brand kits readable by members"
      ON public.brand_kits
      FOR SELECT
      USING (public.workspace_member_can_access(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brand_kits'
      AND policyname = 'Brand kits writable by editors'
  ) THEN
    CREATE POLICY "Brand kits writable by editors"
      ON public.brand_kits
      FOR ALL
      USING (public.workspace_member_can_write(workspace_id))
      WITH CHECK (public.workspace_member_can_write(workspace_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'posts_v2'
      AND policyname = 'Posts v2 readable by members'
  ) THEN
    CREATE POLICY "Posts v2 readable by members"
      ON public.posts_v2
      FOR SELECT
      USING (public.workspace_member_can_access(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'posts_v2'
      AND policyname = 'Posts v2 writable by editors'
  ) THEN
    CREATE POLICY "Posts v2 writable by editors"
      ON public.posts_v2
      FOR ALL
      USING (public.workspace_member_can_write(workspace_id))
      WITH CHECK (public.workspace_member_can_write(workspace_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'blog_articles'
      AND policyname = 'Blog articles readable by members'
  ) THEN
    CREATE POLICY "Blog articles readable by members"
      ON public.blog_articles
      FOR SELECT
      USING (public.workspace_member_can_access(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'blog_articles'
      AND policyname = 'Blog articles writable by editors'
  ) THEN
    CREATE POLICY "Blog articles writable by editors"
      ON public.blog_articles
      FOR ALL
      USING (public.workspace_member_can_write(workspace_id))
      WITH CHECK (public.workspace_member_can_write(workspace_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bio_links'
      AND policyname = 'BioLinks members read drafts'
  ) THEN
    CREATE POLICY "BioLinks members read drafts"
      ON public.bio_links
      FOR SELECT
      USING (is_published = true OR public.workspace_member_can_access(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bio_links'
      AND policyname = 'BioLinks writable by editors'
  ) THEN
    CREATE POLICY "BioLinks writable by editors"
      ON public.bio_links
      FOR ALL
      USING (public.workspace_member_can_write(workspace_id))
      WITH CHECK (public.workspace_member_can_write(workspace_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brand_characters'
      AND policyname = 'Brand characters readable by members'
  ) THEN
    CREATE POLICY "Brand characters readable by members"
      ON public.brand_characters
      FOR SELECT
      USING (public.workspace_member_can_access(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brand_characters'
      AND policyname = 'Brand characters writable by editors'
  ) THEN
    CREATE POLICY "Brand characters writable by editors"
      ON public.brand_characters
      FOR ALL
      USING (public.workspace_member_can_write(workspace_id))
      WITH CHECK (public.workspace_member_can_write(workspace_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'image_prompt_templates'
      AND policyname = 'Image prompt templates readable by members'
  ) THEN
    CREATE POLICY "Image prompt templates readable by members"
      ON public.image_prompt_templates
      FOR SELECT
      USING (workspace_id IS NULL OR public.workspace_member_can_access(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'image_prompt_templates'
      AND policyname = 'Image prompt templates writable by editors'
  ) THEN
    CREATE POLICY "Image prompt templates writable by editors"
      ON public.image_prompt_templates
      FOR ALL
      USING (workspace_id IS NULL OR public.workspace_member_can_write(workspace_id))
      WITH CHECK (workspace_id IS NULL OR public.workspace_member_can_write(workspace_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'media_assets'
      AND policyname = 'Media assets readable by members'
  ) THEN
    CREATE POLICY "Media assets readable by members"
      ON public.media_assets
      FOR SELECT
      USING (public.workspace_member_can_access(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'media_assets'
      AND policyname = 'Media assets writable by editors'
  ) THEN
    CREATE POLICY "Media assets writable by editors"
      ON public.media_assets
      FOR ALL
      USING (public.workspace_member_can_write(workspace_id))
      WITH CHECK (public.workspace_member_can_write(workspace_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'viral_analyses'
      AND policyname = 'Viral analyses readable by members'
  ) THEN
    CREATE POLICY "Viral analyses readable by members"
      ON public.viral_analyses
      FOR SELECT
      USING (public.workspace_member_can_access(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'viral_analyses'
      AND policyname = 'Viral analyses writable by editors'
  ) THEN
    CREATE POLICY "Viral analyses writable by editors"
      ON public.viral_analyses
      FOR ALL
      USING (public.workspace_member_can_write(workspace_id))
      WITH CHECK (public.workspace_member_can_write(workspace_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'carousel_storyboards'
      AND policyname = 'Carousel storyboards readable by members'
  ) THEN
    CREATE POLICY "Carousel storyboards readable by members"
      ON public.carousel_storyboards
      FOR SELECT
      USING (public.workspace_member_can_access(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'carousel_storyboards'
      AND policyname = 'Carousel storyboards writable by editors'
  ) THEN
    CREATE POLICY "Carousel storyboards writable by editors"
      ON public.carousel_storyboards
      FOR ALL
      USING (public.workspace_member_can_write(workspace_id))
      WITH CHECK (public.workspace_member_can_write(workspace_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'messages'
      AND policyname = 'Messages readable by members'
  ) THEN
    CREATE POLICY "Messages readable by members"
      ON public.messages
      FOR SELECT
      USING (workspace_id IS NOT NULL AND public.workspace_member_can_access(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'messages'
      AND policyname = 'Messages writable by members'
  ) THEN
    CREATE POLICY "Messages writable by members"
      ON public.messages
      FOR ALL
      USING (workspace_id IS NOT NULL AND public.workspace_member_can_write(workspace_id))
      WITH CHECK (workspace_id IS NOT NULL AND public.workspace_member_can_write(workspace_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'news_items'
      AND policyname = 'News items readable by members'
  ) THEN
    CREATE POLICY "News items readable by members"
      ON public.news_items
      FOR SELECT
      USING (public.workspace_member_can_access(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'news_items'
      AND policyname = 'News items writable by editors'
  ) THEN
    CREATE POLICY "News items writable by editors"
      ON public.news_items
      FOR ALL
      USING (public.workspace_member_can_write(workspace_id))
      WITH CHECK (public.workspace_member_can_write(workspace_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'projects'
      AND policyname = 'Projects readable by members'
  ) THEN
    CREATE POLICY "Projects readable by members"
      ON public.projects
      FOR SELECT
      USING (public.workspace_member_can_access(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'projects'
      AND policyname = 'Projects writable by editors'
  ) THEN
    CREATE POLICY "Projects writable by editors"
      ON public.projects
      FOR ALL
      USING (public.workspace_member_can_write(workspace_id))
      WITH CHECK (public.workspace_member_can_write(workspace_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'landing_pages'
      AND policyname = 'Landing pages readable by members'
  ) THEN
    CREATE POLICY "Landing pages readable by members"
      ON public.landing_pages
      FOR SELECT
      USING (public.workspace_member_can_access(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'landing_pages'
      AND policyname = 'Landing pages writable by editors'
  ) THEN
    CREATE POLICY "Landing pages writable by editors"
      ON public.landing_pages
      FOR ALL
      USING (public.workspace_member_can_write(workspace_id))
      WITH CHECK (public.workspace_member_can_write(workspace_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'platform_conversations'
      AND policyname = 'Platform conversations readable by members'
  ) THEN
    CREATE POLICY "Platform conversations readable by members"
      ON public.platform_conversations
      FOR SELECT
      USING (public.workspace_member_can_access(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'platform_conversations'
      AND policyname = 'Platform conversations writable by members'
  ) THEN
    CREATE POLICY "Platform conversations writable by members"
      ON public.platform_conversations
      FOR ALL
      USING (public.workspace_member_can_write(workspace_id))
      WITH CHECK (public.workspace_member_can_write(workspace_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lovable_integrations'
      AND policyname = 'Lovable integrations readable by admins'
  ) THEN
    CREATE POLICY "Lovable integrations readable by admins"
      ON public.lovable_integrations
      FOR SELECT
      USING (public.workspace_member_can_admin(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lovable_integrations'
      AND policyname = 'Lovable integrations writable by admins'
  ) THEN
    CREATE POLICY "Lovable integrations writable by admins"
      ON public.lovable_integrations
      FOR ALL
      USING (public.workspace_member_can_admin(workspace_id))
      WITH CHECK (public.workspace_member_can_admin(workspace_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'deploy_integrations'
      AND policyname = 'Deploy integrations readable by admins'
  ) THEN
    CREATE POLICY "Deploy integrations readable by admins"
      ON public.deploy_integrations
      FOR SELECT
      USING (public.workspace_member_can_admin(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'deploy_integrations'
      AND policyname = 'Deploy integrations writable by admins'
  ) THEN
    CREATE POLICY "Deploy integrations writable by admins"
      ON public.deploy_integrations
      FOR ALL
      USING (public.workspace_member_can_admin(workspace_id))
      WITH CHECK (public.workspace_member_can_admin(workspace_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'message_masks'
      AND policyname = 'Message masks readable by members'
  ) THEN
    CREATE POLICY "Message masks readable by members"
      ON public.message_masks
      FOR SELECT
      USING (public.workspace_member_can_access(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'message_masks'
      AND policyname = 'Message masks writable by members'
  ) THEN
    CREATE POLICY "Message masks writable by members"
      ON public.message_masks
      FOR ALL
      USING (public.workspace_member_can_write(workspace_id))
      WITH CHECK (public.workspace_member_can_write(workspace_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'websites'
      AND policyname = 'Websites readable by members'
  ) THEN
    CREATE POLICY "Websites readable by members"
      ON public.websites
      FOR SELECT
      USING (public.workspace_member_can_access(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'websites'
      AND policyname = 'Websites writable by editors'
  ) THEN
    CREATE POLICY "Websites writable by editors"
      ON public.websites
      FOR ALL
      USING (public.workspace_member_can_write(workspace_id))
      WITH CHECK (public.workspace_member_can_write(workspace_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'website_pages'
      AND policyname = 'Website pages readable by members'
  ) THEN
    CREATE POLICY "Website pages readable by members"
      ON public.website_pages
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.websites w
          WHERE w.id = website_id
            AND public.workspace_member_can_access(w.workspace_id)
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'website_pages'
      AND policyname = 'Website pages writable by editors'
  ) THEN
    CREATE POLICY "Website pages writable by editors"
      ON public.website_pages
      FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.websites w
          WHERE w.id = website_id
            AND public.workspace_member_can_write(w.workspace_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.websites w
          WHERE w.id = website_id
            AND public.workspace_member_can_write(w.workspace_id)
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'api_keys'
      AND policyname = 'Api keys readable by admins'
  ) THEN
    CREATE POLICY "Api keys readable by admins"
      ON public.api_keys
      FOR SELECT
      USING (public.workspace_member_can_admin(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'api_keys'
      AND policyname = 'Api keys writable by admins'
  ) THEN
    CREATE POLICY "Api keys writable by admins"
      ON public.api_keys
      FOR ALL
      USING (public.workspace_member_can_admin(workspace_id))
      WITH CHECK (public.workspace_member_can_admin(workspace_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'rss_feeds'
      AND policyname = 'Rss feeds readable by members'
  ) THEN
    CREATE POLICY "Rss feeds readable by members"
      ON public.rss_feeds
      FOR SELECT
      USING (public.workspace_member_can_access(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'rss_feeds'
      AND policyname = 'Rss feeds writable by editors'
  ) THEN
    CREATE POLICY "Rss feeds writable by editors"
      ON public.rss_feeds
      FOR ALL
      USING (public.workspace_member_can_write(workspace_id))
      WITH CHECK (public.workspace_member_can_write(workspace_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brand_templates'
      AND policyname = 'Brand templates readable by members'
  ) THEN
    CREATE POLICY "Brand templates readable by members"
      ON public.brand_templates
      FOR SELECT
      USING (public.workspace_member_can_access(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brand_templates'
      AND policyname = 'Brand templates writable by editors'
  ) THEN
    CREATE POLICY "Brand templates writable by editors"
      ON public.brand_templates
      FOR ALL
      USING (public.workspace_member_can_write(workspace_id))
      WITH CHECK (public.workspace_member_can_write(workspace_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'competitor_analyses_v2'
      AND policyname = 'Competitor analyses readable by members'
  ) THEN
    CREATE POLICY "Competitor analyses readable by members"
      ON public.competitor_analyses_v2
      FOR SELECT
      USING (public.workspace_member_can_access(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'competitor_analyses_v2'
      AND policyname = 'Competitor analyses writable by editors'
  ) THEN
    CREATE POLICY "Competitor analyses writable by editors"
      ON public.competitor_analyses_v2
      FOR ALL
      USING (public.workspace_member_can_write(workspace_id))
      WITH CHECK (public.workspace_member_can_write(workspace_id));
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_v2') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_workspaces_updated_at') THEN
      CREATE TRIGGER update_workspaces_updated_at
        BEFORE UPDATE ON public.workspaces
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_v2();
    END IF;
  END IF;
END $$;
