// src/types/app.types.ts
// CONTRATO SDD-1.0: Tipos de negócio do Simwork
// Correspondem EXATAMENTE ao schema canônico do banco (sw020_canonical_schema_foundation)
// Quando o schema mudar, este arquivo DEVE ser atualizado primeiro.

// ── Workspace ────────────────────────────────────────────────
export type WorkspacePlan =
  | "starter"
  | "pro"
  | "business"
  | "corp"
  | "admin_free";
export type WorkspaceStatus = "active" | "suspended" | "trial" | "canceled";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  plan: WorkspacePlan;
  status: WorkspaceStatus;
  trial_ends_at: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type MemberRole = "owner" | "admin" | "editor" | "viewer";

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: MemberRole;
  invited_by: string | null;
  joined_at: string;
}

// ── Brand Kit ────────────────────────────────────────────────
export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  palette: string[];
}

export interface BrandFonts {
  heading: { family: string; weight: number };
  body: { family: string; weight: number };
  sizes: Record<string, string>;
}

export interface BrandLogos {
  main_url: string | null;
  icon_url: string | null;
  dark_url: string | null;
  light_url: string | null;
}

export interface BrandVoice {
  tone: string;
  formality: "formal" | "neutro" | "descontraído";
  use_words: string[];
  avoid_words: string[];
}

export interface BrandKit {
  id: string;
  workspace_id: string;
  colors: Partial<BrandColors>;
  fonts: Partial<BrandFonts>;
  logos: Partial<BrandLogos>;
  voice: Partial<BrandVoice>;
  updated_at: string;
}

// ── Briefing ─────────────────────────────────────────────────
export interface BriefingCompany {
  name?: string;
  segment?: string;
  website?: string;
  mission?: string;
  vision?: string;
  values?: string[];
  differentials?: string[];
}

export interface BriefingAudience {
  description?: string;
  age_range?: string;
  income?: string;
  pain_points?: string[];
  desires?: string[];
}

export interface Briefing {
  id: string;
  workspace_id: string;
  company: Partial<BriefingCompany>;
  audience: Partial<BriefingAudience>;
  market: Record<string, unknown>;
  content: Record<string, unknown>;
  channels: Array<{ platform: string; goal: string; frequency: string }>;
  completeness_score: number;
  updated_at: string;
}

// ── Publication ──────────────────────────────────────────────
export type PublicationType =
  | "biolink"
  | "site"
  | "blog"
  | "portal"
  | "landing";
export type PublicationStatus = "draft" | "published" | "archived";

