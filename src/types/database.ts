/**
 * SW-012: Tipos TypeScript Canônicos — Simwork Platform
 * Gerado via auditoria real do banco de dados pjwupmxbsricseslxmbr
 * Última atualização: 2026-04-04
 */

// ─── PRIMITIVOS ───────────────────────────────────────────────

export type UUID = string;
export type Timestamp = string; // ISO 8601

// ─── WORKSPACE ────────────────────────────────────────────────

export interface SwWorkspace {
  id: UUID;
  owner_id: UUID;
  name: string;
  slug: string;
  plan_id: UUID | null;
  avatar_url: string | null;
  sector: string | null;
  website: string | null;
  settings: {
    language: string;
    timezone: string;
    [key: string]: unknown;
  };
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface SwWorkspaceMember {
  id: UUID;
  workspace_id: UUID;
  user_id: UUID;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  invited_by: UUID | null;
  invited_at: Timestamp;
  accepted_at: Timestamp | null;
}

// ─── PLANOS & ASSINATURAS ─────────────────────────────────────

export interface SwPlan {
  id: UUID;
  name: string;
  slug: string;
  limits: {
    workspaces: number;
    biolinks: number;
    sites: number;
    agents: number;
    members: number;
    blog_posts: number;
    video_minutes: number;
    storage_gb: number;
    ai_tokens: number;
  };
  price_monthly: number;
  price_yearly: number;
  active: boolean;
  created_at: Timestamp;
}

export interface SwSubscription {
  id: UUID;
  workspace_id: UUID;
  plan_id: UUID;
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  gateway: string | null;
  gateway_subscription_id: string | null;
  current_period_start: Timestamp | null;
  current_period_end: Timestamp | null;
  canceled_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ─── BIO LINK ─────────────────────────────────────────────────

export type BiolinkStatus = 'draft' | 'published' | 'archived';
export type BiolinkBlockType =
  | 'link' | 'link_thumbnail' | 'highlight' | 'video' | 'gallery'
  | 'form' | 'newsletter' | 'whatsapp' | 'product' | 'event'
  | 'social_feed' | 'article' | 'recent_video' | 'separator'
  | 'text' | 'cta' | 'embed';

export interface BiolinkTheme {
  background: string;
  accent: string;
  font: string;
  style: 'glass' | 'flat' | 'minimal' | 'bold' | 'neon';
}

export interface SwBiolink {
  id: UUID;
  workspace_id: UUID;
  title: string;
  slug: string;
  status: BiolinkStatus;
  theme: BiolinkTheme;
  settings: {
    show_branding: boolean;
    custom_domain: string | null;
  };
  published_at: Timestamp | null;
  created_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface SwBiolinkBlock {
  id: UUID;
  biolink_id: UUID;
  type: BiolinkBlockType;
  content: Record<string, unknown>;
  order_index: number;
  visible: boolean;
  schedule_start: Timestamp | null;
  schedule_end: Timestamp | null;
  utm_tag: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface SwBiolinkClick {
  id: UUID;
  biolink_id: UUID;
  block_id: UUID | null;
  referrer: string | null;
  country: string | null;
  device: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  user_agent: string | null;
  created_at: Timestamp;
}

// ─── SITES ────────────────────────────────────────────────────

export type SiteStatus = 'draft' | 'published' | 'archived';

export interface SwSite {
  id: UUID;
  workspace_id: UUID;
  name: string;
  slug: string;
  status: SiteStatus;
  domain: string | null;
  favicon_url: string | null;
  seo: {
    title: string;
    description: string;
    og_image: string;
  };
  settings: Record<string, unknown>;
  published_at: Timestamp | null;
  created_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface SwSitePage {
  id: UUID;
  site_id: UUID;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  seo: {
    title: string;
    description: string;
    og_image: string;
  };
  order_index: number;
  template_key: string | null;
  is_home: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface SwSiteSection {
  id: UUID;
  page_id: UUID;
  component_key: string;
  props: Record<string, unknown>;
  order_index: number;
  visible: boolean;
  breakpoint_config: {
    mobile: boolean;
    tablet: boolean;
    desktop: boolean;
  };
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ─── EDITORIAL / BLOG ─────────────────────────────────────────

export type PostStatus = 'draft' | 'review' | 'approved' | 'scheduled' | 'published' | 'archived';
export type PostType = 'blog' | 'news';

export interface SwEditorialPost {
  id: UUID;
  workspace_id: UUID;
  type: PostType;
  title: string;
  slug: string;
  status: PostStatus;
  body: {
    blocks: unknown[];
  };
  excerpt: string | null;
  cover_image: string | null;
  seo: {
    title: string;
    description: string;
    og_image: string;
  };
  author_id: UUID | null;
  source_id: UUID | null;
  scheduled_at: Timestamp | null;
  published_at: Timestamp | null;
  read_time_min: number | null;
  view_count: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface SwEditorialSource {
  id: UUID;
  workspace_id: UUID;
  name: string;
  feed_url: string;
  active: boolean;
  last_fetched: Timestamp | null;
  error_count: number;
  last_error: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface SwEditorialQueueItem {
  id: UUID;
  workspace_id: UUID;
  source_id: UUID;
  raw_content: Record<string, unknown>;
  title: string;
  original_url: string | null;
  score: number | null;
  score_reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'derived';
  derived_to: 'blog' | 'post' | 'video' | 'newsletter' | null;
  derived_id: UUID | null;
  reviewed_by: UUID | null;
  reviewed_at: Timestamp | null;
  created_at: Timestamp;
}

// ─── AGENTES ──────────────────────────────────────────────────

export type AgentType = 'brand' | 'creator' | 'persona' | 'consumer' | 'operational';
export type AgentStatus = 'draft' | 'active' | 'paused' | 'archived';

export interface AgentIdentity {
  nome?: string;
  idade?: number;
  personalidade?: string;
  backstory?: string;
  [key: string]: unknown;
}

export interface AgentVoice {
  tom?: string;
  estilo?: string;
  vocabulario?: string[];
  [key: string]: unknown;
}

export interface SwAgent {
  id: UUID;
  workspace_id: UUID;
  name: string;
  type: AgentType;
  status: AgentStatus;
  avatar_url: string | null;
  identity: AgentIdentity;
  voice: AgentVoice;
  memory: Record<string, unknown>;
  behavior: Record<string, unknown>;
  tools: string[];
  integrations: string[];
  created_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface SwAgentSession {
  id: UUID;
  agent_id: UUID;
  user_id: UUID | null;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
  }>;
  started_at: Timestamp;
  ended_at: Timestamp | null;
  metadata: Record<string, unknown>;
}

// ─── SIMLAB ───────────────────────────────────────────────────

export interface SwSimlabProfile {
  id: UUID;
  workspace_id: UUID;
  agent_id: UUID | null;
  name: string;
  persona: {
    archetype?: string;
    demographics?: Record<string, unknown>;
    psychographics?: Record<string, unknown>;
    [key: string]: unknown;
  };
  behaviors: Record<string, unknown>;
  insights: Record<string, unknown>;
  created_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ─── BRAND KIT & BRIEFING ─────────────────────────────────────

export interface SwBrandKit {
  id: UUID;
  workspace_id: UUID | null;
  company_name: string | null;
  mission: string | null;
  vision: string | null;
  values: string[];
  archetype: string | null;
  positioning: string | null;
  colors: {
    primary?: string;
    secondary?: string;
    accent?: string;
    [key: string]: unknown;
  };
  typography: {
    primary?: string;
    secondary?: string;
    [key: string]: unknown;
  };
  tone_of_voice: {
    adjectives?: string[];
    do?: string[];
    dont?: string[];
    [key: string]: unknown;
  };
  sector: string | null;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}

export interface SwBriefing {
  id: UUID;
  workspace_id: UUID | null;
  company_name: string | null;
  segment: string | null;
  tagline: string | null;
  target_audience: string | null;
  value_proposition: string | null;
  main_differentials: string | null;
  tone_of_voice: string | null;
  brand_dna: string | null;
  content_pillars: string[];
  completeness_score: number;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}

// ─── CRM / LEADS ──────────────────────────────────────────────

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type LeadScore = 'high' | 'medium' | 'low';
export type LeadSource = 'manual' | 'form' | 'biolink' | 'site' | 'chat' | 'import';

export interface SwLead {
  id: UUID;
  workspace_id: UUID;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: LeadSource;
  tags: string[];
  status: LeadStatus;
  score: LeadScore;
  custom_fields: Record<string, unknown>;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ─── VÍDEO ────────────────────────────────────────────────────

export type VideoProjectStatus = 'draft' | 'rendering' | 'done' | 'failed' | 'archived';
export type VideoProjectMode = 'chat' | 'timeline' | 'motion' | 'template';

export interface SwVideoProject {
  id: UUID;
  workspace_id: UUID;
  title: string;
  status: VideoProjectStatus;
  mode: VideoProjectMode;
  duration_sec: number | null;
  thumbnail_url: string | null;
  settings: Record<string, unknown>;
  created_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface SwVideoJob {
  id: UUID;
  project_id: UUID;
  status: 'queued' | 'rendering' | 'done' | 'failed' | 'canceled';
  provider: string | null;
  output_url: string | null;
  output_format: 'mp4' | 'gif' | 'webm' | 'mp3';
  progress: number;
  error: string | null;
  started_at: Timestamp | null;
  finished_at: Timestamp | null;
  created_at: Timestamp;
}

// ─── SOCIAL POSTS ─────────────────────────────────────────────

export interface SwSocialPost {
  id: UUID;
  workspace_id: UUID;
  type: 'post' | 'carousel' | 'story' | 'reel';
  content: Record<string, unknown>;
  caption: string | null;
  hashtags: string[];
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  platforms: unknown[];
  scheduled_at: Timestamp | null;
  published_at: Timestamp | null;
  created_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ─── ANALYTICS ────────────────────────────────────────────────

export interface SwAnalyticsEvent {
  id: UUID;
  workspace_id: UUID;
  module: string;
  entity_id: UUID | null;
  event_type: string;
  properties: Record<string, unknown>;
  created_at: Timestamp;
}

// ─── LOGS & ERROS ─────────────────────────────────────────────

export interface SwErrorLog {
  id: UUID;
  workspace_id: UUID | null;
  user_id: UUID | null;
  module: string;
  function_name: string | null;
  error_code: string | null;
  message: string;
  payload: Record<string, unknown>;
  retry_count: number;
  resolved: boolean;
  created_at: Timestamp;
}

// ─── SUPORTE ──────────────────────────────────────────────────

export interface SwTicket {
  id: UUID;
  workspace_id: UUID;
  user_id: UUID | null;
  subject: string;
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  category: string;
  assignee_id: UUID | null;
  sla_deadline: Timestamp | null;
  resolved_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ─── CCP SNAPSHOT ─────────────────────────────────────────────

export interface CCPSnapshot {
  workspace: SwWorkspace;
  briefing: SwBriefing | null;
  brandKit: SwBrandKit | null;
  personas: SwAgent[];
  simlabProfiles: SwSimlabProfile[];
}

// ─── FEATURE FLAGS ────────────────────────────────────────────

export interface SwFeatureFlag {
  id: UUID;
  key: string;
  enabled: boolean;
  scope: {
    type: 'global' | 'plan' | 'workspace';
    plan_ids?: string[];
    workspace_ids?: string[];
  };
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ─── LOGERROR HELPER TYPE ─────────────────────────────────────

export interface LogErrorParams {
  code: string;
  module: string;
  message: string;
  detail?: Record<string, unknown>;
  workspaceId?: UUID;
  userId?: UUID;
}
