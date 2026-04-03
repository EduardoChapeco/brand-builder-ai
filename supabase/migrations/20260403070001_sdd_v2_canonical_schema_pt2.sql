-- =============================================================
-- MIGRATION: 002_foundation.sql (SDD V2 CANONICAL SCHEMA - PT2)
-- =============================================================

-- =============================================================
-- TABELA: websites (Website Builder)
-- =============================================================
CREATE TABLE IF NOT EXISTS websites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'landing'
                  CHECK (type IN ('landing','institutional','blog','portfolio','sales')),
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','published','archived')),
  subdomain       TEXT UNIQUE,    
  custom_domain   TEXT UNIQUE,
  seo_title       TEXT,
  seo_description TEXT,
  og_image_url    TEXT,
  ga_id           TEXT,
  gtm_id          TEXT,
  meta_pixel_id   TEXT,
  custom_head     TEXT,
  custom_body_end TEXT,
  theme_id        UUID,
  theme_override  JSONB NOT NULL DEFAULT '{}',
  deleted_at      TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, slug)
);

-- =============================================================
-- TABELA: website_pages
-- =============================================================
CREATE TABLE IF NOT EXISTS website_pages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id      UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL,    
  is_home         BOOLEAN NOT NULL DEFAULT FALSE,
  is_published    BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  seo_title       TEXT,
  seo_description TEXT,
  og_image_url    TEXT,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(website_id, slug)
);

-- =============================================================
-- TABELA: website_sections (Seções de cada página)
-- =============================================================
CREATE TABLE IF NOT EXISTS website_sections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id         UUID NOT NULL REFERENCES website_pages(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  section_type    TEXT NOT NULL
                  CHECK (section_type IN (
                    'hero','features','benefits','pricing','faq','testimonials',
                    'cta','contact_form','gallery','video_embed','stats',
                    'team','blog_feed','newsletter','social_proof',
                    'comparison_table','timeline','custom_html'
                  )),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_visible      BOOLEAN NOT NULL DEFAULT TRUE,
  content         JSONB NOT NULL DEFAULT '{}',
  bg_type         TEXT NOT NULL DEFAULT 'color'
                  CHECK (bg_type IN ('color','gradient','image','pattern')),
  bg_value        TEXT,
  padding_top     TEXT NOT NULL DEFAULT 'lg',
  padding_bottom  TEXT NOT NULL DEFAULT 'lg',
  style_override  JSONB NOT NULL DEFAULT '{}',
  scroll_animation TEXT
                  CHECK (scroll_animation IN ('none','fade_up','fade_in','slide_left','slide_right','zoom_in')),
  version         INTEGER NOT NULL DEFAULT 1,
  snapshot_history JSONB NOT NULL DEFAULT '[]',  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TABELA: video_projects
-- =============================================================
CREATE TABLE IF NOT EXISTS video_projects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  aspect_ratio        TEXT NOT NULL DEFAULT '16:9'
                      CHECK (aspect_ratio IN ('16:9','9:16','1:1','4:5')),
  duration_seconds    NUMERIC(8,2),
  fps                 INTEGER NOT NULL DEFAULT 30,
  resolution          TEXT NOT NULL DEFAULT '1080p'
                      CHECK (resolution IN ('720p','1080p','1440p','4k')),
  tracks              JSONB NOT NULL DEFAULT '[]',    
  timeline_state      JSONB NOT NULL DEFAULT '{}',    
  subtitles           JSONB NOT NULL DEFAULT '[]',    
  transcript          TEXT,
  transcript_provider TEXT CHECK (transcript_provider IN ('elevenlabs','whisper','deepgram')),
  transcript_words    JSONB NOT NULL DEFAULT '[]',    
  silence_cuts        JSONB NOT NULL DEFAULT '[]',    
  viral_moments       JSONB NOT NULL DEFAULT '[]',    
  export_url          TEXT,
  export_status       TEXT DEFAULT 'idle'
                      CHECK (export_status IN ('idle','queued','rendering','done','failed')),
  export_format       TEXT CHECK (export_format IN ('mp4','webm','gif')),
  remotion_composition_id TEXT,
  remotion_props      JSONB,
  created_by          UUID REFERENCES auth.users(id),
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_video_workspace ON video_projects(workspace_id) WHERE deleted_at IS NULL;

-- =============================================================
-- TABELA: simlab_sessions
-- =============================================================
CREATE TABLE IF NOT EXISTS simlab_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  target_type         TEXT NOT NULL
                      CHECK (target_type IN ('post','biolink','website','video','email')),
  target_id           UUID NOT NULL,
  target_snapshot     JSONB NOT NULL,   
  overall_score       INTEGER CHECK (overall_score BETWEEN 0 AND 100),
  status              TEXT NOT NULL DEFAULT 'running'
                      CHECK (status IN ('running','passed','needs_revision','failed','override')),
  override_reason     TEXT,
  override_by         UUID REFERENCES auth.users(id),
  personas_used       JSONB NOT NULL DEFAULT '[]',
  persona_reports     JSONB NOT NULL DEFAULT '[]',   
  recommendations     JSONB NOT NULL DEFAULT '[]',   
  model_used          TEXT,
  tokens_used         INTEGER,
  duration_ms         INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_simlab_workspace ON simlab_sessions(workspace_id);

-- =============================================================
-- TABELA: simlab_personas
-- =============================================================
CREATE TABLE IF NOT EXISTS simlab_personas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID REFERENCES workspaces(id) ON DELETE CASCADE,  
  name                TEXT NOT NULL,
  codename            TEXT NOT NULL,    
  age                 INTEGER,
  age_range           TEXT,             
  gender              TEXT,
  location            TEXT,
  income_bracket      TEXT,
  education_level     TEXT,
  occupation          TEXT,
  personality_traits  JSONB NOT NULL DEFAULT '[]',   
  buying_motivations  JSONB NOT NULL DEFAULT '[]',   
  pain_points         JSONB NOT NULL DEFAULT '[]',
  values              JSONB NOT NULL DEFAULT '[]',
  social_media_usage  JSONB NOT NULL DEFAULT '{}',   
  content_preferences JSONB NOT NULL DEFAULT '[]',
  purchase_triggers   JSONB NOT NULL DEFAULT '[]',   
  purchase_blockers   JSONB NOT NULL DEFAULT '[]',   
  cognitive_biases    JSONB NOT NULL DEFAULT '[]',   
  emotional_state     TEXT,
  decision_style      TEXT CHECK (decision_style IN ('impulsive','analytical','social','cautious')),
  system_prompt       TEXT NOT NULL,
  is_system           BOOLEAN NOT NULL DEFAULT FALSE,
  usage_count         INTEGER NOT NULL DEFAULT 0,
  avg_validation_score NUMERIC(5,2),
  description         TEXT,
  avatar_url          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
