/**
 * db-custom.ts — Typed wrappers for tables not yet in the auto-generated types.ts
 *
 * The auto-generated types.ts only reflects tables known at Lovable's last sync.
 * All newer tables (Video Studio, SimLab, Sites, Blog, Squads, etc.) live here
 * with full TypeScript types so we avoid scattered `as any` casts.
 *
 * Usage:
 *   import { db } from '@/integrations/supabase/db-custom';
 *   const { data } = await db.blogArticles().select('*').eq('workspace_id', id);
 *
 * Also exports legacy `fromTable` for backward compat.
 */
import { supabase } from './client';


// ─── Generic escape hatch (legacy) ───────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fromTable = (table: string) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase as any).from(table) as ReturnType<typeof supabase.from>;

// ─── Row types for non-generated tables ──────────────────────────────────────

export type WorkspaceMemberRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  status: string;
  invited_by: string | null;
  invited_at: string | null;
  created_at: string;
  updated_at: string | null;
};

export type BlogArticleRow = {
  id: string;
  workspace_id: string;
  title: string;
  slug: string | null;
  meta_description: string | null;
  keywords: string[] | null;
  content_markdown: string | null;
  content_html: string | null;
  layout_template: string | null;
  hero_image_url: string | null;
  status: string;
  source_type: string | null;
  source_url: string | null;
  news_item_id: string | null;
  agent_prd_id: string | null;
  latest_simlab_run_id: string | null;
  simlab_status: string | null;
  simlab_validated_at: string | null;
  instagram_post_id: string | null;
  created_at: string;
  updated_at: string;
};

export type NewsItemRow = {
  id: string;
  workspace_id: string;
  rss_source_id: string | null;
  title: string;
  description: string | null;
  source_url: string;
  content_markdown: string | null;
  categories: string[] | null;
  relevance_score: number;
  relevance_reason: string | null;
  status: string;
  published_at: string | null;
  blog_article_id: string | null;
  content_piece_ids: string[] | null;
  content_extracted: boolean;
  latest_simlab_run_id: string | null;
  simlab_status: string | null;
  fetched_at: string;
};

