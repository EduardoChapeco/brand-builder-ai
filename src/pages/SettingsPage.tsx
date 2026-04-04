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
import { archiveSecureApiKey, createSecureApiKey } from '@/lib/apiKeys';

type ProviderId =
  | 'groq'
  | 'openrouter'
  | 'gemini'
  | 'firecrawl'
  | 'steel'
  | 'elevenlabs'
  | 'runway'
  | 'kling'
  | 'luma'
  | 'minimax'
  | 'removebg'
  | 'replicate';

interface ApiKeyRecord {
  id: string;
  provider: ProviderId;
  alias: string | null;
  key_preview: string | null;
  calls_today: number | null;
  daily_limit: number | null;
  is_active: boolean | null;
}

interface RssFeedRecord {
  id: string;
  name: string | null;
  url: string;
  category: string | null;
  is_active: boolean | null;
}

interface KeyDraft {
  alias: string;
  key_value: string;
  daily_limit: number;
}

interface GenerationPreferences {
  preferred_model: string;
  export_quality: '1080px' | '2160px';
  language: 'pt-BR' | 'en-US' | 'es-ES';
}

const PROVIDERS: Array<{
  id: ProviderId;
  name: string;
  description: string;
  link: string;
  helper: string;
  defaultLimit: number;
}> = [
  {
    id: 'groq',
    name: 'Groq',
    description: 'Texto de alta velocidade para operacoes frequentes.',
    link: 'https://console.groq.com',
    helper: 'Ideal para geracao principal e tarefas com latencia baixa.',
    defaultLimit: 14400,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Fallback de modelos quando o provider principal falhar.',
    link: 'https://openrouter.ai',
    helper: 'Bom para redundancia entre modelos gratuitos ou alternativos.',
    defaultLimit: 50,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    description: 'Texto e imagem em um provider unificado.',
    link: 'https://aistudio.google.com',
    helper: 'Usado para composicao de conteudo e fundos gerados.',
    defaultLimit: 1500,
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl',
    description: 'Coleta de paginas e artigos estruturados.',
    link: 'https://www.firecrawl.dev',
    helper: 'Necessario para extraoes editoriais e scraping contextual.',
    defaultLimit: 500,
  },
  {
    id: 'steel',
    name: 'Steel',
    description: 'Runtime de navegador remoto para captura visual.',
    link: 'https://steel.dev',
    helper: 'Usado em Web Cloner e fluxos que exigem screenshot real.',
    defaultLimit: 100,
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    description: 'Speech-to-text para legenda e transcript do Video Studio.',
    link: 'https://elevenlabs.io',
    helper: 'Necessario para geracao real de legendas palavra a palavra.',
    defaultLimit: 600,
  },
  {
    id: 'runway',
    name: 'Runway',
    description: 'Geracao de video a partir de keyframe e prompt modular.',
    link: 'https://runwayml.com',
    helper: 'Primeira prioridade para adapters de image-to-video.',
    defaultLimit: 120,
  },
  {
    id: 'kling',
    name: 'Kling',
    description: 'Fallback image-to-video para cenas cinematograficas.',
    link: 'https://klingai.com',
    helper: 'Usado como provider alternativo de render de video IA.',
    defaultLimit: 120,
  },
  {
    id: 'luma',
    name: 'Luma',
    description: 'Render de video generativo para variacoes visuais.',
    link: 'https://lumalabs.ai',
    helper: 'Provider opcional para image-to-video.',
    defaultLimit: 120,
  },
  {
    id: 'minimax',
    name: 'Minimax',
    description: 'Fallback adicional para pipeline de video generativo.',
    link: 'https://www.minimax.io',
    helper: 'Mantem redundancia quando Runway/Kling falham.',
    defaultLimit: 120,
  },
  {
    id: 'removebg',
    name: 'Remove.bg',
    description: 'Remocao de fundo para assets e cenas compostas.',
    link: 'https://www.remove.bg/api',
    helper: 'Usado para recorte rapido de fundo no Video Studio.',
    defaultLimit: 300,
  },
  {
    id: 'replicate',
    name: 'Replicate',
    description: 'Enhancement, upscale e operadores visuais especializados.',
    link: 'https://replicate.com',
    helper: 'Necessario para pipelines de quality enhancement do Video Studio.',
    defaultLimit: 200,
  },
];

