import { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, Key, Plus, Rss, Settings, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';

type ProviderId = 'groq' | 'openrouter' | 'gemini' | 'firecrawl' | 'steel';

interface ApiKeyRecord {
  id: string;
  provider: ProviderId;
  alias: string | null;
  key_value: string;
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
    description: 'Llama 3.3 70B e Mixtral gratuitos.',
    link: 'https://console.groq.com',
    helper: 'Use para geracao de texto com alta velocidade.',
    defaultLimit: 14400,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Fallback gratuito para varios modelos.',
    link: 'https://openrouter.ai',
    helper: 'Bom fallback quando Groq ou Gemini baterem limite.',
    defaultLimit: 50,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    description: 'Texto e imagem com modelos gratuitos.',
    link: 'https://aistudio.google.com',
    helper: 'Usado para texto e para geracao de background.',
    defaultLimit: 1500,
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl',
    description: 'Raspagem de artigos e analise de URLs.',
    link: 'https://www.firecrawl.dev',
    helper: 'Necessario para enriquecer posts a partir de source_url.',
    defaultLimit: 500,
  },
  {
    id: 'steel',
    name: 'Steel',
    description: 'Navegador na nuvem (Puppeteer/Playwright).',
    link: 'https://steel.dev',
    helper: 'Usado para clonagem profunda de identidade visual.',
    defaultLimit: 100,
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
  daily_limit: PROVIDERS.find(item => item.id === provider)?.defaultLimit || 100,
});

const createPreferenceKey = (workspaceId?: string) =>
  workspaceId ? `postgen:generation-preferences:${workspaceId}` : 'postgen:generation-preferences';

