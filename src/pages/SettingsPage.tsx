/**
 * SettingsPage.tsx — SDD-1.0
 *
 * Gerencia chaves de API e configurações do workspace.
 *
 * Schema real da tabela `workspace_api_keys`:
 *   id, workspace_id, service (text), label (text),
 *   key_encrypted (text), is_active (bool), created_at, updated_at
 *
 * NÃO existem: provider, alias, key_preview, calls_today, daily_limit
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Key, Plus, Rss, Settings, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import AppSectionLabel from '@/components/shared/AppSectionLabel';
import MetricCard from '@/components/shared/MetricCard';
import PageHeader from '@/components/shared/PageHeader';
import SectionCard from '@/components/shared/SectionCard';
import SubtleBadge from '@/components/shared/SubtleBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { fromTable } from '@/integrations/supabase/db-custom';

// ─── Types alinhados com o schema real do banco ───────────────────────────────

type ServiceId =
  | 'groq' | 'openrouter' | 'gemini' | 'firecrawl' | 'steel'
  | 'elevenlabs' | 'runway' | 'kling' | 'luma' | 'minimax'
  | 'removebg' | 'replicate';

interface ApiKeyRecord {
  id: string;
  service: string;    // coluna real: 'service'
  label: string;      // coluna real: 'label'
  is_active: boolean;
}

interface RssFeedRecord {
  id: string;
  name: string | null;
  url: string;
  category: string | null;
  is_active: boolean | null;
}

interface KeyDraft {
  label: string;
  key_value: string;
}

interface GenerationPreferences {
  preferred_model: string;
  export_quality: '1080px' | '2160px';
  language: 'pt-BR' | 'en-US' | 'es-ES';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICES: Array<{
  id: ServiceId;
  name: string;
  description: string;
  link: string;
  helper: string;
}> = [
  { id: 'groq',       name: 'Groq',       description: 'Texto de alta velocidade para operacoes frequentes.',       link: 'https://console.groq.com',       helper: 'Ideal para geracao principal e tarefas com latencia baixa.' },
  { id: 'openrouter', name: 'OpenRouter', description: 'Fallback de modelos quando o provider principal falhar.',    link: 'https://openrouter.ai',          helper: 'Bom para redundancia entre modelos gratuitos ou alternativos.' },
  { id: 'gemini',     name: 'Gemini',     description: 'Texto e imagem em um provider unificado.',                   link: 'https://aistudio.google.com',    helper: 'Usado para composicao de conteudo e fundos gerados.' },
  { id: 'firecrawl',  name: 'Firecrawl',  description: 'Coleta de paginas e artigos estruturados.',                  link: 'https://www.firecrawl.dev',      helper: 'Necessario para extracoes editoriais e scraping contextual.' },
  { id: 'steel',      name: 'Steel',      description: 'Runtime de navegador remoto para captura visual.',           link: 'https://steel.dev',              helper: 'Usado em Web Cloner e fluxos que exigem screenshot real.' },
  { id: 'elevenlabs', name: 'ElevenLabs', description: 'Speech-to-text para legenda e transcript do Video Studio.',  link: 'https://elevenlabs.io',          helper: 'Necessario para geracao real de legendas palavra a palavra.' },
  { id: 'runway',     name: 'Runway',     description: 'Geracao de video a partir de keyframe e prompt modular.',    link: 'https://runwayml.com',           helper: 'Primeira prioridade para adapters de image-to-video.' },
  { id: 'kling',      name: 'Kling',      description: 'Fallback image-to-video para cenas cinematograficas.',       link: 'https://klingai.com',            helper: 'Usado como provider alternativo de render de video IA.' },
  { id: 'luma',       name: 'Luma',       description: 'Render de video generativo para variacoes visuais.',         link: 'https://lumalabs.ai',            helper: 'Provider opcional para image-to-video.' },
  { id: 'minimax',    name: 'Minimax',    description: 'Fallback adicional para pipeline de video generativo.',      link: 'https://www.minimax.io',         helper: 'Mantem redundancia quando Runway/Kling falham.' },
  { id: 'removebg',   name: 'Remove.bg',  description: 'Remocao de fundo para assets e cenas compostas.',           link: 'https://www.remove.bg/api',      helper: 'Usado para recorte rapido de fundo no Video Studio.' },
  { id: 'replicate',  name: 'Replicate',  description: 'Enhancement, upscale e operadores visuais especializados.', link: 'https://replicate.com',          helper: 'Necessario para pipelines de quality enhancement do Video Studio.' },
];

const RSS_CATEGORIES = ['Tecnologia', 'Marketing', 'Negocios', 'Geral', 'Saude', 'Educacao'];
const MODEL_OPTIONS = [
  'llama-3.3-70b-versatile', 'mixtral-8x7b-32768',
  'meta-llama/llama-3.3-70b-instruct:free', 'deepseek/deepseek-chat:free',
  'gemini-2.0-flash-exp', 'gemini-1.5-flash',
];

const createPreferenceKey = (wsId?: string) =>
  wsId ? `simwork:generation-preferences:${wsId}` : 'simwork:generation-preferences';

// ─── Component ────────────────────────────────────────────────────────────────

const SettingsPage = () => {
  const { workspace } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();

  const [apiKeys,   setApiKeys]   = useState<ApiKeyRecord[]>([]);
  const [rssFeeds,  setRssFeeds]  = useState<RssFeedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newFeed,   setNewFeed]   = useState({ name: '', url: '', category: 'Tecnologia' });
  const [preferences, setPreferences] = useState<GenerationPreferences>({
    preferred_model: MODEL_OPTIONS[0],
    export_quality: '1080px',
    language: 'pt-BR',
  });

  // Um rascunho por serviço
  const [keyDrafts, setKeyDrafts] = useState<Record<ServiceId, KeyDraft>>(
    Object.fromEntries(SERVICES.map((s) => [s.id, { label: '', key_value: '' }])) as Record<ServiceId, KeyDraft>
  );

  const preferenceStorageKey = createPreferenceKey(workspace?.id);
  const activeTab = searchParams.get('tab') === 'rss'
    ? 'rss'
    : searchParams.get('tab') === 'preferences'
      ? 'preferences'
      : 'keys';

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!workspace?.id) return;
    setIsLoading(true);
    try {
      const [{ data: keyRows, error: keyError }, { data: feedRows, error: feedError }] = await Promise.all([
        fromTable('workspace_api_keys')
          .select('id,service,label,is_active')
          .eq('workspace_id', workspace.id)
          .order('created_at'),
        fromTable('rss_sources')
          .select('id,name,url,category,is_active')
          .eq('workspace_id', workspace.id)
          .order('created_at'),
      ]);

      if (keyError) throw keyError;
      if (feedError) throw feedError;

      setApiKeys((keyRows || []) as ApiKeyRecord[]);
      setRssFeeds((feedRows || []) as RssFeedRecord[]);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar configuracoes');
    } finally {
      setIsLoading(false);
    }
  }, [workspace?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Load preferences from localStorage ────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem(preferenceStorageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<GenerationPreferences>;
      setPreferences((cur) => ({
        preferred_model: parsed.preferred_model || cur.preferred_model,
        export_quality: parsed.export_quality === '2160px' ? '2160px' : cur.export_quality,
        language: parsed.language === 'en-US' || parsed.language === 'es-ES' ? parsed.language : cur.language,
      }));
    } catch { /* ignore */ }
  }, [preferenceStorageKey]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const setKeyDraft = (service: ServiceId, patch: Partial<KeyDraft>) => {
    setKeyDrafts((cur) => ({ ...cur, [service]: { ...cur[service], ...patch } }));
  };

  const addKey = async (service: ServiceId) => {
    if (!workspace?.id) return;
    const draft = keyDrafts[service];
    if (!draft.label.trim() || !draft.key_value.trim()) {
      toast.error('Preencha o label e a chave antes de adicionar');
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('api-key-secure-upsert', {
        body: {
          workspace_id: workspace.id,
          service,
          label: draft.label.trim(),
          key_value: draft.key_value.trim(),
        },
      });
      if (error) throw error;
      setApiKeys((cur) => [...cur, data as ApiKeyRecord]);
      setKeyDrafts((cur) => ({ ...cur, [service]: { label: '', key_value: '' } }));
      toast.success(`Chave ${service} adicionada`);
    } catch (error) {
      toast.error('Erro ao salvar a chave');
      console.error(error);
    }
  };

  const deleteKey = async (id: string) => {
    if (!workspace?.id) return;
    try {
      const { error } = await supabase.functions.invoke('api-key-secure-delete', {
        body: { workspace_id: workspace.id, key_id: id },
      });
      if (error) throw error;
      setApiKeys((cur) => cur.filter((k) => k.id !== id));
      toast.success('Chave removida');
    } catch {
      toast.error('Erro ao remover a chave');
    }
  };

  const toggleKey = async (id: string, nextValue: boolean) => {
    const { error } = await fromTable('workspace_api_keys').update({ is_active: nextValue }).eq('id', id);
    if (error) { toast.error('Nao foi possivel atualizar a chave'); return; }
    setApiKeys((cur) => cur.map((k) => (k.id === id ? { ...k, is_active: nextValue } : k)));
  };

  const addFeed = async () => {
    if (!workspace?.id || !newFeed.url.trim()) { toast.error('URL do feed e obrigatoria'); return; }
    const { data, error } = await fromTable('rss_sources')
      .insert({ workspace_id: workspace.id, name: newFeed.name.trim() || null, url: newFeed.url.trim(), category: newFeed.category })
      .select().single();
    if (error) { toast.error('Erro ao salvar o feed'); return; }
    setRssFeeds((cur) => [...cur, data as RssFeedRecord]);
    setNewFeed({ name: '', url: '', category: 'Tecnologia' });
    toast.success('Feed RSS adicionado');
  };

  const deleteFeed = async (id: string) => {
    const { error } = await fromTable('rss_sources').delete().eq('id', id);
    if (error) { toast.error('Erro ao remover o feed'); return; }
    setRssFeeds((cur) => cur.filter((f) => f.id !== id));
    toast.success('Feed removido');
  };

  const toggleFeed = async (id: string, nextValue: boolean) => {
    const { error } = await fromTable('rss_sources').update({ is_active: nextValue }).eq('id', id);
    if (error) { toast.error('Nao foi possivel atualizar o feed'); return; }
    setRssFeeds((cur) => cur.map((f) => (f.id === id ? { ...f, is_active: nextValue } : f)));
  };

  const savePreferences = () => {
    localStorage.setItem(preferenceStorageKey, JSON.stringify(preferences));
    toast.success('Preferencias salvas neste navegador');
  };

  const stats = useMemo(() => ({
    keys: apiKeys.length,
    activeKeys: apiKeys.filter((k) => k.is_active).length,
    feeds: rssFeeds.length,
  }), [apiKeys, rssFeeds]);

  const feedSuggestions = [
    { name: 'G1 Tecnologia',    url: 'https://g1.globo.com/rss/g1/tecnologia/' },
    { name: 'Exame',            url: 'https://exame.com/feed/' },
    { name: 'Forbes Brasil',    url: 'https://forbes.com.br/feed/' },
    { name: 'MIT Technology',   url: 'https://www.technologyreview.com/topnews.rss' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page-layout">
      <div className="page-content no-scrollbar">
        <div className="page-inner space-y-6 py-6">
          <PageHeader
            eyebrow="Configuracoes"
            title="Providers, feeds e preferencias do workspace"
            description="Concentre credenciais, fontes RSS e defaults operacionais em um unico painel limpo."
          />

          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Chaves cadastradas" value={stats.keys}       icon={Key}      />
            <MetricCard label="Chaves ativas"       value={stats.activeKeys} icon={Settings} />
            <MetricCard label="Feeds RSS"           value={stats.feeds}      icon={Rss}      />
          </section>

          <Tabs value={activeTab} onValueChange={(v) => setSearchParams(v === 'keys' ? {} : { tab: v })} className="space-y-6">
            <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-2">
              <TabsTrigger value="keys"        className="rounded-xl px-4 py-2 data-[state=active]:bg-[var(--surface-2)]"><Key     size={14} className="mr-2" />Chaves de API</TabsTrigger>
              <TabsTrigger value="rss"         className="rounded-xl px-4 py-2 data-[state=active]:bg-[var(--surface-2)]"><Rss     size={14} className="mr-2" />Feeds RSS</TabsTrigger>
              <TabsTrigger value="preferences" className="rounded-xl px-4 py-2 data-[state=active]:bg-[var(--surface-2)]"><Settings size={14} className="mr-2" />Preferencias</TabsTrigger>
            </TabsList>

            {/* ── CHAVES DE API ─────────────────────────────────────────── */}
            <TabsContent value="keys" className="space-y-4">
              {SERVICES.map((svc) => {
                const svcKeys = apiKeys.filter((k) => k.service === svc.id);
                const draft = keyDrafts[svc.id];
                return (
                  <SectionCard key={svc.id} className="space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <AppSectionLabel>{svc.name}</AppSectionLabel>
                        <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{svc.description}</h2>
                        <p className="mt-2 max-w-[720px] text-sm leading-6 text-[var(--text-secondary)]">{svc.helper}</p>
                      </div>
                      <a href={svc.link} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[var(--workspace-brand)]">
                        Como obter chave
                      </a>
                    </div>

                    {svcKeys.length > 0 ? (
                      <div className="space-y-3">
                        {svcKeys.map((key) => (
                          <div key={key.id} className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 md:flex-row md:items-center">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-[var(--text-primary)]">{key.label || `${svc.name} key`}</p>
                                <SubtleBadge variant={key.is_active ? 'brand' : 'outline'}>{key.is_active ? 'Ativa' : 'Pausada'}</SubtleBadge>
                              </div>
                              <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">••••••••••••••••••••</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <Button variant="ghost" size="icon" onClick={() => toggleKey(key.id, !key.is_active)}><Settings size={16} /></Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteKey(key.id)}><Trash2 size={16} className="text-red-600" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-2)] px-4 py-4 text-sm text-[var(--text-secondary)]">
                        Nenhuma chave configurada para {svc.name}.
                      </div>
                    )}

                    <div className="grid gap-3 xl:grid-cols-[1fr_1.4fr_160px]">
                      <Input value={draft.label}     onChange={(e) => setKeyDraft(svc.id, { label:     e.target.value })} placeholder="Label (ex: chave-prod)" className="h-11 rounded-xl bg-[var(--surface-2)]" />
                      <Input value={draft.key_value} onChange={(e) => setKeyDraft(svc.id, { key_value: e.target.value })} type="password" placeholder="API key" className="h-11 rounded-xl bg-[var(--surface-2)]" />
                      <Button onClick={() => addKey(svc.id)} className="h-11 rounded-xl"><Plus size={14} />Adicionar</Button>
                    </div>
                  </SectionCard>
                );
              })}
            </TabsContent>

            {/* ── FEEDS RSS ─────────────────────────────────────────────── */}
            <TabsContent value="rss" className="space-y-4">
              <SectionCard className="space-y-4">
                <AppSectionLabel>Sugestoes populares</AppSectionLabel>
                <div className="flex flex-wrap gap-2">
                  {feedSuggestions.map((feed) => (
                    <button key={feed.name} onClick={() => setNewFeed({ name: feed.name, url: feed.url, category: 'Tecnologia' })}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-card)]">
                      + {feed.name}
                    </button>
                  ))}
                </div>
              </SectionCard>

              <SectionCard className="space-y-4">
                <AppSectionLabel>Novo feed</AppSectionLabel>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input value={newFeed.name} onChange={(e) => setNewFeed((c) => ({ ...c, name: e.target.value }))} placeholder="Nome do feed" className="h-11 rounded-xl bg-[var(--surface-2)]" />
                  <select value={newFeed.category} onChange={(e) => setNewFeed((c) => ({ ...c, category: e.target.value }))}
                    className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-primary)]">
                    {RSS_CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-3 md:flex-row">
                  <Input value={newFeed.url} onChange={(e) => setNewFeed((c) => ({ ...c, url: e.target.value }))} placeholder="URL do feed RSS" className="h-11 rounded-xl bg-[var(--surface-2)]" />
                  <Button onClick={addFeed} className="h-11 rounded-xl px-5"><Plus size={14} />Adicionar</Button>
                </div>
              </SectionCard>

              <SectionCard className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <AppSectionLabel>Feeds ativos</AppSectionLabel>
                  <SubtleBadge>{rssFeeds.length} fontes</SubtleBadge>
                </div>
                {rssFeeds.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-2)] px-4 py-4 text-sm text-[var(--text-secondary)]">
                    Nenhum feed cadastrado ainda.
                  </div>
                ) : rssFeeds.map((feed) => (
                  <div key={feed.id} className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 md:flex-row md:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{feed.name || feed.url}</p>
                        <SubtleBadge variant={feed.is_active ? 'brand' : 'outline'}>{feed.is_active ? 'Ativo' : 'Pausado'}</SubtleBadge>
                        <SubtleBadge variant="outline">{feed.category || 'Geral'}</SubtleBadge>
                      </div>
                      <p className="mt-2 truncate text-xs text-[var(--text-muted)]">{feed.url}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => toggleFeed(feed.id, !feed.is_active)}><Settings size={16} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteFeed(feed.id)}><Trash2 size={16} className="text-red-600" /></Button>
                    </div>
                  </div>
                ))}
              </SectionCard>
            </TabsContent>

            {/* ── PREFERÊNCIAS ──────────────────────────────────────────── */}
            <TabsContent value="preferences" className="space-y-4">
              <SectionCard className="space-y-5">
                <div>
                  <AppSectionLabel>Defaults locais</AppSectionLabel>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Preferencias de geracao</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Esses defaults ficam salvos no navegador atual.</p>
                </div>
                <div className="grid gap-5">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">Modelo preferido para textos</span>
                    <select value={preferences.preferred_model} onChange={(e) => setPreferences((c) => ({ ...c, preferred_model: e.target.value }))}
                      className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-primary)]">
                      {MODEL_OPTIONS.map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">Qualidade de exportacao</span>
                    <div className="flex flex-wrap gap-2">
                      {(['1080px', '2160px'] as const).map((opt) => (
                        <button key={opt} onClick={() => setPreferences((c) => ({ ...c, export_quality: opt }))}
                          className="rounded-lg border px-3 py-2 text-sm transition-colors"
                          style={{ background: preferences.export_quality === opt ? 'var(--workspace-brand-soft)' : 'var(--surface-2)', borderColor: preferences.export_quality === opt ? 'var(--workspace-brand-border)' : 'var(--border)', color: preferences.export_quality === opt ? 'var(--workspace-brand)' : 'var(--text-secondary)' }}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">Idioma padrao</span>
                    <select value={preferences.language} onChange={(e) => setPreferences((c) => ({ ...c, language: e.target.value as GenerationPreferences['language'] }))}
                      className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-primary)]">
                      <option value="pt-BR">Portugues BR</option>
                      <option value="en-US">English</option>
                      <option value="es-ES">Espanol</option>
                    </select>
                  </label>
                </div>
                <div className="flex justify-end">
                  <Button onClick={savePreferences} className="rounded-xl px-5">Salvar preferencias</Button>
                </div>
              </SectionCard>
            </TabsContent>
          </Tabs>

          {isLoading && <div className="text-sm text-[var(--text-secondary)]">Carregando configuracoes...</div>}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