export interface Publication {
  id: string;
  workspace_id: string;
  type: PublicationType;
  name: string;
  slug: string | null;
  status: PublicationStatus;
  config: Record<string, unknown>;
  seo: {
    title?: string;
    description?: string;
    og_image?: string;
    keywords?: string[];
  };
  simlab_score: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Bloco do Bio Link ────────────────────────────────────────
export type BlockType =
  | "link"
  | "highlight"
  | "newsletter"
  | "product"
  | "video"
  | "music"
  | "countdown"
  | "separator"
  | "text"
  | "social"
  | "booking"
  | "map";

export interface PublicationBlock {
  id: string;
  publication_id: string;
  workspace_id: string;
  block_type: BlockType;
  position: number;
  content: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Seção de Site ────────────────────────────────────────────
export interface PublicationSection {
  id: string;
  publication_id: string;
  workspace_id: string;
  page_slug: string | null;
  section_type: string;
  position: number;
  content: Record<string, unknown>;
  styles: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

// ── Blog Article ─────────────────────────────────────────────
export type ArticleStatus = "draft" | "review" | "published" | "archived";

export interface BlogArticle {
  id: string;
  publication_id: string;
  workspace_id: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  cover_image_url: string | null;
  seo: Record<string, unknown>;
  status: ArticleStatus;
  simlab_score: number | null;
  word_count: number | null;
  reading_time_minutes: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── RSS ──────────────────────────────────────────────────────
export interface RssSource {
  id: string;
  publication_id: string | null;
  workspace_id: string;
  feed_url: string;
  name: string;
  status: "active" | "error" | "paused";
  last_fetched_at: string | null;
  last_error: string | null;
  created_at: string;
}

export interface RssItem {
  id: string;
  source_id: string;
  workspace_id: string;
  item_url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  author: string | null;
  published_at: string | null;
  relevance_score: number;
  derivations: Record<string, unknown>;
  fetched_at: string;
}

// ── Conteúdo ─────────────────────────────────────────────────
export type ContentType = "post" | "video";
export type ContentStatus =
  | "draft"
  | "processing"
  | "ready"
  | "published"
  | "archived";
export type ContentFormat = "1:1" | "9:16" | "16:9" | "4:5";

export interface SlideData {
  template_id: string;
  position: number;
  texts: Record<string, string>;
  styles: Record<string, string>;
}

export interface VideoJobData {
  job_id?: string;
  render_url?: string;
  duration_seconds?: number;
  fps?: number;
  remotion_template?: string;
  status?: "queued" | "processing" | "completed" | "failed";
  error?: string;
}

export interface ContentItem {
  id: string;
  workspace_id: string;
  type: ContentType;
  title: string;
  status: ContentStatus;
  format: ContentFormat | null;
  slides: SlideData[];
  video_job: VideoJobData;
  template_id: string | null;
  simlab_score: number | null;
  thumbnail_url: string | null;
  source: "manual" | "ai_generated" | "rss_derived" | "squad_generated";
  rss_item_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentTemplate {
  id: string;
  scope: "global" | "workspace";
  workspace_id: string | null;
  type: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  structure: Record<string, unknown>;
  guardrails: Array<{ rule: string }>;
  is_active: boolean;
  created_at: string;
}

// ── Agente ───────────────────────────────────────────────────
export type AgentType = "persona" | "influencer" | "mascote" | "squad";

export interface PersonaConfig {
  demographics: {
    age_range: string;
    gender: string;
    location: string;
    income_range: string;
    education: string;
    occupation: string;
  };
  psychographics: {
    values: string[];
    lifestyle: string;
    pain_points: string[];
    desires: string[];
  };
  sor_model: {
    stimulus_sensitivity: Record<string, number>;
    organism_filters: string[];
    typical_responses: string[];
  };
}

export interface InfluencerConfig {
  handle: string;
  platform: string;
  audience_size: number;
  niche: string;
  personality: string;
  content_style: string;
}

export interface MascoteConfig {
  visual_description: string;
  personality: string;
  backstory: string;
  use_cases: string[];
}

export interface Agent {
  id: string;
  workspace_id: string;
  agent_type: AgentType;
  name: string;
  avatar_url: string | null;
  config: PersonaConfig | InfluencerConfig | MascoteConfig | Record<string, unknown>;
  calibration_score: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── SimLab ───────────────────────────────────────────────────
export interface SimLabValidation {
  id: string;
  workspace_id: string;
  content_type: string;
  content_id: string;
  personas_used: string[];
  scores: {
    overall: number;
    by_persona: Array<{ agent_id: string; score: number; name: string }>;
    by_trigger: Record<string, number>;
  };
  recommendations: Array<{
    issue: string;
    suggestion: string;
    impact: "alto" | "médio" | "baixo";
  }>;
  passed: boolean;
  created_at: string;
}

// ── Leads / CRM ──────────────────────────────────────────────
export type LeadStatus = "new" | "contacted" | "qualified" | "customer" | "lost";

export interface Lead {
  id: string;
  workspace_id: string;
  publication_id: string | null;
  block_id: string | null;
  name: string | null;
  email: string;
  phone: string | null;
  status: LeadStatus;
  tags: string[];
  notes: string | null;
  metadata: Record<string, unknown>;
  utm: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── Log de Sistema ───────────────────────────────────────────
export type LogLevel = "info" | "warning" | "error" | "critical";

export interface SystemLog {
  id: string;
  workspace_id: string | null;
  user_id: string | null;
  level: LogLevel;
  code: string;
  module: string;
  message: string;
  detail: Record<string, unknown>;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

// ── Feature Flags ────────────────────────────────────────────
export interface FeatureFlag {
  id: string;
  feature: string;
  scope: "global" | "plan" | "workspace" | "user";
  scope_value: string | null;
  is_enabled: boolean;
  created_at: string;
}

// ── Billing ──────────────────────────────────────────────────
export interface Subscription {
  id: string;
  workspace_id: string;
  plan: WorkspacePlan;
  status: "active" | "past_due" | "canceled" | "trialing" | "paused";
  gateway: "mercadopago" | "asaas" | "abacatepay" | "paypal";
  gateway_sub_id: string | null;
  amount_cents: number;
  billing_cycle: "monthly" | "yearly";
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  created_at: string;
}

// ── CCP Snapshot (contexto de marca para IA) ─────────────────
export interface CCPSnapshot {
  workspace: Pick<Workspace, "id" | "name" | "slug" | "plan">;
  brand_kit: Partial<BrandKit> | null;
  briefing: {
    company: Record<string, unknown>;
    audience: Record<string, unknown>;
    content: Record<string, unknown>;
    completeness_score: number;
  } | null;
  active_personas: Array<Pick<Agent, "id" | "name" | "config">>;
  completeness: "completo" | "parcial" | "vazio";
}
