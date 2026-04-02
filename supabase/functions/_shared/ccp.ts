/**
 * CCP — Cerebro Context Protocol
 * 
 * Protocolo canônico de contexto para todos os agentes internos e outputs de usuário.
 * Substitui o buildSystemContext() texto-livre por um snapshot tipado e comprimível.
 *
 * Benefícios:
 *   - Contexto de marca em ~180 tokens (XML) vs ~480 tokens (texto livre)
 *   - Cache de 30s cobre pipeline completo (6 agents × 1 workspace)
 *   - Agentes não precisam "minerar" briefings/brand_kits — consomem o snapshot
 *   - Output contracts estruturados (ccp_context JSONB por recurso publicado)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type CCPLocale = "pt-BR" | "en-US";

/** Snapshot comprimido e canônico do contexto de marca de um workspace. */
export interface CCPBrandSnapshot {
  // Identidade
  workspace_id: string;
  brand_name: string;
  segment: string;
  audience: string;
  tone: string;
  differentials: string;
  pain: string;
  avoid: string;

  // Conteúdo
  pillars: string[];
  keywords: string[];
  brand_dna_summary: string;

  // Visual (somente o que prompts de design precisam)
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  font_headline: string;
  font_body: string;
  logo_url: string | null;

  // Meta
  locale: CCPLocale;
  snapshot_at: string;
}

/** Sinais de conteúdo (notícias + padrões virais) em formato comprimido. */
export interface CCPSignalCompact {
  news: Array<{ title: string; url: string; score: number | null }>;
  viral: Array<{ hook: string | null; type: string | null; trigger: string | null }>;
}

/** Persona em formato slim (sem prompt_template completo). */
export interface CCPPersonaSlim {
  id: string;
  slug: string;
  display_name: string;
  persona_group: string;
  locale: string;
  is_system: boolean;
}

/** Política de módulo do SimLab em formato slim. */
export interface CCPModulePolicy {
  module_type: string;
  policy_key: string;
  n_personas_min: number;
  n_personas_max: number;
  agents_per_persona: number;
}

// ─── Serialização XML (para prompts de IA) ─────────────────────────────────────

/**
 * Serializa o snapshot para XML comprimido (~180 tokens).
 * Comparação: buildSystemContext() produz ~480 tokens de texto corrido.
 *
 * @example
 * const xml = snapshotToXML(snap);
 * // → "<brand id="ws-123"><name>Acme</name><seg>E-commerce</seg>..."
 */
export const snapshotToXML = (snap: CCPBrandSnapshot): string => {
  const pillars = snap.pillars.slice(0, 5).join(" | ") || "não informado";
  const keywords = snap.keywords.slice(0, 8).join(", ") || "nenhuma";

  return `<brand id="${snap.workspace_id}">
<name>${snap.brand_name}</name>
<seg>${snap.segment}</seg>
<aud>${snap.audience}</aud>
<tone>${snap.tone}</tone>
<diff>${snap.differentials}</diff>
<pain>${snap.pain}</pain>
<avoid>${snap.avoid}</avoid>
<pillars>${pillars}</pillars>
<kw>${keywords}</kw>
<palette p="${snap.color_primary}" s="${snap.color_secondary}" a="${snap.color_accent}"/>
<fonts h="${snap.font_headline}" b="${snap.font_body}"/>
<locale>${snap.locale}</locale>
</brand>`.trim();
};

/**
 * Versão ultra-comprimida para tasks que só precisam de identidade básica.
 * ~80 tokens — para prompts já bem contextualizados que não precisam de visual.
 */
export const snapshotToMinimalXML = (snap: CCPBrandSnapshot): string =>
  `<brand><name>${snap.brand_name}</name><seg>${snap.segment}</seg><tone>${snap.tone}</tone><locale>${snap.locale}</locale></brand>`;

// ─── Cache em Memória ──────────────────────────────────────────────────────────

type SnapshotCacheEntry = { data: CCPBrandSnapshot; exp: number };
const SNAPSHOT_CACHE = new Map<string, SnapshotCacheEntry>();

type SignalCacheEntry = { data: CCPSignalCompact; exp: number };
const SIGNAL_CACHE = new Map<string, SignalCacheEntry>();

// ─── Helpers de Parsing ────────────────────────────────────────────────────────

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" && v.trim().length > 0 ? v.trim() : fallback;

const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim()) : [];

const num = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

// ─── Snapshot Builder ──────────────────────────────────────────────────────────

