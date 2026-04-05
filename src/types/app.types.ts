// src/types/app.types.ts
// CONTRATO SDD-1.0: Tipos de negócio do Simwork
// Espelha EXATAMENTE o schema canônico do banco de produção.
// PRD Master: docs/SIMWORK-CANONICAL-MASTER.md (linhas 611-900)
// REGRA: Quando o schema mudar, este arquivo DEVE ser atualizado primeiro.

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
  // NOTA: Não há campo 'status' na tabela workspace_members do banco real.
}

// ── Brand Kit ────────────────────────────────────────────────
// Estrutura JSONB conforme banco real:
//   id, workspace_id, colors (jsonb), fonts (jsonb), logos (jsonb), voice (jsonb), updated_at
//
// Comentários do PRD (linhas 654-664):
//   colors: {primary, secondary, accent, background, text, palette: []}
//   fonts: {heading: {family, weight}, body: {family, weight}, sizes: {}}
//   logos: {main_url, icon_url, dark_url, light_url}
//   voice: {tone, formality, use_words: [], avoid_words: []}

export interface BrandKitColors {
  primary: string;
  secondary: string;
  accent: string;
  background?: string;     // bg_dark
  bg_light?: string;
  text?: string;           // text_dark
  text_light?: string;
  success?: string;
  warning?: string;
  danger?: string;
  palette?: string[];      // cores customizadas extras
}

export interface BrandKitFonts {
  heading?: string;        // família para headings (ex: "Inter")
  body?: string;           // família para corpo de texto
  mono?: string;           // família monoespaçada
  display?: string;        // família display/decorativa
  sizes?: Record<string, string>;
}

export interface BrandKitLogos {
  main_url?: string | null;        // logo principal (fundo claro)
  dark_url?: string | null;        // logo invertida (fundo escuro)
  icon_url?: string | null;        // ícone / favicon
  light_url?: string | null;       // wordmark / horizontal
}

export interface BrandKitVoice {
  tone?: string;                   // ex: "profissional", "descontraído"
  formality?: string;              // ex: "formal", "casual"
  use_words?: string[];
  avoid_words?: string[];
  // Metadados visuais (armazenados em voice para compatibilidade)
  border_radius_scale?: 'none' | 'small' | 'medium' | 'large' | 'pill';
  shadow_style?: 'none' | 'subtle' | 'medium' | 'strong';
  animation_style?: 'none' | 'minimal' | 'smooth' | 'bouncy';
  icon_set?: 'lucide' | 'phosphor' | 'heroicons';
}

export interface BrandKit {
  id: string;
  workspace_id: string;
  colors: BrandKitColors;
  fonts: BrandKitFonts;
  logos: BrandKitLogos;
  voice: BrandKitVoice;
  updated_at: string;
}

// ── Briefing ─────────────────────────────────────────────────
// Estrutura JSONB conforme banco real:
//   id, workspace_id, company (jsonb), audience (jsonb), market (jsonb),
//   content (jsonb), channels (jsonb), completeness_score, updated_at
//
// Comentários do PRD (linhas 673-688):
//   company: {name, segment, website, mission, vision, values, differentials}
//   audience: {description, age_range, income, pain_points, desires}
//   market: {competitors: [{name, url, notes}], position, opportunities}
//   content: {pillars: [], keywords: [], avoid_topics, cadence}
//   channels: [{platform, goal, frequency}]

export interface BriefingCompany {
  name?: string;
  segment?: string;
  website?: string;
  mission?: string;
  vision?: string;
  values?: string;
  differentials?: string;
  tagline?: string;
  brand_dna?: string;
  value_proposition?: string;
}

export interface BriefingAudience {
  description?: string;
  age_range?: string;
  income?: string;
  pain_points?: string;
  desires?: string;
  personality?: string;  // brand personality
}

export interface BriefingMarket {
  competitors?: Array<{ name: string; url?: string; notes?: string }>;
  position?: string;
  opportunities?: string;
}

export interface BriefingContent {
  pillars?: string[];
  keywords?: string[];
  avoid_topics?: string;
  cadence?: string;
  tone_of_voice?: string;
  value_proposition?: string;
}

export interface BriefingChannel {
  platform: string;
  goal?: string;
  frequency?: string;
}

export interface Briefing {
  id: string;
  workspace_id: string;
  company: BriefingCompany;
  audience: BriefingAudience;
  market: BriefingMarket;
  content: BriefingContent;
  channels: BriefingChannel[];
  completeness_score: number;
  updated_at: string | null;
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
  updated_at: string;   // ✅ confirmado no banco live (20260404)
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
  relevance_reason: string | null;
  categories: string[];
  status: string;
  content_extracted: boolean;
  latest_simlab_run_id: string | null;
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
// Usado pela função getCCPSnapshot() em src/lib/ccp.ts
export interface CCPSnapshot {
  workspace: Pick<Workspace, "id" | "name" | "slug" | "plan">;
  brand_kit: {
    colors: BrandKitColors;
    fonts: BrandKitFonts;
    logos: BrandKitLogos;
    voice: BrandKitVoice;
  } | null;
  briefing: {
    company: BriefingCompany;
    audience: BriefingAudience;
    content: BriefingContent;
    completeness_score: number;
  } | null;
  active_personas: Array<Pick<Agent, "id" | "name" | "config">>;
  completeness: "completo" | "parcial" | "vazio";
}

// ── Helper: Flatten BrandKit JSONB → form fields ─────────────
// Usado por BrandKitPage para converter dados do banco para o formulário plano
export interface BrandKitFormFlat {
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  color_bg_dark: string;
  color_bg_light: string;
  color_text_dark: string;
  color_text_light: string;
  color_success: string;
  color_warning: string;
  color_danger: string;
  font_heading: string;
  font_body: string;
  font_mono: string;
  font_display: string;
  logo_url: string;
  logo_dark_url: string;
  logo_icon_url: string;
  logo_light_url: string;
  border_radius_scale: 'none' | 'small' | 'medium' | 'large' | 'pill';
  shadow_style: 'none' | 'subtle' | 'medium' | 'strong';
  animation_style: 'none' | 'minimal' | 'smooth' | 'bouncy';
  icon_set: 'lucide' | 'phosphor' | 'heroicons';
  custom_colors: Array<{ name: string; hex: string }>;
}

// ── Helper: Flatten Briefing JSONB → form fields ─────────────
// Usado por BriefingPage para converter dados do banco para o formulário plano
export interface BriefingFormFlat {
  company_name: string;
  tagline: string;
  segment: string;
  brand_dna: string;
  value_proposition: string;
  main_differentials: string;
  target_audience: string;
  audience_age_range: string;
  brand_personality: string;
  tone_of_voice: string;
  avoid_topics: string;
  content_pillars: string[];
  keywords: string[];
  completeness_score: number;
}
