-- =============================================================
-- Simwork hard cut - creators
-- =============================================================

CREATE TABLE IF NOT EXISTS sw_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES sw_workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  size BIGINT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sw_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES sw_workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','publicado','arquivado')),
  domain TEXT,
  settings JSONB NOT NULL DEFAULT '{}',
  seo JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, slug)
);

CREATE TABLE IF NOT EXISTS sw_site_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sw_sites(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES sw_workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','publicado','arquivado')),
  seo JSONB NOT NULL DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0,
  template_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(site_id, slug)
);

CREATE TABLE IF NOT EXISTS sw_site_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES sw_site_pages(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES sw_workspaces(id) ON DELETE CASCADE,
  component_key TEXT NOT NULL,
  props JSONB NOT NULL DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  breakpoint_config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sw_site_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sw_sites(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES sw_workspaces(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sw_biolinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES sw_workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','publicado','arquivado')),
  theme JSONB NOT NULL DEFAULT '{}',
  settings JSONB NOT NULL DEFAULT '{}',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, slug)
);

CREATE TABLE IF NOT EXISTS sw_biolink_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  biolink_id UUID NOT NULL REFERENCES sw_biolinks(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES sw_workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  schedule_start TIMESTAMPTZ,
  schedule_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sw_biolink_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  biolink_id UUID NOT NULL REFERENCES sw_biolinks(id) ON DELETE CASCADE,
  block_id UUID REFERENCES sw_biolink_blocks(id) ON DELETE SET NULL,
  workspace_id UUID NOT NULL REFERENCES sw_workspaces(id) ON DELETE CASCADE,
  referrer TEXT,
  country TEXT,
  device TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sw_editorial_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES sw_workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('blog','news')),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','revisao','publicado','arquivado')),
  body JSONB NOT NULL DEFAULT '{}',
  seo JSONB NOT NULL DEFAULT '{}',
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  source_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sw_editorial_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES sw_workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  feed_url TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_fetched TIMESTAMPTZ,
  error_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sw_editorial_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES sw_workspaces(id) ON DELETE CASCADE,
  source_id UUID REFERENCES sw_editorial_sources(id) ON DELETE SET NULL,
  raw_content JSONB NOT NULL DEFAULT '{}',
  score NUMERIC(6,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sw_social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES sw_workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('post','carousel','story')),
  content JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','revisao','agendado','publicado','arquivado')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  platforms JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sw_video_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES sw_workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','processando','renderizando','publicado','erro')),
  mode TEXT NOT NULL DEFAULT 'chat' CHECK (mode IN ('chat','timeline','motion','template')),
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sw_video_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES sw_video_projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('video','audio','subtitle','overlay')),
  order_index INTEGER NOT NULL DEFAULT 0,
  clips JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sw_video_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES sw_workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  duration NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sw_video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES sw_video_projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','rendering','done','failed')),
  provider TEXT,
  output_url TEXT,
  error TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sw_video_voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES sw_workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  name TEXT NOT NULL,
  preview_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sw_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES sw_workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('brand','creator','persona','consumer','operational')),
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','ativo','inativo')),
  identity JSONB NOT NULL DEFAULT '{}',
  voice JSONB NOT NULL DEFAULT '{}',
  memory JSONB NOT NULL DEFAULT '{}',
  behavior JSONB NOT NULL DEFAULT '{}',
  tools JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sw_agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES sw_agents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sw_agent_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  schema JSONB NOT NULL DEFAULT '{}',
  endpoint TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sw_simlab_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES sw_workspaces(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES sw_agents(id) ON DELETE SET NULL,
  persona JSONB NOT NULL DEFAULT '{}',
  behaviors JSONB NOT NULL DEFAULT '{}',
  insights JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sw_sites_workspace ON sw_sites(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sw_site_pages_site ON sw_site_pages(site_id, order_index);
CREATE INDEX IF NOT EXISTS idx_sw_site_sections_page ON sw_site_sections(page_id, order_index);
CREATE INDEX IF NOT EXISTS idx_sw_biolinks_workspace ON sw_biolinks(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sw_biolink_blocks_link ON sw_biolink_blocks(biolink_id, order_index);
CREATE INDEX IF NOT EXISTS idx_sw_editorial_posts_workspace ON sw_editorial_posts(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sw_social_posts_workspace ON sw_social_posts(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sw_video_projects_workspace ON sw_video_projects(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sw_agents_workspace ON sw_agents(workspace_id, updated_at DESC);

DO $$
BEGIN
  IF to_regclass('public.websites') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO sw_sites (id, workspace_id, name, slug, status, domain, settings, seo, created_at, updated_at)
      SELECT
        w.id,
        w.workspace_id,
        w.name,
        w.slug,
        CASE w.status
          WHEN 'published' THEN 'publicado'
          WHEN 'archived' THEN 'arquivado'
          ELSE 'rascunho'
        END,
        COALESCE(w.custom_domain, w.subdomain),
        COALESCE(w.theme_override, '{}'::jsonb),
        jsonb_build_object(
          'title', w.seo_title,
          'description', w.seo_description,
          'image', w.og_image_url,
          'ga_id', w.ga_id,
          'gtm_id', w.gtm_id,
          'meta_pixel_id', w.meta_pixel_id
        ),
        COALESCE(w.created_at, NOW()),
        COALESCE(w.updated_at, NOW())
      FROM websites w
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        status = EXCLUDED.status,
        domain = EXCLUDED.domain,
        settings = EXCLUDED.settings,
        seo = EXCLUDED.seo,
        updated_at = EXCLUDED.updated_at
    $sql$;
  END IF;

  IF to_regclass('public.website_pages') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO sw_site_pages (id, site_id, workspace_id, title, slug, status, seo, order_index, template_key, created_at, updated_at)
      SELECT
        p.id,
        p.website_id,
        p.workspace_id,
        p.title,
        p.slug,
        CASE WHEN p.is_published THEN 'publicado' ELSE 'rascunho' END,
        jsonb_build_object(
          'title', p.seo_title,
          'description', p.seo_description,
          'image', p.og_image_url
        ),
        p.sort_order,
        NULL,
        COALESCE(p.created_at, NOW()),
        COALESCE(p.updated_at, NOW())
      FROM website_pages p
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        slug = EXCLUDED.slug,
        status = EXCLUDED.status,
        seo = EXCLUDED.seo,
        order_index = EXCLUDED.order_index,
        updated_at = EXCLUDED.updated_at
    $sql$;
  END IF;

  IF to_regclass('public.website_sections') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO sw_site_sections (id, page_id, workspace_id, component_key, props, order_index, visible, breakpoint_config, created_at, updated_at)
      SELECT
        s.id,
        s.page_id,
        s.workspace_id,
        s.section_type,
        jsonb_build_object(
          'content', COALESCE(s.content, '{}'::jsonb),
          'bg_type', s.bg_type,
          'bg_value', s.bg_value,
          'padding_top', s.padding_top,
          'padding_bottom', s.padding_bottom,
          'style_override', COALESCE(s.style_override, '{}'::jsonb),
          'scroll_animation', s.scroll_animation,
          'version', s.version,
          'snapshot_history', COALESCE(s.snapshot_history, '[]'::jsonb)
        ),
        s.sort_order,
        COALESCE(s.is_visible, TRUE),
        '{}'::jsonb,
        COALESCE(s.created_at, NOW()),
        COALESCE(s.updated_at, NOW())
      FROM website_sections s
      ON CONFLICT (id) DO UPDATE SET
        component_key = EXCLUDED.component_key,
        props = EXCLUDED.props,
        order_index = EXCLUDED.order_index,
        visible = EXCLUDED.visible,
        updated_at = EXCLUDED.updated_at
    $sql$;
  END IF;

  IF to_regclass('public.bio_links') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO sw_biolinks (id, workspace_id, title, slug, status, theme, settings, published_at, created_at, updated_at)
      SELECT
        b.id,
        b.workspace_id,
        COALESCE(NULLIF(b.display_name, ''), COALESCE(NULLIF(b.title, ''), 'Bio Link')),
        b.slug,
        CASE
          WHEN b.is_published THEN 'publicado'
          WHEN b.status = 'archived' THEN 'arquivado'
          ELSE 'rascunho'
        END,
        COALESCE(b.theme_tokens, '{}'::jsonb),
        jsonb_build_object(
          'bio_text', b.bio_text,
          'username', b.username,
          'seo_title', b.seo_title,
          'seo_description', b.seo_description,
          'seo_image_url', b.seo_image_url,
          'header_config', COALESCE(b.header_config, '{}'::jsonb),
          'background_config', COALESCE(b.background_config, '{}'::jsonb)
        ),
        b.published_at,
        COALESCE(b.created_at, NOW()),
        COALESCE(b.updated_at, NOW())
      FROM bio_links b
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        slug = EXCLUDED.slug,
        status = EXCLUDED.status,
        theme = EXCLUDED.theme,
        settings = EXCLUDED.settings,
        published_at = EXCLUDED.published_at,
        updated_at = EXCLUDED.updated_at
    $sql$;
  END IF;

  IF to_regclass('public.bio_link_blocks') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO sw_biolink_blocks (id, biolink_id, workspace_id, type, content, order_index, visible, created_at, updated_at)
      SELECT
        b.id,
        b.bio_link_id,
        b.workspace_id,
        b.block_type,
        jsonb_build_object(
          'config', COALESCE(b.config, '{}'::jsonb),
          'size', b.size,
          'layout_slot', b.layout_slot,
          'visibility_rules', COALESCE(b.visibility_rules, '{}'::jsonb),
          'draft_only', COALESCE(b.draft_only, FALSE)
        ),
        b.position,
        COALESCE(b.is_visible, TRUE),
        COALESCE(b.created_at, NOW()),
        COALESCE(b.updated_at, NOW())
      FROM bio_link_blocks b
      ON CONFLICT (id) DO UPDATE SET
        type = EXCLUDED.type,
        content = EXCLUDED.content,
        order_index = EXCLUDED.order_index,
        visible = EXCLUDED.visible,
        updated_at = EXCLUDED.updated_at
    $sql$;
  END IF;

  IF to_regclass('public.rss_feeds') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO sw_editorial_sources (id, workspace_id, name, feed_url, active, created_at, updated_at)
      SELECT
        r.id,
        r.workspace_id,
        COALESCE(NULLIF(r.name, ''), r.url),
        r.url,
        COALESCE(r.is_active, TRUE),
        COALESCE(r.created_at, NOW()),
        COALESCE(r.created_at, NOW())
      FROM rss_feeds r
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        feed_url = EXCLUDED.feed_url,
        active = EXCLUDED.active,
        updated_at = EXCLUDED.updated_at
    $sql$;
  END IF;

  IF to_regclass('public.posts_v2') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO sw_social_posts (id, workspace_id, type, content, status, published_at, created_at, updated_at)
      SELECT
        p.id,
        p.workspace_id,
        CASE
          WHEN COALESCE(p.format, 'post') = 'carousel' THEN 'carousel'
          WHEN COALESCE(p.format, 'post') = 'story' THEN 'story'
          ELSE 'post'
        END,
        jsonb_build_object(
          'title', p.title,
          'caption', p.caption,
          'hashtags', p.hashtags,
          'slides_html', COALESCE(p.slides_html, '[]'::jsonb),
          'image_urls', COALESCE(p.image_urls, '[]'::jsonb),
          'source_topic', p.source_topic,
          'visual_mode', p.visual_mode
        ),
        CASE
          WHEN p.status = 'published' THEN 'publicado'
          WHEN p.status = 'scheduled' THEN 'agendado'
          ELSE 'rascunho'
        END,
        NULL,
        COALESCE(p.created_at, NOW()),
        COALESCE(p.created_at, NOW())
      FROM posts_v2 p
      ON CONFLICT (id) DO UPDATE SET
        type = EXCLUDED.type,
        content = EXCLUDED.content,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    $sql$;
  END IF;
END $$;