export type WebsiteRow = {
  id: string;
  workspace_id: string;
  name: string;
  slug: string | null;
  status: string;
  domain: string | null;
  theme_config: Record<string, unknown>;
  seo_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type WebsitePageRow = {
  id: string;
  workspace_id: string;
  website_id: string;
  title: string;
  slug: string;
  content_json: Record<string, unknown>;
  content_html: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type ScrollSectionRow = {
  id: string;
  workspace_id: string;
  website_id: string | null;
  page_id: string | null;
  title: string | null;
  section_type: string;
  content_json: Record<string, unknown>;
  position: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
};

export type VideoProjectRow = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: string;
  format: string;
  duration_ms: number | null;
  thumbnail_url: string | null;
  output_url: string | null;
  composition_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type VideoAssetRow = {
  id: string;
  workspace_id: string;
  video_project_id: string | null;
  asset_type: string;
  name: string;
  storage_path: string | null;
  public_url: string | null;
  duration_ms: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type VideoJobRow = {
  id: string;
  workspace_id: string;
  video_project_id: string | null;
  job_type: string;
  status: string;
  input_payload: Record<string, unknown>;
  output_payload: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};

export type VideoSubtitleTrackRow = {
  id: string;
  workspace_id: string;
  video_project_id: string;
  language: string;
  format: string;
  storage_path: string | null;
  public_url: string | null;
  created_at: string;
};

export type VideoExportRow = {
  id: string;
  workspace_id: string;
  video_project_id: string;
  format: string;
  resolution: string;
  status: string;
  output_url: string | null;
  file_size_bytes: number | null;
  created_at: string;
};

export type VideoTimelineVersionRow = {
  id: string;
  workspace_id: string;
  video_project_id: string;
  version_number: number;
  timeline_json: Record<string, unknown>;
  created_at: string;
};

export type VideoTemplateRow = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  thumbnail_url: string | null;
  composition_key: string;
  default_config: Record<string, unknown>;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
};

export type AiGeneratedVideoRow = {
  id: string;
  workspace_id: string;
  prompt: string | null;
  status: string;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_ms: number | null;
  provider: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type LayerCompositionRow = {
  id: string;
  workspace_id: string;
  video_project_id: string | null;
  name: string;
  layers_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ProjectRow = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: string;
  entry_file: string;
  source_files_json: Record<string, unknown>;
  preview_meta: Record<string, unknown>;
  deploy_meta: Record<string, unknown>;
  lovable_project_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PlatformConversationRow = {
  id: string;
  workspace_id: string;
  project_id: string | null;
  mode: string;
  user_message: string;
  assistant_response: string | null;
  diff_summary: string | null;
  created_at: string;
};

export type LandingPageRow = {
  id: string;
  workspace_id: string;
  name: string;
  source_type: string;
  source_url: string | null;
  status: string;
  screenshots_json: unknown[];
  dom_content: string | null;
  sections_analysis: Record<string, unknown>;
  sections_json: unknown[];
  full_html: string | null;
  full_css: string | null;
  project_id: string | null;
  agent_prd_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SquadMemberRow = {
  id: string;
  workspace_id: string;
  squad_id: string | null;
  agent_id: string;
  agent_type: string;
  role: string;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
};

export type SquadRunRow = {
  id: string;
  workspace_id: string;
  squad_id: string | null;
  status: string;
  input_payload: Record<string, unknown>;
  output_payload: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};

export type SimlabRunRow = {
  id: string;
  workspace_id: string;
  module: string | null;
  content_snapshot: Record<string, unknown> | null;
  status: string;
  input_payload: Record<string, unknown>;
  output_payload: Record<string, unknown> | null;
  verdict: string | null;
  feedback: string[] | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};

export type CcpPromptTemplateRow = {
  id: string;
  workspace_id: string | null;
  module: string;
  template_key: string;
  version: number;
  prompt_text: string;
  variables: string[] | null;
  description: string | null;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
};

export type AgentPrdRow = {
  id: string;
  workspace_id: string;
  module_type: string;
  mode: string;
  status: string;
  original_prompt: string;
  brand_context_hash: string | null;
  identification: Record<string, unknown>;
  fragments: Record<string, unknown>;
  specialist_results: Record<string, unknown>;
  assembled_prd: string | null;
  qa_score: number | null;
  final_prompt: string | null;
  created_at: string;
};

export type RssSourceRow = {
  id: string;
  name: string;
  url: string;
  category: string | null;
  locale: string;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
};

export type ApiKeyRow = {
  id: string;
  workspace_id: string;
  provider: string;
  alias: string | null;
  key_value: string;
  key_preview: string | null;
  is_active: boolean;
  calls_today: number | null;
  daily_limit: number | null;
  last_used_at: string | null;
  last_error: string | null;
  deleted_at: string | null;
  created_at: string;
};

// ─── Typed db accessor ───────────────────────────────────────────────────────
// Returns a properly typed query builder for each custom table.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = (table: string) => (supabase as any).from(table) as ReturnType<typeof supabase.from>;

export const db = {
  workspaceMembers: () => t('sw_workspace_members'),
  blogArticles: () => t('sw_blog_articles'),
  newsItems: () => t('sw_news_items'),
  rssSources: () => t('sw_rss_sources'),
  websites: () => t('sw_sites'),
  websitePages: () => t('sw_site_pages'),
  siteSections: () => t('sw_site_sections'),
  siteVersions: () => t('sw_site_versions'),
  bioLinks: () => t('sw_biolinks'),
  bioLinkBlocks: () => t('sw_biolink_blocks'),
  crmContacts: () => t('sw_contacts'),
  systemLogs: () => t('sw_system_logs'),
  videoProjects: () => t('video_projects'),
  videoAssets: () => t('video_assets'),
  videoJobs: () => t('video_jobs'),
  videoSubtitleTracks: () => t('video_subtitle_tracks'),
  videoExports: () => t('video_exports'),
  videoTimelineVersions: () => t('video_timeline_versions'),
  videoTemplates: () => t('video_templates'),
  aiGeneratedVideos: () => t('ai_generated_videos'),
  layerCompositions: () => t('layer_compositions'),
  projects: () => t('projects'),
  platformConversations: () => t('platform_conversations'),
  landingPages: () => t('landing_pages'),
  squadMembers: () => t('squad_members'),
  squadRuns: () => t('squad_runs'),
  simlabRuns: () => t('simlab_runs'),
  ccpPromptTemplates: () => t('ccp_prompt_templates'),
  agentPrds: () => t('agent_prds'),
  apiKeys: () => t('api_keys'),
};
