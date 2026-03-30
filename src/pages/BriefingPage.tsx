import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Save, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

interface BriefingForm {
  company_name: string;
  segment: string;
  target_audience: string;
  main_differentials: string;
  tone_of_voice: string;
  pain_points: string;
  market_position: string;
  avoid_topics: string;
  instagram_handle: string;
  linkedin_handle: string;
  keywords: string;
}

interface CompetitorItem {
  name: string;
  url: string;
  notes: string;
}

interface CompetitorAnalysis {
  id: string;
  url: string;
  name: string | null;
  dna_text: string | null;
  raw_markdown: string | null;
  analyzed_at: string | null;
}

const EMPTY_FORM: BriefingForm = {
  company_name: '',
  segment: '',
  target_audience: '',
  main_differentials: '',
  tone_of_voice: '',
  pain_points: '',
  market_position: '',
  avoid_topics: '',
  instagram_handle: '',
  linkedin_handle: '',
  keywords: '',
};

const EMPTY_COMPETITOR: CompetitorItem = {
  name: '',
  url: '',
  notes: '',
};

const textareaStyle = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  color: 'var(--text-1)',
};
const inputStyle = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  color: 'var(--text-1)',
};
const labelStyle = { color: 'var(--text-2)' };
const fieldClass = 'w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors';

const Field = ({
  label,
  value,
  onChange,
  rows,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  rows?: number;
  placeholder?: string;
}) => (
  <div>
    <label className="block text-xs font-medium mb-1.5" style={labelStyle}>
      {label}
    </label>
    {rows ? (
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={`${fieldClass} resize-none`}
        style={textareaStyle}
      />
    ) : (
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={fieldClass}
        style={inputStyle}
      />
    )}
  </div>
);