const SettingsPage = () => {
  const { workspace } = useWorkspace();

  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [rssFeeds, setRssFeeds] = useState<RssFeedRecord[]>([]);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
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
  });

  const preferenceStorageKey = createPreferenceKey(workspace?.id);

  const inputClass = 'w-full px-3 py-2 rounded-xl text-sm outline-none transition-colors';
  const inputStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    color: 'var(--text-1)',
  } as const;

  const loadData = useCallback(async () => {
    if (!workspace?.id) return;

    setIsLoading(true);
    try {
      const [{ data: keyRows, error: keyError }, { data: feedRows, error: feedError }] = await Promise.all([
        supabase.from('api_keys').select('*').eq('workspace_id', workspace.id).order('created_at'),
        supabase.from('rss_feeds').select('*').eq('workspace_id', workspace.id).order('created_at'),
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
      setPreferences(current => ({
        preferred_model: parsed.preferred_model || current.preferred_model,
        export_quality:
          parsed.export_quality === '2160px' ? '2160px' : current.export_quality,
        language:
          parsed.language === 'en-US' || parsed.language === 'es-ES' ? parsed.language : current.language,
      }));
    } catch (error) {
      console.error(error);
    }
  }, [preferenceStorageKey]);

  const setKeyDraft = (provider: ProviderId, patch: Partial<KeyDraft>) => {
    setKeyDrafts(current => ({
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

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        workspace_id: workspace.id,
        provider,
        alias: draft.alias.trim(),
        key_value: draft.key_value.trim(),
        daily_limit: draft.daily_limit,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao salvar a chave');
      return;
    }

    setApiKeys(current => [...current, data as ApiKeyRecord]);
    setKeyDrafts(current => ({ ...current, [provider]: createDraft(provider) }));
    toast.success(`Chave ${provider} adicionada`);
  };

  const deleteKey = async (id: string) => {
    if (!confirm('Remover esta chave?')) return;

    const { error } = await supabase.from('api_keys').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao remover a chave');
      return;
    }

    setApiKeys(current => current.filter(item => item.id !== id));
    toast.success('Chave removida');
  };

  const toggleKey = async (id: string, nextValue: boolean) => {
    const { error } = await supabase.from('api_keys').update({ is_active: nextValue }).eq('id', id);
    if (error) {
      toast.error('Nao foi possivel atualizar a chave');
      return;
    }

    setApiKeys(current => current.map(item => (item.id === id ? { ...item, is_active: nextValue } : item)));
  };

  const addFeed = async () => {
    if (!workspace?.id) return;
    if (!newFeed.url.trim()) {
      toast.error('URL do feed e obrigatoria');
      return;
    }

    const { data, error } = await supabase
      .from('rss_feeds')
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

    setRssFeeds(current => [...current, data as RssFeedRecord]);
    setNewFeed({ name: '', url: '', category: 'Tecnologia' });
    toast.success('Feed RSS adicionado');
  };

  const deleteFeed = async (id: string) => {
    const { error } = await supabase.from('rss_feeds').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao remover o feed');
      return;
    }

    setRssFeeds(current => current.filter(feed => feed.id !== id));
    toast.success('Feed removido');
  };

  const toggleFeed = async (id: string, nextValue: boolean) => {
    const { error } = await supabase.from('rss_feeds').update({ is_active: nextValue }).eq('id', id);
    if (error) {
      toast.error('Nao foi possivel atualizar o feed');
      return;
    }

    setRssFeeds(current => current.map(feed => (feed.id === id ? { ...feed, is_active: nextValue } : feed)));
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

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      <div
        className="flex items-center gap-3 px-6 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}
      >
        <Settings size={20} style={{ color: 'var(--primary)' }} />
        <h1 className="text-lg font-bold font-display" style={{ color: 'var(--text-1)' }}>
          Configuracoes
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="keys">
            <TabsList
              className="mb-6"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <TabsTrigger value="keys">
                <Key size={14} className="mr-1" />
                Chaves de API
              </TabsTrigger>
              <TabsTrigger value="rss">
                <Rss size={14} className="mr-1" />
                Feeds RSS
              </TabsTrigger>
              <TabsTrigger value="preferences">
                <Settings size={14} className="mr-1" />
                Preferencias
              </TabsTrigger>
            </TabsList>

            <TabsContent value="keys" className="space-y-6">
              {PROVIDERS.map(provider => {
                const providerKeys = apiKeys.filter(item => item.provider === provider.id);
                const draft = keyDrafts[provider.id];

                return (
                  <div
                    key={provider.id}
                    className="rounded-2xl p-5 space-y-4"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-semibold font-display" style={{ color: 'var(--text-1)' }}>
                          {provider.name}
                        </h3>
                        <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                          {provider.description}
                        </p>
                        <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>
                          {provider.helper}
                        </p>
                      </div>
                      <a
                        href={provider.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs"
                        style={{ color: 'var(--primary)' }}
                      >
                        Como obter chave gratis
                      </a>
                    </div>

                    {providerKeys.length > 0 ? (
                      <div className="space-y-2">
                        {providerKeys.map(key => (
                          <div
                            key={key.id}
                            className="flex items-center gap-3 p-3 rounded-xl"
                            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate" style={{ color: 'var(--text-1)' }}>
                                {key.alias || `${provider.name} key`}
                              </p>
                              <p className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
                                {showValues[key.id]
                                  ? key.key_value
                                  : `${'*'.repeat(16)}${key.key_value.slice(-6)}`}
                              </p>
                            </div>

                            <span
                              className="text-[10px] font-mono shrink-0"
                              style={{
                                color:
                                  (key.calls_today || 0) >= (key.daily_limit || 0)
                                    ? '#EF4444'
                                    : 'var(--text-3)',
                              }}
                            >
                              {key.calls_today || 0}/{key.daily_limit || 0}
                            </span>

                            <div
                              className="w-8 h-4 rounded-full cursor-pointer transition-colors shrink-0"
                              style={{
                                background: key.is_active ? 'var(--primary)' : 'var(--bg-card)',
                                border: '1px solid var(--border)',
                              }}
                              onClick={() => toggleKey(key.id, !key.is_active)}
                            >
                              <div
                                className="w-3 h-3 rounded-full bg-white transition-transform mt-0.5"
                                style={{
                                  transform: key.is_active ? 'translateX(18px)' : 'translateX(1px)',
                                }}
                              />
                            </div>

                            <button onClick={() => setShowValues(current => ({ ...current, [key.id]: !current[key.id] }))}>
                              {showValues[key.id] ? (
                                <EyeOff size={14} style={{ color: 'var(--text-3)' }} />
                              ) : (
                                <Eye size={14} style={{ color: 'var(--text-3)' }} />
                              )}
                            </button>

                            <button onClick={() => deleteKey(key.id)}>
                              <Trash2 size={14} style={{ color: '#EF4444' }} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        className="rounded-xl px-4 py-3 text-sm"
                        style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border)', color: 'var(--text-3)' }}
                      >
                        Nenhuma chave configurada para {provider.name}.
                      </div>
                    )}

                    <div className="grid grid-cols-4 gap-2">
                      <input
                        value={draft.alias}
                        onChange={event => setKeyDraft(provider.id, { alias: event.target.value })}
                        placeholder="Alias"
                        className={inputClass}
                        style={inputStyle}
                      />
                      <input
                        type="password"
                        value={draft.key_value}
                        onChange={event => setKeyDraft(provider.id, { key_value: event.target.value })}
                        placeholder="API key"
                        className={inputClass}
                        style={inputStyle}
                      />
                      <input
                        type="number"
                        min={1}
                        value={draft.daily_limit}
                        onChange={event =>
                          setKeyDraft(provider.id, { daily_limit: Math.max(1, Number(event.target.value) || 1) })
                        }
                        placeholder="Limite diario"
                        className={inputClass}
                        style={inputStyle}
                      />
                      <button
                        onClick={() => addKey(provider.id)}
                        className="flex items-center justify-center gap-1 py-2 rounded-xl text-sm font-medium transition-all"
                        style={{ background: 'var(--primary-muted)', border: '1px solid var(--primary)', color: 'var(--primary)' }}
                      >
                        <Plus size={14} />
                        Adicionar
                      </button>
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="rss" className="space-y-4">
              <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <h3 className="font-semibold font-display mb-4" style={{ color: 'var(--text-1)' }}>
                  Sugestoes populares
                </h3>
                <div className="flex flex-wrap gap-2">
                  {feedSuggestions.map(feed => (
                    <button
                      key={feed.name}
                      onClick={() => setNewFeed({ name: feed.name, url: feed.url, category: 'Tecnologia' })}
                      className="chip text-xs"
                    >
                      + {feed.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <h3 className="font-semibold font-display" style={{ color: 'var(--text-1)' }}>
                  Adicionar feed
                </h3>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={newFeed.name}
                    onChange={event => setNewFeed(current => ({ ...current, name: event.target.value }))}
                    placeholder="Nome do feed"
                    className={inputClass}
                    style={inputStyle}
                  />
                  <select
                    value={newFeed.category}
                    onChange={event => setNewFeed(current => ({ ...current, category: event.target.value }))}
                    className={inputClass}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {RSS_CATEGORIES.map(category => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <input
                    value={newFeed.url}
                    onChange={event => setNewFeed(current => ({ ...current, url: event.target.value }))}
                    placeholder="URL do feed RSS"
                    className={`${inputClass} flex-1`}
                    style={inputStyle}
                  />
                  <button
                    onClick={addFeed}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium"
                    style={{ background: 'var(--primary)', color: 'white' }}
                  >
                    <Plus size={14} />
                    Adicionar
                  </button>
                </div>
              </div>

              {rssFeeds.length > 0 && (
                <div className="space-y-2">
                  {rssFeeds.map(feed => (
                    <div
                      key={feed.id}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                    >
                      <Rss size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>
                          {feed.name || feed.url}
                        </p>
                        <p className="text-[10px] truncate" style={{ color: 'var(--text-3)' }}>
                          {feed.url}
                        </p>
                      </div>

                      <span className="chip text-[10px]">{feed.category || 'Geral'}</span>

                      <div
                        className="w-8 h-4 rounded-full cursor-pointer transition-colors shrink-0"
                        style={{
                          background: feed.is_active ? 'var(--primary)' : 'var(--bg-card)',
                          border: '1px solid var(--border)',
                        }}
                        onClick={() => toggleFeed(feed.id, !feed.is_active)}
                      >
                        <div
                          className="w-3 h-3 rounded-full bg-white transition-transform mt-0.5"
                          style={{ transform: feed.is_active ? 'translateX(18px)' : 'translateX(1px)' }}
                        />
                      </div>

                      <button onClick={() => deleteFeed(feed.id)}>
                        <Trash2 size={14} style={{ color: '#EF4444' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="preferences" className="space-y-4">
              <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div>
                  <h3 className="font-semibold font-display" style={{ color: 'var(--text-1)' }}>
                    Preferencias de geracao
                  </h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                    Estas preferencias ficam salvas localmente neste navegador ate existir tabela dedicada no schema.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <label className="space-y-1">
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                      Modelo preferido para textos
                    </span>
                    <select
                      value={preferences.preferred_model}
                      onChange={event =>
                        setPreferences(current => ({ ...current, preferred_model: event.target.value }))
                      }
                      className={inputClass}
                      style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                      {MODEL_OPTIONS.map(model => (
                        <option key={model}>{model}</option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                      Qualidade de exportacao
                    </span>
                    <div className="flex gap-2">
                      {(['1080px', '2160px'] as const).map(option => (
                        <button
                          key={option}
                          onClick={() => setPreferences(current => ({ ...current, export_quality: option }))}
                          className="chip"
                          style={{
                            background:
                              preferences.export_quality === option ? 'var(--primary-muted)' : 'var(--bg-elevated)',
                            borderColor:
                              preferences.export_quality === option ? 'var(--primary)' : 'var(--border)',
                            color:
                              preferences.export_quality === option ? 'var(--primary)' : 'var(--text-2)',
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                      Idioma padrao
                    </span>
                    <select
                      value={preferences.language}
                      onChange={event =>
                        setPreferences(current => ({
                          ...current,
                          language: event.target.value as GenerationPreferences['language'],
                        }))
                      }
                      className={inputClass}
                      style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                      <option value="pt-BR">Portugues BR</option>
                      <option value="en-US">English</option>
                      <option value="es-ES">Espanol</option>
                    </select>
                  </label>
                </div>

                <button
                  onClick={savePreferences}
                  className="px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: 'var(--primary)', color: 'white' }}
                >
                  Salvar preferencias
                </button>
              </div>
            </TabsContent>
          </Tabs>

          {isLoading && (
            <div className="mt-4 text-sm" style={{ color: 'var(--text-3)' }}>
              Carregando configuracoes...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