const buildSnapshot = (
  workspaceId: string,
  briefing: Record<string, unknown> | null,
  kit: Record<string, unknown> | null,
): CCPBrandSnapshot => ({
  workspace_id: workspaceId,
  brand_name: str(briefing?.company_name, "Workspace"),
  segment: str(briefing?.segment, "não informado"),
  audience: str(briefing?.target_audience, "não informado"),
  tone: str(briefing?.tone_of_voice, "não informado"),
  differentials: str(briefing?.main_differentials, "não informado"),
  pain: str(briefing?.pain_points, "não informado"),
  avoid: str(briefing?.avoid_topics, "nenhum"),
  pillars: strArr(briefing?.content_pillars),
  keywords: strArr(briefing?.keywords),
  brand_dna_summary: str(briefing?.brand_dna, ""),
  color_primary: str(kit?.color_primary, "#7C3AED"),
  color_secondary: str(kit?.color_secondary, "#18181B"),
  color_accent: str(kit?.color_accent, "#F59E0B"),
  font_headline: str(kit?.font_headline, "Space Grotesk"),
  font_body: str(kit?.font_body, "DM Sans"),
  logo_url: typeof kit?.logo_url === "string" && kit.logo_url.trim().length > 0 ? kit.logo_url.trim() : null,
  locale: "pt-BR",
  snapshot_at: new Date().toISOString(),
});

// ─── API Pública ───────────────────────────────────────────────────────────────

/**
 * Retorna o snapshot canônico do contexto de marca do workspace.
 *
 * Cache de 30s em memória cobre todo um pipeline de geração sem re-queries.
 * Faz apenas 2 queries paralelas ao banco (briefings + brand_kits).
 *
 * @example
 * // Em qualquer Edge Function:
 * const snap = await getCCPSnapshot(supabase, workspaceId);
 * const xml = snapshotToXML(snap);  // pronto para usar no system prompt
 */
export const getCCPSnapshot = async (
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  ttlMs = 30_000,
): Promise<CCPBrandSnapshot> => {
  const hit = SNAPSHOT_CACHE.get(workspaceId);
  if (hit && hit.exp > Date.now()) return hit.data;

  const [{ data: briefing }, { data: kit }] = await Promise.all([
    supabase
      .from("briefings")
      .select(
        "company_name,segment,target_audience,tone_of_voice," +
        "main_differentials,pain_points,avoid_topics,keywords," +
        "content_pillars,brand_dna",
      )
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
    supabase
      .from("brand_kits")
      .select("color_primary,color_secondary,color_accent,font_headline,font_body,logo_url")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
  ]);

  const snap = buildSnapshot(
    workspaceId,
    briefing as Record<string, unknown> | null,
    kit as Record<string, unknown> | null,
  );

  SNAPSHOT_CACHE.set(workspaceId, { data: snap, exp: Date.now() + ttlMs });
  return snap;
};

/**
 * Retorna sinais de conteúdo comprimidos: top notícias + top padrões virais.
 * Used by: trend_researcher, news-relevance-score, scroll-section-generator.
 */
export const getCCPSignals = async (
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  ttlMs = 30_000,
): Promise<CCPSignalCompact> => {
  const hit = SIGNAL_CACHE.get(workspaceId);
  if (hit && hit.exp > Date.now()) return hit.data;

  const [{ data: newsRows }, { data: viralRows }] = await Promise.all([
    supabase
      .from("news_items")
      .select("title,source_url,relevance_score")
      .eq("workspace_id", workspaceId)
      .order("relevance_score", { ascending: false })
      .limit(6),
    supabase
      .from("viral_analyses")
      .select("hook_formula,content_type,emotional_trigger")
      .eq("workspace_id", workspaceId)
      .order("analyzed_at", { ascending: false })
      .limit(6),
  ]);

  const signals: CCPSignalCompact = {
    news: ((newsRows || []) as Record<string, unknown>[]).map((r) => ({
      title: str(r.title),
      url: str(r.source_url),
      score: typeof r.relevance_score === "number" ? r.relevance_score : null,
    })),
    viral: ((viralRows || []) as Record<string, unknown>[]).map((r) => ({
      hook: str(r.hook_formula) || null,
      type: str(r.content_type) || null,
      trigger: str(r.emotional_trigger) || null,
    })),
  };

  SIGNAL_CACHE.set(workspaceId, { data: signals, exp: Date.now() + ttlMs });
  return signals;
};

/**
 * Retorna personas em formato slim — sem prompt_template completo.
 * O prompt_template de cada persona deve ser carregado individualmente
 * apenas para as N personas selecionadas num run específico.
 */
export const getCCPPersonasSlim = async (
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
): Promise<CCPPersonaSlim[]> => {
  const { data, error } = await supabase
    .from("simlab_personas")
    .select("id,slug,display_name,persona_group,locale,is_system,status")
    .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
    .eq("status", "active")
    .order("display_name");

  if (error) throw error;

  return ((data || []) as Record<string, unknown>[]).map((r) => ({
    id: str(r.id),
    slug: str(r.slug),
    display_name: str(r.display_name),
    persona_group: str(r.persona_group),
    locale: str(r.locale, "pt-BR"),
    is_system: r.is_system === true,
  }));
};

/**
 * Carrega o prompt_template completo de personas individualmente.
 * Chamado apenas após seleção das N personas para um run específico.
 */
