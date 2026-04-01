import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Globe, Loader2, MonitorSmartphone, Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type LandingPage = Tables<'landing_pages'>;

const WebClonerPage = () => {
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const [url, setUrl] = useState('');
  const [landings, setLandings] = useState<LandingPage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const selectedLanding = useMemo(
    () => landings.find((landing) => landing.id === selectedId) || null,
    [landings, selectedId],
  );

  const loadLandings = useCallback(async () => {
    if (!workspace?.id) return;
    const { data, error } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })
      .limit(24);

    if (error) {
      toast.error('Nao foi possivel carregar os clones');
      return;
    }

    const rows = (data || []) as LandingPage[];
    setLandings(rows);
    if (!selectedId && rows[0]) setSelectedId(rows[0].id);
  }, [selectedId, workspace?.id]);

  useEffect(() => {
    loadLandings();
  }, [loadLandings]);

  const analyzeUrl = async () => {
    if (!workspace?.id || !url.trim()) {
      toast.error('Cole uma URL valida para analisar');
      return;
    }
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('landing-analyze-url', {
        body: {
          workspace_id: workspace.id,
          url: url.trim(),
        },
      });
      if (error) throw error;
      toast.success('Landing analisada');
      setUrl('');
      await loadLandings();
      if (data?.landing_page_id) setSelectedId(data.landing_page_id);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel analisar a URL');
    } finally {
      setAnalyzing(false);
    }
  };

  const generateClone = async (openInVibeCoder = false) => {
    if (!workspace?.id || !selectedLanding) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('landing-clone-generate', {
        body: {
          workspace_id: workspace.id,
          landing_page_id: selectedLanding.id,
          create_project: openInVibeCoder,
        },
      });
      if (error) throw error;
      toast.success(openInVibeCoder ? 'Clone enviado para o VibeCoder' : 'HTML do clone gerado');
      await loadLandings();
      if (openInVibeCoder && data?.project_id) {
        navigate('../vibe-coder', { state: { projectId: data.project_id } });
      }
    } catch (error) {
      console.error(error);
      toast.error('Nao foi possivel sintetizar a landing');
    } finally {
      setGenerating(false);
    }
  };

  const screenshots = Array.isArray(selectedLanding?.screenshots_json)
    ? selectedLanding?.screenshots_json as Array<{ device?: string; url?: string }>
    : [];
  const analysis = selectedLanding?.sections_analysis && typeof selectedLanding.sections_analysis === 'object'
    ? selectedLanding.sections_analysis as { page_objective?: string; sections?: Array<{ type?: string; headline?: string }> }
    : null;

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      <aside className="w-[360px] shrink-0 border-r overflow-y-auto no-scrollbar" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--text-3)' }}>Web Cloner</p>
          <h1 className="mt-2 text-2xl font-display font-bold" style={{ color: 'var(--text-1)' }}>Clonagem hibrida</h1>
          <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-3)' }}>
            Captura visual externa + Firecrawl + sintese modular em HTML/CSS.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://site.com/landing" />
          </div>
          <Button onClick={analyzeUrl} disabled={analyzing} className="w-full gap-2" style={{ background: 'var(--primary)', color: '#fff' }}>
            {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
            {analyzing ? 'Analisando...' : 'Analisar Pagina'}
          </Button>

          <div className="space-y-2">
            {landings.map((landing) => (
              <button
                key={landing.id}
                onClick={() => setSelectedId(landing.id)}
                className="w-full rounded-2xl p-4 text-left transition-all"
                style={{
                  background: selectedId === landing.id ? 'var(--primary-muted)' : 'var(--bg-card)',
                  border: `1px solid ${selectedId === landing.id ? 'var(--primary)' : 'var(--border)'}`,
                }}
              >
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>{landing.status || 'draft'}</p>
                <p className="mt-1 font-semibold" style={{ color: 'var(--text-1)' }}>{landing.name}</p>
                {landing.source_url && (
                  <p className="mt-2 text-xs line-clamp-2" style={{ color: 'var(--text-3)' }}>{landing.source_url}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {selectedLanding ? (
          <div className="max-w-6xl mx-auto p-8 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>Analise ativa</p>
                <h2 className="mt-2 text-3xl font-display font-bold" style={{ color: 'var(--text-1)' }}>{selectedLanding.name}</h2>
                {analysis?.page_objective && (
                  <p className="mt-3 text-sm leading-6" style={{ color: 'var(--text-2)' }}>{analysis.page_objective}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" className="gap-2" onClick={() => window.open(selectedLanding.source_url || '', '_blank')}>
                  <ExternalLink size={14} />
                  Fonte
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => generateClone(false)} disabled={generating}>
                  <Sparkles size={14} />
                  Gerar HTML
                </Button>
                <Button className="gap-2" onClick={() => generateClone(true)} disabled={generating} style={{ background: 'var(--primary)', color: '#fff' }}>
                  {generating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                  Abrir no VibeCoder
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
              <div className="glass-card rounded-3xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MonitorSmartphone size={16} style={{ color: 'var(--primary)' }} />
                  <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>Capturas</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {screenshots.length === 0 ? (
                    <div className="rounded-2xl p-4 text-sm" style={{ background: 'var(--bg-card)', color: 'var(--text-3)' }}>
                      Nenhuma captura disponivel. Sem provider visual configurado a funcao falha explicitamente.
                    </div>
                  ) : (
                    screenshots.map((shot, index) => (
                      <div key={`${shot.device}-${index}`} className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                        {shot.url ? (
                          <img src={shot.url} alt={shot.device || 'capture'} className="w-full h-64 object-cover" />
                        ) : (
                          <div className="h-64 flex items-center justify-center text-sm" style={{ color: 'var(--text-3)' }}>
                            Captura indisponivel
                          </div>
                        )}
                        <div className="p-3">
                          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>{shot.device || 'capture'}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="glass-card rounded-3xl p-6 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>Secoes detectadas</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {analysis?.sections?.map((section, index) => (
                      <span key={`${section.type}-${index}`} className="badge badge-primary">
                        {section.type || `section_${index + 1}`}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedLanding.full_html ? (
                  <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                    <iframe
                      title="Landing preview"
                      srcDoc={`<style>${selectedLanding.full_css || ''}</style>${selectedLanding.full_html}`}
                      className="w-full h-[560px] bg-white"
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl p-5 text-sm" style={{ background: 'var(--bg-card)', color: 'var(--text-3)' }}>
                    A analise ja foi persistida. Gere o HTML sintetizado para abrir o preview final.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>Nenhuma landing selecionada</p>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-3)' }}>Cole uma URL no painel lateral para iniciar a analise.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebClonerPage;
