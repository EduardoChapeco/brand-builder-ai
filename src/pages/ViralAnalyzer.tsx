import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, BrainCircuit, Loader2, Search, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { summarizeViralPatterns } from '@/lib/postgenPhase2';

type ViralAnalysis = Tables<'viral_analyses'>;

const getPatternRoute = (kind: string) => (kind === 'type' ? '../carousel-builder' : '../generator');

const getPatternTemplate = (kind: string) => {
  if (kind === 'visual') return 'editorial-magazine';
  if (kind === 'type') return 'data-insight';
  if (kind === 'trigger') return 'viral-hook';
  return 'split-statement';
};

const ViralAnalyzer = () => {
  const navigate = useNavigate();
  const { workspace, briefing } = useWorkspace();

  const [activeTab, setActiveTab] = useState('profiles');
  const [profileUrl, setProfileUrl] = useState('');
  const [profileAlias, setProfileAlias] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [analyses, setAnalyses] = useState<ViralAnalysis[]>([]);
  const [suggestions, setSuggestions] = useState<
    Array<{ topic: string; hook: string; template_recommendation?: string; route?: string; arc_type?: string }>
  >([]);
  const [isAnalyzingProfile, setIsAnalyzingProfile] = useState(false);
  const [isAnalyzingManual, setIsAnalyzingManual] = useState(false);

  const loadAnalyses = useCallback(async () => {
    if (!workspace?.id) return;
    const { data, error } = await supabase
      .from('viral_analyses')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('analyzed_at', { ascending: false })
      .limit(24);

    if (error) {
      toast.error('Nao foi possivel carregar as analises virais');
      return;
    }

    setAnalyses((data || []) as ViralAnalysis[]);
  }, [workspace?.id]);

  useEffect(() => {
    loadAnalyses();
  }, [loadAnalyses]);

  const patterns = useMemo(() => summarizeViralPatterns(analyses), [analyses]);

  const derivedSuggestions = useMemo(() => {
    const source = suggestions.length > 0
      ? suggestions
      : patterns.slice(0, 5).map((pattern) => ({
          topic: pattern.title,
          hook: pattern.value,
          template_recommendation: getPatternTemplate(pattern.kind),
          route: getPatternRoute(pattern.kind),
          arc_type: pattern.kind === 'type' ? 'numbered_tips' : undefined,
        }));

    return source.slice(0, 5);
  }, [patterns, suggestions]);

  const handleAnalyze = async (payload: { source_url?: string; source_account?: string; content_sample?: string }) => {
    if (!workspace?.id) return;
    const loadingId = toast.loading('Coletando sinais virais...');

    try {
      const { data, error } = await supabase.functions.invoke('analyze-viral-content', {
        body: {
          workspace_id: workspace.id,
          ...payload,
        },
      });

      if (error) throw error;

      const functionSuggestions = Array.isArray(data?.suggestions)
        ? data.suggestions.filter((item: unknown) => typeof item === 'object' && item !== null) as Array<{
            topic: string;
            hook: string;
            template_recommendation?: string;
            route?: string;
            arc_type?: string;
          }>
        : [];

      setSuggestions(functionSuggestions);
      toast.success('Analise concluida', { id: loadingId });
      await loadAnalyses();
      setActiveTab('patterns');
    } catch (error) {
      console.error(error);
      toast.error('Nao foi possivel analisar o conteudo', { id: loadingId });
    }
  };

  const handleDelete = async (analysisId: string) => {
    const { error } = await supabase.from('viral_analyses').delete().eq('id', analysisId);
    if (error) {
      toast.error('Nao foi possivel remover a analise');
      return;
    }
    toast.success('Analise removida');
    loadAnalyses();
  };

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-8 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <p className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--text-3)' }}>
            Intelligence Layer
          </p>
          <h1 className="mt-2 text-3xl font-display font-bold" style={{ color: 'var(--text-1)' }}>
            Viral Analyzer
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: 'var(--text-2)' }}>
            Monitore perfis, extraia padroes replicaveis e transforme sinais virais em briefing acionavel para
            o gerador rapido ou para o storyboard avancado.
          </p>
        </div>

        <div className="p-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="profiles">Analisar Perfis</TabsTrigger>
              <TabsTrigger value="patterns">Padroes Descobertos</TabsTrigger>
            </TabsList>

            <TabsContent value="profiles" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
                <div className="rounded-3xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3 mb-6">
                    <Search size={18} style={{ color: 'var(--primary)' }} />
                    <div>
                      <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--text-1)' }}>
                        Adicionar perfil para analise
                      </h2>
                      <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                        Firecrawl coleta a amostra. A IA extrai hook, visual, CTA e formula dominante.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>URL do perfil</label>
                      <Input
                        value={profileUrl}
                        onChange={(event) => setProfileUrl(event.target.value)}
                        placeholder="https://instagram.com/concorrente"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Apelido</label>
                      <Input
                        value={profileAlias}
                        onChange={(event) => setProfileAlias(event.target.value)}
                        placeholder="Concorrente principal"
                      />
                    </div>
                  </div>

                  <Button
                    className="mt-6 gap-2"
                    disabled={isAnalyzingProfile || !profileUrl.trim()}
                    onClick={async () => {
                      setIsAnalyzingProfile(true);
                      await handleAnalyze({
                        source_url: profileUrl.trim(),
                        source_account: profileAlias.trim() || undefined,
                      });
                      setIsAnalyzingProfile(false);
                    }}
                    style={{ background: 'var(--primary)', color: '#fff' }}
                  >
                    {isAnalyzingProfile ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
                    {isAnalyzingProfile ? 'Analisando...' : 'Analisar perfil'}
                  </Button>
                </div>

                <div className="rounded-3xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3 mb-6">
                    <BrainCircuit size={18} style={{ color: 'var(--primary)' }} />
                    <div>
                      <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--text-1)' }}>
                        Analise manual
                      </h2>
                      <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                        Cole legenda, thread ou transcricao para extrair formula rapidamente.
                      </p>
                    </div>
                  </div>

                  <Textarea
                    value={manualContent}
                    onChange={(event) => setManualContent(event.target.value)}
                    placeholder="Cole aqui um post de alta performance..."
                    className="min-h-[180px] resize-none"
                  />

                  <Button
                    className="mt-6 gap-2"
                    disabled={isAnalyzingManual || manualContent.trim().length < 30}
                    onClick={async () => {
                      setIsAnalyzingManual(true);
                      await handleAnalyze({ content_sample: manualContent.trim() });
                      setIsAnalyzingManual(false);
                    }}
                    variant="outline"
                  >
                    {isAnalyzingManual ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {isAnalyzingManual ? 'Extraindo padrao...' : 'Extrair padrao'}
                  </Button>
                </div>
              </div>

              <div className="rounded-3xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div>
                    <h3 className="font-display text-xl font-semibold" style={{ color: 'var(--text-1)' }}>
                      Perfis e amostras analisados
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                      {analyses.length} registros ligados ao workspace {workspace?.name || ''}.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {analyses.length === 0 ? (
                    <div className="rounded-2xl p-5 text-sm" style={{ background: 'var(--bg-card)', color: 'var(--text-3)' }}>
                      Nenhuma analise ainda. Comece por um concorrente ou por um post manual.
                    </div>
                  ) : (
                    analyses.map((analysis) => (
                      <div
                        key={analysis.id}
                        className="rounded-2xl p-4"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>
                              {analysis.source_account || analysis.source_url || 'Entrada manual'}
                            </p>
                            <h4 className="mt-2 font-semibold" style={{ color: 'var(--text-1)' }}>
                              {analysis.hook_formula || 'Hook ainda nao definido'}
                            </h4>
                            <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                              {analysis.visual_style || analysis.engagement_notes || analysis.content_sample || 'Sem detalhes adicionais.'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDelete(analysis.id)}
                            className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {analysis.content_type && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>
                              {analysis.content_type}
                            </span>
                          )}
                          {analysis.emotional_trigger && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(6,182,212,0.14)', color: '#06B6D4' }}>
                              {analysis.emotional_trigger}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="patterns" className="mt-6 space-y-6">
              <div className="rounded-3xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3 mb-5">
                  <Sparkles size={18} style={{ color: 'var(--primary)' }} />
                  <div>
                    <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--text-1)' }}>
                      Padroes mais fortes do nicho
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                      Baseado em {analyses.length} analises e no cache viral do briefing.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {patterns.length === 0 ? (
                    <div className="rounded-2xl p-5 text-sm xl:col-span-2" style={{ background: 'var(--bg-card)', color: 'var(--text-3)' }}>
                      Ainda nao ha padroes suficientes. Rode pelo menos uma analise para popular este painel.
                    </div>
                  ) : (
                    patterns.map((pattern) => (
                      <div
                        key={`${pattern.kind}:${pattern.value}`}
                        className="rounded-2xl p-5"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>
                            {pattern.kind}
                          </p>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>
                            Frequencia {pattern.count}
                          </span>
                        </div>
                        <h3 className="mt-3 text-lg font-semibold" style={{ color: 'var(--text-1)' }}>{pattern.title}</h3>
                        <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-2)' }}>{pattern.example}</p>
                        <Button
                          className="mt-4"
                          variant="outline"
                          onClick={() => navigate(getPatternRoute(pattern.kind), {
                            state: {
                              topic: pattern.value,
                              recommendedTemplate: getPatternTemplate(pattern.kind),
                              arcType: pattern.kind === 'type' ? 'numbered_tips' : undefined,
                            },
                          })}
                        >
                          Usar este padrao
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--text-1)' }}>
                  Sugestoes personalizadas para {briefing?.company_name || workspace?.name || 'o workspace'}
                </h2>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-3)' }}>
                  Cada sugestao reaproveita os sinais virais e aponta um template inicial para acelerar execucao.
                </p>

                <div className="mt-5 space-y-3">
                  {derivedSuggestions.map((suggestion, index) => (
                    <div
                      key={`${suggestion.topic}-${index}`}
                      className="rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                    >
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>
                          {suggestion.route === '../carousel-builder' ? 'Carousel Builder' : 'Quick Post'}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold" style={{ color: 'var(--text-1)' }}>{suggestion.topic}</h3>
                        <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-2)' }}>{suggestion.hook}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {suggestion.template_recommendation && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>
                            {suggestion.template_recommendation}
                          </span>
                        )}
                        <Button
                          onClick={() => navigate(suggestion.route || '../generator', {
                            state: {
                              topic: suggestion.hook || suggestion.topic,
                              recommendedTemplate: suggestion.template_recommendation,
                              arcType: suggestion.arc_type,
                            },
                          })}
                          style={{ background: 'var(--primary)', color: '#fff' }}
                        >
                          Criar post
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ViralAnalyzer;
