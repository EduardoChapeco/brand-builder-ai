-- =============================================================
-- MIGRATION: 003_foundation.sql (SDD V2 CANONICAL SCHEMA - PT3)
-- =============================================================

-- =============================================================
-- TABELA: biolinks
-- =============================================================
CREATE TABLE IF NOT EXISTS biolinks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  slug                TEXT UNIQUE NOT NULL,   
  title               TEXT NOT NULL,
  avatar_url          TEXT,
  avatar_border_color TEXT,
  display_name        TEXT NOT NULL,
  username_handle     TEXT,
  bio_text            TEXT,                   
  bg_type             TEXT NOT NULL DEFAULT 'color'
                      CHECK (bg_type IN ('color','gradient','image','video','gif')),
  bg_value            TEXT,                   
  bg_overlay_opacity  NUMERIC(3,2) DEFAULT 0,
  cta_enabled         BOOLEAN NOT NULL DEFAULT FALSE,
  cta_text            TEXT,
  cta_url             TEXT,
  cta_style           TEXT DEFAULT 'filled'
                      CHECK (cta_style IN ('filled','outline','ghost','pill')),
  social_links        JSONB NOT NULL DEFAULT '[]',    
  theme_override      JSONB NOT NULL DEFAULT '{}',   
  meta_pixel_id       TEXT,
  gtm_id              TEXT,
  custom_head_code    TEXT,   
  is_published        BOOLEAN NOT NULL DEFAULT FALSE,
  custom_domain       TEXT,
  seo_title           TEXT,
  seo_description     TEXT,
  og_image_url        TEXT,
  simlab_last_run_id  UUID,
  simlab_score        INTEGER,
  view_count          INTEGER NOT NULL DEFAULT 0,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TABELA: biolink_blocks
-- =============================================================
CREATE TABLE IF NOT EXISTS biolink_blocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  biolink_id      UUID NOT NULL REFERENCES biolinks(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  block_type      TEXT NOT NULL
                  CHECK (block_type IN (
                    'link','divider','text','image','video_embed','youtube','spotify',
                    'instagram_post','twitter_post','tiktok_embed',
                    'newsletter_form','contact_form','whatsapp_button',
                    'google_maps','countdown','store_grid','booking_button',
                    'post_carousel','blog_feed','news_feed',
                    'social_stats','testimonial','faq','pricing_card'
                  )),
  grid_col        INTEGER NOT NULL DEFAULT 1 CHECK (grid_col BETWEEN 1 AND 2),
  grid_row_span   INTEGER NOT NULL DEFAULT 1 CHECK (grid_row_span BETWEEN 1 AND 3),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_visible      BOOLEAN NOT NULL DEFAULT TRUE,
  visible_from    TIMESTAMPTZ,
  visible_until   TIMESTAMPTZ,
  content         JSONB NOT NULL DEFAULT '{}',
  style_override  JSONB NOT NULL DEFAULT '{}',    
  click_count     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TABELA: biolink_leads
-- =============================================================
CREATE TABLE IF NOT EXISTS biolink_leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  biolink_id      UUID NOT NULL REFERENCES biolinks(id) ON DELETE CASCADE,
  block_id        UUID REFERENCES biolink_blocks(id),
  email           TEXT,
  name            TEXT,
  phone           TEXT,
  custom_fields   JSONB NOT NULL DEFAULT '{}',
  source_url      TEXT,
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  ip_address      INET,
  user_agent      TEXT,
  referrer        TEXT,
  status          TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','contacted','qualified','converted','unsubscribed')),
  tags            TEXT[] NOT NULL DEFAULT '{}',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TABELA: squads
-- =============================================================
CREATE TABLE IF NOT EXISTS squads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  purpose         TEXT NOT NULL,
  objective_type  TEXT NOT NULL
                  CHECK (objective_type IN ('postgen','research','validation','website',
                                            'video','sales','custom')),
  autonomy_level  TEXT NOT NULL DEFAULT 'supervised'
                  CHECK (autonomy_level IN ('supervised','semi_autonomous','autonomous')),
  max_iterations  INTEGER NOT NULL DEFAULT 5,
  status          TEXT NOT NULL DEFAULT 'idle'
                  CHECK (status IN ('idle','running','paused','completed','error')),
  last_run_at     TIMESTAMPTZ,
  run_count       INTEGER NOT NULL DEFAULT 0,
  output_format   TEXT,
  last_output     JSONB,
  is_template     BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TABELA: news_sources
-- =============================================================
CREATE TABLE IF NOT EXISTS news_sources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  url             TEXT NOT NULL,
  feed_url        TEXT,      
  feed_type       TEXT NOT NULL DEFAULT 'rss'
                  CHECK (feed_type IN ('rss','atom','json_feed','scrape')),
  category        TEXT,
  language        TEXT NOT NULL DEFAULT 'pt-BR',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at  TIMESTAMPTZ,
  sync_interval_minutes INTEGER NOT NULL DEFAULT 60,
  sync_error      TEXT,
  keyword_filters TEXT[] NOT NULL DEFAULT '{}',
  min_relevance_score INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, url)
);

-- =============================================================
-- TABELA: news_articles
-- =============================================================
CREATE TABLE IF NOT EXISTS news_articles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_id       UUID NOT NULL REFERENCES news_sources(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  url             TEXT NOT NULL,
  excerpt         TEXT,
  full_content    TEXT,
  author          TEXT,
  published_at    TIMESTAMPTZ,
  image_url       TEXT,
  relevance_score INTEGER,
  sentiment       TEXT CHECK (sentiment IN ('positive','neutral','negative')),
  key_topics      TEXT[] NOT NULL DEFAULT '{}',
  summary_ai      TEXT,
  status          TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','read','generating_post','post_created','ignored')),
  generated_post_id UUID REFERENCES post_sessions_v2(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, url)
);