const RSS_CATEGORIES = ['Tecnologia', 'Marketing', 'Negocios', 'Geral', 'Saude', 'Educacao'];
const MODEL_OPTIONS = [
  'llama-3.3-70b-versatile',
  'mixtral-8x7b-32768',
  'meta-llama/llama-3.3-70b-instruct:free',
  'deepseek/deepseek-chat:free',
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash',
];

const createDraft = (provider: ProviderId): KeyDraft => ({
  alias: '',
  key_value: '',
  daily_limit: PROVIDERS.find((item) => item.id === provider)?.defaultLimit || 100,
});

const createPreferenceKey = (workspaceId?: string) =>
  workspaceId ? `postgen:generation-preferences:${workspaceId}` : 'postgen:generation-preferences';

const SettingsPage = () => {
  const { workspace } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();

  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [rssFeeds, setRssFeeds] = useState<RssFeedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newFeed, setNewFeed] = useState({ name: '', url: '', category: 'Tecnologia' });
  const [preferences, setPreferences] = useState<GenerationPreferences>({
    preferred_model: MODEL_OPTIONS[0],
    export_quality: '1080px',
    language: 'pt-BR',
  });
  const [keyDrafts, setKeyDrafts] = useState<Record<ProviderId, KeyDraft>>({
    groq: createDraft('groq'),
    openrouter: createDraft('openrouter'),
    gemini: createDraft('gemini'),
    firecrawl: createDraft('firecrawl'),
    steel: createDraft('steel'),
    elevenlabs: createDraft('elevenlabs'),
    runway: createDraft('runway'),
    kling: createDraft('kling'),
    luma: createDraft('luma'),
    minimax: createDraft('minimax'),
    removebg: createDraft('removebg'),
    replicate: createDraft('replicate'),
  });

  const preferenceStorageKey = createPreferenceKey(workspace?.id);
  const activeTab = searchParams.get('tab') === 'rss'
    ? 'rss'
    : searchParams.get('tab') === 'preferences'
      ? 'preferences'
      : 'keys';

  const loadData = useCallback(async () => {
    if (!workspace?.id) return;

    setIsLoading(true);
    try {
      const [{ data: keyRows, error: keyError }, { data: feedRows, error: feedError }] = await Promise.all([
        fromTable('sw_provider_keys').select('id,provider,alias,key_preview,calls_today,daily_limit,is_active').eq('workspace_id', workspace.id).is('deleted_at', null).order('created_at'),
        fromTable('sw_editorial_sources').select('id,name,url,category,is_active').eq('workspace_id', workspace.id).order('created_at'),
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const raw = localStorage.getItem(preferenceStorageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Partial<GenerationPreferences>;
      setPreferences((current) => ({
        preferred_model: parsed.preferred_model || current.preferred_model,
        export_quality: parsed.export_quality === '2160px' ? '2160px' : current.export_quality,
        language:
          parsed.language === 'en-US' || parsed.language === 'es-ES' ? parsed.language : current.language,
      }));
    } catch (error) {
      console.error(error);
    }
  }, [preferenceStorageKey]);

  const setKeyDraft = (provider: ProviderId, patch: Partial<KeyDraft>) => {
    setKeyDrafts((current) => ({
      ...current,
      [provider]: { ...current[provider], ...patch },
    }));
  };

  const addKey = async (provider: ProviderId) => {
    if (!workspace?.id) return;

    const draft = keyDrafts[provider];
    if (!draft.alias.trim() || !draft.key_value.trim()) {
      toast.error('Preencha alias e chave antes de adicionar');
      return;
    }

    try {
      const data = await createSecureApiKey({
        workspaceId: workspace.id,
        provider,
        alias: draft.alias.trim(),
        keyValue: draft.key_value.trim(),
        dailyLimit: draft.daily_limit,
      });

      setApiKeys((current) => [...current, data as ApiKeyRecord]);
      setKeyDrafts((current) => ({ ...current, [provider]: createDraft(provider) }));
      toast.success(`Chave ${provider} adicionada`);
    } catch (error) {
      toast.error('Erro ao salvar a chave');
      console.error(error);
    }
  };

  const deleteKey = async (id: string) => {
    if (!workspace?.id) return;

    try {
      await archiveSecureApiKey({ workspaceId: workspace.id, keyId: id });
      setApiKeys((current) => current.filter((item) => item.id !== id));
      toast.success('Chave removida');
    } catch (error) {
      toast.error('Erro ao remover a chave');
      console.error(error);
    }
  };

  const toggleKey = async (id: string, nextValue: boolean) => {
    const { error } = await fromTable('sw_provider_keys').update({ is_active: nextValue }).eq('id', id);
    if (error) {
      toast.error('Não foi possível atualizar a chave');
      return;
    }

    setApiKeys((current) => current.map((item) => (item.id === id ? { ...item, is_active: nextValue } : item)));
  };

  const addFeed = async () => {
    if (!workspace?.id) return;
    if (!newFeed.url.trim()) {
      toast.error('URL do feed e obrigatoria');
      return;
    }

    const { data, error } = await fromTable('sw_editorial_sources')
      .insert({
        workspace_id: workspace.id,
        name: newFeed.name.trim() || null,
        url: newFeed.url.trim(),
        category: newFeed.category,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao salvar o feed');
      return;
    }

    setRssFeeds((current) => [...current, data as RssFeedRecord]);
    setNewFeed({ name: '', url: '', category: 'Tecnologia' });
    toast.success('Feed RSS adicionado');
  };

  const deleteFeed = async (id: string) => {
    const { error } = await fromTable('sw_editorial_sources').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao remover o feed');
      return;
    }

    setRssFeeds((current) => current.filter((feed) => feed.id !== id));
    toast.success('Feed removido');
  };

  const toggleFeed = async (id: string, nextValue: boolean) => {
    const { error } = await fromTable('sw_editorial_sources').update({ is_active: nextValue }).eq('id', id);
    if (error) {
      toast.error('Não foi possível atualizar o feed');
      return;
    }

    setRssFeeds((current) => current.map((feed) => (feed.id === id ? { ...feed, is_active: nextValue } : feed)));
  };

  const savePreferences = () => {
    localStorage.setItem(preferenceStorageKey, JSON.stringify(preferences));
    toast.success('Preferencias salvas neste navegador');
  };

  const feedSuggestions = [
    { name: 'G1 Tecnologia', url: 'https://g1.globo.com/rss/g1/tecnologia/' },
    { name: 'Exame', url: 'https://exame.com/feed/' },
    { name: 'Forbes Brasil', url: 'https://forbes.com.br/feed/' },
    { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/topnews.rss' },
  ];

  const stats = useMemo(
    () => ({
      keys: apiKeys.length,
      activeKeys: apiKeys.filter((item) => item.is_active).length,
      feeds: rssFeeds.length,
    }),
    [apiKeys, rssFeeds],
  );

  const renderKeyValue = (key: ApiKeyRecord) => `••••••••••••${key.key_preview || '----'}`;

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
            <MetricCard label="Chaves cadastradas" value={stats.keys} icon={Key} />
            <MetricCard label="Chaves ativas" value={stats.activeKeys} icon={Settings} />
            <MetricCard label="Feeds RSS" value={stats.feeds} icon={Rss} />
          </section>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setSearchParams(value === 'keys' ? {} : { tab: value })}
            className="space-y-6"
          >
            <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-2">
              <TabsTrigger value="keys" className="rounded-xl px-4 py-2 data-[state=active]:bg-[var(--surface-2)]">
                <Key size={14} className="mr-2" />
                Chaves de API
              </TabsTrigger>
              <TabsTrigger value="rss" className="rounded-xl px-4 py-2 data-[state=active]:bg-[var(--surface-2)]">
                <Rss size={14} className="mr-2" />
                Feeds RSS
              </TabsTrigger>
              <TabsTrigger
                value="preferences"
                className="rounded-xl px-4 py-2 data-[state=active]:bg-[var(--surface-2)]"
              >
                <Settings size={14} className="mr-2" />
                Preferencias
              </TabsTrigger>
            </TabsList>

            <TabsContent value="keys" className="space-y-4">
              {PROVIDERS.map((provider) => {
                const providerKeys = apiKeys.filter((item) => item.provider === provider.id);
                const draft = keyDrafts[provider.id];

                return (
                  <SectionCard key={provider.id} className="space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <AppSectionLabel>{provider.name}</AppSectionLabel>
                        <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                          {provider.description}
                        </h2>
                        <p className="mt-2 max-w-[720px] text-sm leading-6 text-[var(--text-secondary)]">
                          {provider.helper}
                        </p>
                      </div>
                      <a
                        href={provider.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-[var(--workspace-brand)]"
                      >
                        Como obter chave
                      </a>
                    </div>

                    {providerKeys.length > 0 ? (
                      <div className="space-y-3">
                        {providerKeys.map((key) => (
                          <div
                            key={key.id}
                            className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 md:flex-row md:items-center"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-[var(--text-primary)]">
                                  {key.alias || `${provider.name} key`}
                                </p>
                                <SubtleBadge variant={key.is_active ? 'brand' : 'outline'}>
                                  {key.is_active ? 'Ativa' : 'Pausada'}
                                </SubtleBadge>
                              </div>
                              <p className="mt-2 break-all font-mono text-xs text-[var(--text-muted)]">
                                {renderKeyValue(key)}
                              </p>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono text-[var(--text-muted)]">
                                {key.calls_today || 0}/{key.daily_limit || 0}
                              </span>
                              <Button variant="ghost" size="icon" onClick={() => toggleKey(key.id, !key.is_active)}>
                                <Settings size={16} />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteKey(key.id)}>
                                <Trash2 size={16} className="text-red-600" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-2)] px-4 py-4 text-sm text-[var(--text-secondary)]">
                        Nenhuma chave configurada para {provider.name}.
                      </div>
                    )}

                    <div className="grid gap-3 xl:grid-cols-[1fr_1.4fr_160px_160px]">
                      <Input
                        value={draft.alias}
                        onChange={(event) => setKeyDraft(provider.id, { alias: event.target.value })}
                        placeholder="Alias"
                        className="h-11 rounded-xl bg-[var(--surface-2)]"
                      />
                      <Input
                        type="password"
                        value={draft.key_value}
                        onChange={(event) => setKeyDraft(provider.id, { key_value: event.target.value })}
                        placeholder="API key"
                        className="h-11 rounded-xl bg-[var(--surface-2)]"
                      />
                      <Input
                        type="number"
                        min={1}
                        value={draft.daily_limit}
                        onChange={(event) =>
                          setKeyDraft(provider.id, { daily_limit: Math.max(1, Number(event.target.value) || 1) })
                        }
                        placeholder="Limite diario"
                        className="h-11 rounded-xl bg-[var(--surface-2)]"
                      />
                      <Button onClick={() => addKey(provider.id)} className="h-11 rounded-xl">
                        <Plus size={14} />
                        Adicionar
                      </Button>
                    </div>
                  </SectionCard>
                );
              })}
            </TabsContent>

            <TabsContent value="rss" className="space-y-4">
              <SectionCard className="space-y-4">
                <div>
                  <AppSectionLabel>Sugestoes populares</AppSectionLabel>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                    Seeds de feed para comecar rapido
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {feedSuggestions.map((feed) => (
                    <button
                      key={feed.name}
                      onClick={() => setNewFeed({ name: feed.name, url: feed.url, category: 'Tecnologia' })}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-card)]"
                    >
                      + {feed.name}
                    </button>
                  ))}
                </div>
              </SectionCard>

              <SectionCard className="space-y-4">
                <div>
                  <AppSectionLabel>Novo feed</AppSectionLabel>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                    Adicionar fonte RSS ao workspace
                  </h2>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    value={newFeed.name}
                    onChange={(event) => setNewFeed((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Nome do feed"
                    className="h-11 rounded-xl bg-[var(--surface-2)]"
                  />
                  <select
                    value={newFeed.category}
                    onChange={(event) => setNewFeed((current) => ({ ...current, category: event.target.value }))}
                    className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-primary)]"
                  >
                    {RSS_CATEGORIES.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-3 md:flex-row">
                  <Input
                    value={newFeed.url}
                    onChange={(event) => setNewFeed((current) => ({ ...current, url: event.target.value }))}
                    placeholder="URL do feed RSS"
                    className="h-11 rounded-xl bg-[var(--surface-2)]"
                  />
                  <Button onClick={addFeed} className="h-11 rounded-xl px-5">
                    <Plus size={14} />
                    Adicionar
                  </Button>
                </div>
              </SectionCard>

              <SectionCard className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <AppSectionLabel>Feeds ativos</AppSectionLabel>
                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                      Fontes cadastradas
                    </h2>
                  </div>
                  <SubtleBadge>{rssFeeds.length} fontes</SubtleBadge>
                </div>

                {rssFeeds.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-2)] px-4 py-4 text-sm text-[var(--text-secondary)]">
                    Nenhum feed cadastrado ainda.
                  </div>
                ) : (
                  rssFeeds.map((feed) => (
                    <div
                      key={feed.id}
                      className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 md:flex-row md:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{feed.name || feed.url}</p>
                          <SubtleBadge variant={feed.is_active ? 'brand' : 'outline'}>
                            {feed.is_active ? 'Ativo' : 'Pausado'}
                          </SubtleBadge>
                          <SubtleBadge variant="outline">{feed.category || 'Geral'}</SubtleBadge>
                        </div>
                        <p className="mt-2 truncate text-xs text-[var(--text-muted)]">{feed.url}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => toggleFeed(feed.id, !feed.is_active)}>
                          <Settings size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteFeed(feed.id)}>
                          <Trash2 size={16} className="text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </SectionCard>
            </TabsContent>

            <TabsContent value="preferences" className="space-y-4">
              <SectionCard className="space-y-5">
                <div>
                  <AppSectionLabel>Defaults locais</AppSectionLabel>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                    Preferencias de geracao
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    Esses defaults ficam salvos no navegador atual ate existir tabela dedicada no schema.
                  </p>
                </div>

                <div className="grid gap-5">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">Modelo preferido para textos</span>
                    <select
                      value={preferences.preferred_model}
                      onChange={(event) =>
                        setPreferences((current) => ({ ...current, preferred_model: event.target.value }))
                      }
                      className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-primary)]"
                    >
                      {MODEL_OPTIONS.map((model) => (
                        <option key={model}>{model}</option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">Qualidade de exportacao</span>
                    <div className="flex flex-wrap gap-2">
                      {(['1080px', '2160px'] as const).map((option) => (
                        <button
                          key={option}
                          onClick={() => setPreferences((current) => ({ ...current, export_quality: option }))}
                          className="rounded-lg border px-3 py-2 text-sm transition-colors"
                          style={{
                            background:
                              preferences.export_quality === option ? 'var(--workspace-brand-soft)' : 'var(--surface-2)',
                            borderColor:
                              preferences.export_quality === option ? 'var(--workspace-brand-border)' : 'var(--border)',
                            color:
                              preferences.export_quality === option ? 'var(--workspace-brand)' : 'var(--text-secondary)',
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">Idioma padrao</span>
                    <select
                      value={preferences.language}
                      onChange={(event) =>
                        setPreferences((current) => ({
                          ...current,
                          language: event.target.value as GenerationPreferences['language'],
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-primary)]"
                    >
                      <option value="pt-BR">Portugues BR</option>
                      <option value="en-US">English</option>
                      <option value="es-ES">Espanol</option>
                    </select>
                  </label>
                </div>

                <div className="flex justify-end">
                  <Button onClick={savePreferences} className="rounded-xl px-5">
                    Salvar preferencias
                  </Button>
                </div>
              </SectionCard>
            </TabsContent>
          </Tabs>

          {isLoading ? (
            <div className="text-sm text-[var(--text-secondary)]">Carregando configuracoes...</div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
