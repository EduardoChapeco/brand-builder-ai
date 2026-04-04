/**
 * src/integrations/supabase/db-custom.ts
 * SDD-1.0 — Shim de compatibilidade + acesso às tabelas canônicas
 *
 * Regra: Todos os acessos usam as tabelas canônicas do schema SDD-1.0.
 * Mapeamento de legado → canônico:
 *   sw_biolinks           → publications (type='biolink')
 *   sw_biolink_blocks     → publication_blocks
 *   sw_blog_articles      → blog_articles
 *   sw_news_items         → rss_items
 *   sw_rss_sources        → rss_sources
 *   sw_sites              → publications (type='site')
 *   sw_contacts           → leads
 *   sw_system_logs        → system_logs
 *   sw_workspace_members  → workspace_members
 */
import { supabase } from "@/lib/supabase";

// ─── Generic escape hatch (backward compat) ───────────────────────────────────
export const fromTable = (table: string) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase as any).from(table) as ReturnType<typeof supabase.from>;

// ─── Typed db accessor — SEMPRE usando tabelas canônicas ──────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = (table: string) => (supabase as any).from(table) as ReturnType<typeof supabase.from>;

export const db = {
  // Membros de workspace
  workspaceMembers: () => t("workspace_members"),

  // Publicações (Bio Link, Site, Blog, Portal, Landing)
  publications: () => t("publications"),
  publicationBlocks: () => t("publication_blocks"),
  publicationSections: () => t("publication_sections"),

  // Blog
  blogArticles: () => t("blog_articles"),

  // RSS / Portal de Notícias
  newsItems: () => t("rss_items"),
  rssSources: () => t("rss_sources"),

  // CRM / Leads
  crmContacts: () => t("leads"),
  leads: () => t("leads"),

  // Conteúdo
  contentItems: () => t("content_items"),
  contentTemplates: () => t("content_templates"),

  // Agentes
  agents: () => t("agents"),
  squadNodes: () => t("squad_nodes"),

  // SimLab
  simlabValidations: () => t("simlab_validations"),

  // Logs do sistema
  systemLogs: () => t("system_logs"),

  // Chaves de API
  adminApiKeys: () => t("admin_api_keys"),
  workspaceApiKeys: () => t("workspace_api_keys"),

  // Financeiro
  subscriptions: () => t("subscriptions"),
  invoices: () => t("invoices"),

  // Suporte
  supportTickets: () => t("support_tickets"),
  ticketMessages: () => t("ticket_messages"),

  // Feature Flags
  featureFlags: () => t("feature_flags"),

  // Brand Kit e Briefing
  brandKits: () => t("brand_kits"),
  briefings: () => t("briefings"),
};

// ─── Re-export row types from app.types.ts ────────────────────────────────────
export type {
  Publication,
  PublicationBlock,
  BlogArticle,
  RssItem,
  RssSource,
  Lead,
  ContentItem,
  Agent,
  SystemLog,
  BrandKit,
  Briefing,
} from "@/types/app.types";