const BriefingPage = () => {
  const navigate = useNavigate();
  const { workspace, briefing: wsBriefing, refreshBriefing } = useWorkspace();

  const [form, setForm] = useState<BriefingForm>(EMPTY_FORM);
  const [competitors, setCompetitors] = useState<CompetitorItem[]>([]);
  const [draftCompetitor, setDraftCompetitor] = useState<CompetitorItem>(EMPTY_COMPETITOR);
  const [analyses, setAnalyses] = useState<CompetitorAnalysis[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [analyzingUrl, setAnalyzingUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!wsBriefing) {
      setForm(EMPTY_FORM);
      setCompetitors([]);
      return;
    }

    setForm({
      company_name: wsBriefing.company_name || '',
      segment: wsBriefing.segment || '',
      target_audience: wsBriefing.target_audience || '',
      main_differentials: wsBriefing.main_differentials || '',
      tone_of_voice: wsBriefing.tone_of_voice || '',
      pain_points: wsBriefing.pain_points || '',
      market_position: wsBriefing.market_position || '',
      avoid_topics: wsBriefing.avoid_topics || '',
      instagram_handle: wsBriefing.instagram_handle || '',
      linkedin_handle: wsBriefing.linkedin_handle || '',
      keywords: Array.isArray(wsBriefing.keywords) ? wsBriefing.keywords.join(', ') : '',
    });

    setCompetitors(Array.isArray(wsBriefing.main_competitors) ? wsBriefing.main_competitors : []);
  }, [wsBriefing]);

  const fetchAnalyses = useCallback(async () => {
    if (!workspace?.id) return;

    const { data, error } = await supabase
      .from('competitor_analyses_v2')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('analyzed_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar analises de concorrentes');
      return;
    }

    setAnalyses((data || []) as CompetitorAnalysis[]);
  }, [workspace?.id]);

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  const setField = <K extends keyof BriefingForm>(field: K, value: BriefingForm[K]) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    if (!workspace?.id) return;

    setIsSaving(true);
    try {
      const payload = {
        workspace_id: workspace.id,
        company_name: form.company_name,
        segment: form.segment,
        target_audience: form.target_audience,
        main_differentials: form.main_differentials,
        tone_of_voice: form.tone_of_voice,
        pain_points: form.pain_points,
        market_position: form.market_position,
        avoid_topics: form.avoid_topics,
        instagram_handle: form.instagram_handle,
        linkedin_handle: form.linkedin_handle,
        keywords: form.keywords
          ? form.keywords.split(',').map(keyword => keyword.trim()).filter(Boolean)
          : [],
        main_competitors: competitors as unknown as Json,
        updated_at: new Date().toISOString(),
      };

      if (wsBriefing) {
        await supabase.from('briefings').update(payload).eq('workspace_id', workspace.id);
      } else {
        await supabase.from('briefings').insert(payload);
      }

      await refreshBriefing();
      toast.success('Briefing salvo');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar briefing');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCompetitor = () => {
    if (!draftCompetitor.url.trim()) {
      toast.error('Informe a URL do concorrente');
      return;
    }

    setCompetitors(current => [
      ...current,
      {
        name: draftCompetitor.name.trim(),
        url: draftCompetitor.url.trim(),
        notes: draftCompetitor.notes.trim(),
      },
    ]);
    setDraftCompetitor(EMPTY_COMPETITOR);
  };

  const handleRemoveCompetitor = (url: string) => {
    setCompetitors(current => current.filter(item => item.url !== url));
  };

  const handleAnalyzeCompetitor = async (competitor: CompetitorItem) => {
    if (!workspace?.id) return;

    setAnalyzingUrl(competitor.url);
    try {
      const { error } = await supabase.functions.invoke('analyze-url', {
        body: {
          workspace_id: workspace.id,
          url: competitor.url,
          name: competitor.name || null,
          notes: competitor.notes || null,
        },
      });

      if (error) throw error;

      await Promise.all([fetchAnalyses(), refreshBriefing()]);
      toast.success('Concorrente analisado');
      const errMessage = error instanceof Error ? error.message : String(error);
      const isMissingKeys = errMessage.toLowerCase().includes('chave') || errMessage.toLowerCase().includes('key');
      toast.error(isMissingKeys ? 'Erro: Configure suas APIs (Firecrawl / LLM) em Settings.' : 'Erro ao analisar concorrente.');
    } finally {
      setAnalyzingUrl(null);
    }
  };

  const getAnalysisByUrl = (url: string) => analyses.find(item => item.url === url);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      <div
        className="flex items-center gap-3 px-6 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}
      >
        <FileText size={20} style={{ color: 'var(--primary)' }} />
        <h1 className="text-lg font-bold font-display" style={{ color: 'var(--text-1)' }}>
          Briefing
        </h1>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}
        >
          Base de conhecimento da IA
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6">
          <Accordion type="multiple" defaultValue={['empresa', 'publico', 'concorrentes']} className="space-y-3">
            <AccordionItem value="empresa" className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <AccordionTrigger className="px-5 py-4 font-semibold font-display hover:no-underline" style={{ color: 'var(--text-1)' }}>
                Empresa
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nome da empresa" value={form.company_name} onChange={v => setField('company_name', v)} placeholder="Studio Criativo" />
                  <Field label="Segmento / nicho" value={form.segment} onChange={v => setField('segment', v)} placeholder="Marketing Digital" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Instagram" value={form.instagram_handle} onChange={v => setField('instagram_handle', v)} placeholder="@suaempresa" />
                  <Field label="LinkedIn" value={form.linkedin_handle} onChange={v => setField('linkedin_handle', v)} placeholder="sua-empresa" />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="publico" className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <AccordionTrigger className="px-5 py-4 font-semibold font-display hover:no-underline" style={{ color: 'var(--text-1)' }}>
                Publico-alvo
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 space-y-4">
                <Field label="Quem e seu publico?" value={form.target_audience} onChange={v => setField('target_audience', v)} rows={3} placeholder="Ex: empreendedores, donos de pequenas empresas..." />
                <Field label="Principais dores" value={form.pain_points} onChange={v => setField('pain_points', v)} rows={3} placeholder="O que trava a decisao de compra?" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="posicionamento" className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <AccordionTrigger className="px-5 py-4 font-semibold font-display hover:no-underline" style={{ color: 'var(--text-1)' }}>
                Posicionamento
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 space-y-4">
                <Field label="Principais diferenciais" value={form.main_differentials} onChange={v => setField('main_differentials', v)} rows={3} placeholder="O que te diferencia da concorrencia?" />
                <Field label="Posicao no mercado" value={form.market_position} onChange={v => setField('market_position', v)} placeholder="Lider em X, desafiante em Y..." />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tom" className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <AccordionTrigger className="px-5 py-4 font-semibold font-display hover:no-underline" style={{ color: 'var(--text-1)' }}>
                Tom e voz
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 space-y-4">
                <Field label="Tom de voz" value={form.tone_of_voice} onChange={v => setField('tone_of_voice', v)} rows={2} placeholder="Direto, didatico, sem jargoes..." />
                <Field label="Temas para evitar" value={form.avoid_topics} onChange={v => setField('avoid_topics', v)} rows={2} placeholder="Nao mencionar X, evitar Y..." />
                <Field label="Palavras-chave" value={form.keywords} onChange={v => setField('keywords', v)} placeholder="produtividade, IA, automacao..." />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="concorrentes" className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <AccordionTrigger className="px-5 py-4 font-semibold font-display hover:no-underline" style={{ color: 'var(--text-1)' }}>
                Concorrentes e inspiracoes
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <input
                    value={draftCompetitor.name}
                    onChange={event => setDraftCompetitor(current => ({ ...current, name: event.target.value }))}
                    placeholder="Nome"
                    className={fieldClass}
                    style={inputStyle}
                  />
                  <input
                    value={draftCompetitor.url}
                    onChange={event => setDraftCompetitor(current => ({ ...current, url: event.target.value }))}
                    placeholder="https://site.com"
                    className={fieldClass}
                    style={inputStyle}
                  />
                  <div className="flex gap-2">
                    <input
                      value={draftCompetitor.notes}
                      onChange={event => setDraftCompetitor(current => ({ ...current, notes: event.target.value }))}
                      placeholder="Notas"
                      className={`${fieldClass} flex-1`}
                      style={inputStyle}
                    />
                    <button
                      onClick={handleAddCompetitor}
                      className="px-3 rounded-xl text-sm font-medium"
                      style={{ background: 'var(--primary)', color: 'white' }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {competitors.length === 0 ? (
                  <div
                    className="rounded-xl px-4 py-3 text-sm"
                    style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border)', color: 'var(--text-3)' }}
                  >
                    Adicione concorrentes para gerar DNA de comunicacao e referencias.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {competitors.map(competitor => {
                      const analysis = getAnalysisByUrl(competitor.url);
                      const isAnalyzing = analyzingUrl === competitor.url;

                      return (
                        <div
                          key={competitor.url}
                          className="rounded-xl p-4 space-y-3"
                          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>
                                {competitor.name || competitor.url}
                              </p>
                              <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>
                                {competitor.url}
                              </p>
                              {competitor.notes && (
                                <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>
                                  {competitor.notes}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className="text-[10px] px-2 py-0.5 rounded-full"
                                style={{
                                  background: analysis ? '#10B98120' : '#47556920',
                                  color: analysis ? '#10B981' : '#94A3B8',
                                }}
                              >
                                {analysis ? 'Analisado' : 'Pendente'}
                              </span>
                              <button
                                onClick={() => handleAnalyzeCompetitor(competitor)}
                                disabled={isAnalyzing}
                                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium disabled:opacity-60"
                                style={{ background: 'var(--primary-muted)', border: '1px solid var(--primary)', color: 'var(--primary)' }}
                              >
                                {isAnalyzing ? <Sparkles size={12} className="animate-spin" /> : <Search size={12} />}
                                {isAnalyzing ? 'Analisando...' : 'Analisar'}
                              </button>
                              <button
                                onClick={() => handleRemoveCompetitor(competitor.url)}
                                className="px-3 py-2 rounded-xl text-xs font-medium"
                                style={{ background: 'var(--bg-app)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
                              >
                                Remover
                              </button>
                            </div>
                          </div>

                          {analysis?.dna_text && (
                            <div
                              className="rounded-xl p-3 text-xs whitespace-pre-wrap"
                              style={{ background: 'var(--bg-app)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
                            >
                              {analysis.dna_text}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="dna" className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <AccordionTrigger className="px-5 py-4 font-semibold font-display hover:no-underline" style={{ color: 'var(--text-1)' }}>
                DNA da marca
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 space-y-4">
                <div
                  className="rounded-xl p-4 text-sm whitespace-pre-wrap"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-2)', minHeight: 180 }}
                >
                  {wsBriefing?.brand_dna || 'Analise concorrentes para gerar um DNA consolidado da marca.'}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="rss" className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <AccordionTrigger className="px-5 py-4 font-semibold font-display hover:no-underline" style={{ color: 'var(--text-1)' }}>
                Feeds RSS
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5">
                <div
                  className="rounded-xl p-4 flex items-center justify-between gap-4"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                      Gerencie seus feeds na pagina de configuracoes.
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                      O gerador usa esses feeds para sugerir topicos recentes sem custo de IA.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('../settings')}
                    className="px-3 py-2 rounded-xl text-xs font-medium"
                    style={{ background: 'var(--primary)', color: 'white' }}
                  >
                    Ir para Settings
                  </button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-6">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
              style={{ background: 'var(--primary)', color: 'white', boxShadow: '0 8px 24px rgba(124,58,237,0.25)' }}
            >
              <Save size={15} />
              {isSaving ? 'Salvando...' : 'Salvar briefing'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BriefingPage;