export const getCCPPersonaPromptTemplates = async (
  supabase: ReturnType<typeof createClient>,
  personaIds: string[],
): Promise<Record<string, string>> => {
  if (personaIds.length === 0) return {};

  const { data, error } = await supabase
    .from("simlab_personas")
    .select(`
      id,
      current_version:simlab_persona_versions!simlab_personas_current_version_fkey(
        prompt_template
      )
    `)
    .in("id", personaIds);

  if (error) throw error;

  const result: Record<string, string> = {};
  for (const row of (data || []) as Record<string, unknown>[]) {
    const id = str(row.id);
    const version = row.current_version as Record<string, unknown> | null;
    if (id && version && typeof version.prompt_template === "string") {
      result[id] = version.prompt_template;
    }
  }
  return result;
};

// ─── CCP Output Metadata Builders ─────────────────────────────────────────────

/**
 * Gera o ccp_context JSONB a ser salvo com um Bio Link.
 * Permite agentes internos entenderem o conteúdo sem parsing HTML.
 */
export const buildBioLinkCCPContext = (params: {
  workspaceId: string;
  snap: CCPBrandSnapshot;
  linksCount: number;
  blocksCount: number;
  blockTypes: string[];
  primaryCta: string | null;
  seoTitle: string;
  seoDescription: string;
  simlabVerdict: string | null;
  simlabRunId: string | null;
}) => ({
  type: "cerebro/biolink/v1",
  workspace_id: params.workspaceId,
  brand: { name: params.snap.brand_name, segment: params.snap.segment, tone: params.snap.tone },
  content: {
    links_count: params.linksCount,
    blocks_count: params.blocksCount,
    block_types: params.blockTypes,
    primary_cta: params.primaryCta,
  },
  seo: { title: params.seoTitle, description: params.seoDescription },
  simlab: { verdict: params.simlabVerdict, run_id: params.simlabRunId },
  generated_at: new Date().toISOString(),
});

/**
 * Gera o ccp_context JSONB a ser salvo com um artigo de blog.
 */
export const buildBlogArticleCCPContext = (params: {
  workspaceId: string;
  snap: CCPBrandSnapshot;
  targetKeyword: string | null;
  contentPillar: string | null;
  wordCountTarget: number | null;
  simlabVerdict: string | null;
  videoJobId: string | null;
  videoStatus: string | null;
  videoResultUrl: string | null;
}) => ({
  type: "cerebro/blog/v1",
  workspace_id: params.workspaceId,
  brief: {
    target_keyword: params.targetKeyword,
    content_pillar: params.contentPillar,
    word_count_target: params.wordCountTarget,
  },
  quality: { simlab_verdict: params.simlabVerdict },
  video_summary: {
    job_id: params.videoJobId,
    status: params.videoStatus,
    result_url: params.videoResultUrl,
  },
  generated_at: new Date().toISOString(),
});

/**
 * Gera o ccp_context JSONB para um Website/Site Institucional.
 */
export const buildSiteCCPContext = (params: {
  workspaceId: string;
  snap: CCPBrandSnapshot;
  blockCount: number;
  blockTypes: string[];
  motionSectionIds: string[];
  seoTitle: string | null;
  seoDescription: string | null;
}) => ({
  type: "cerebro/site/v1",
  workspace_id: params.workspaceId,
  brand: { name: params.snap.brand_name, segment: params.snap.segment },
  structure: {
    block_count: params.blockCount,
    block_types: params.blockTypes,
    has_motion_sections: params.motionSectionIds.length > 0,
    motion_section_ids: params.motionSectionIds,
  },
  seo: { title: params.seoTitle, description: params.seoDescription },
  generated_at: new Date().toISOString(),
});

// ─── Invalidação de Cache ──────────────────────────────────────────────────────

/** Invalida o snapshot de um workspace (use após atualização de briefing/brand_kit). */
export const invalidateCCPSnapshot = (workspaceId: string) => {
  SNAPSHOT_CACHE.delete(workspaceId);
  SIGNAL_CACHE.delete(workspaceId);
};

export const invalidateAllCCPCaches = () => {
  SNAPSHOT_CACHE.clear();
  SIGNAL_CACHE.clear();
};

// ─── Compat: wrapper retrocompatível com BrandContext legado ──────────────────

/**
 * @deprecated Use getCCPSnapshot() + snapshotToXML() diretamente.
 * Mantido para compatibilidade retroativa durante a migração das Edge Functions.
 */
export const getBrandContextLegacy = async (
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
) => {
  const snap = await getCCPSnapshot(supabase, workspaceId);
  return {
    briefing: null, // deprecado — use snap fields diretamente
    brandKit: null,  // deprecado — use snap fields diretamente
    system_context: snapshotToXML(snap),
    _snap: snap,     // acesso direto ao snapshot para migração progressiva
  };
};
