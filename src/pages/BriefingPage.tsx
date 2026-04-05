import { useEffect, useState } from 'react';
import { Target, Wand2, Save, BrainCircuit, Users, Trash2, RefreshCw, CheckCircle2, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { fromTable } from '@/integrations/supabase/db-custom';
import { supabase } from '@/integrations/supabase/client';
import { SwButton, SwCard, SwInput, SwTextarea } from '@/components/shared/SwComponents';
import type { BriefingFormFlat } from '@/types/app.types';

// ── Helpers de serialização JSONB ←→ Form ───────────────────

const EMPTY_FORM: BriefingFormFlat = {
  company_name: '',
  tagline: '',
  segment: '',
  brand_dna: '',
  value_proposition: '',
  main_differentials: '',
  target_audience: '',
  audience_age_range: '',
  brand_personality: '',
  tone_of_voice: '',
  avoid_topics: '',
  content_pillars: [],
  keywords: [],
  completeness_score: 0,
};

/** Converte o registro JSONB do banco para o formulário plano da UI */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToForm(b: Record<string, any>): BriefingFormFlat {
  const company  = b.company  || {};
  const audience = b.audience || {};
  const content  = b.content  || {};

  return {
    ...EMPTY_FORM,
    // company
    company_name:       company.name             || '',
    tagline:            company.tagline          || '',
    segment:            company.segment          || '',
    brand_dna:          company.brand_dna        || '',
    value_proposition:  company.value_proposition || content.value_proposition || '',
    main_differentials: company.differentials    || '',
    // audience
    target_audience:    audience.description     || '',
    audience_age_range: audience.age_range       || '',
    brand_personality:  audience.personality     || '',
    // content
    tone_of_voice:  content.tone_of_voice  || '',
    avoid_topics:   content.avoid_topics   || '',
    content_pillars: Array.isArray(content.pillars) ? content.pillars : [],
    keywords:        Array.isArray(content.keywords) ? content.keywords : [],
    // score
    completeness_score: b.completeness_score || 0,
  };
}

/** Converte o formulário plano da UI para a estrutura JSONB do banco */
function formToDb(f: BriefingFormFlat, workspaceId: string, score: number) {
  return {
    workspace_id: workspaceId,
    company: {
      name:               f.company_name,
      tagline:            f.tagline,
      segment:            f.segment,
      brand_dna:          f.brand_dna,
      differentials:      f.main_differentials,
      value_proposition:  f.value_proposition,
    },
    audience: {
      description:  f.target_audience,
      age_range:    f.audience_age_range,
      personality:  f.brand_personality,
    },
    market: {},   // Preenchido futuramente via análise de concorrentes
    content: {
      tone_of_voice:     f.tone_of_voice,
      avoid_topics:      f.avoid_topics,
      pillars:           f.content_pillars,
      keywords:          f.keywords,
      value_proposition: f.value_proposition,
    },
    channels: [],  // Preenchido futuramente via módulo de canais
    completeness_score: score,
    updated_at: new Date().toISOString(),
  };
}

// ── Score de completude ──────────────────────────────────────
function calculateCompleteness(f: BriefingFormFlat): number {
  let score = 0;
  if (f.company_name?.trim())       score += 10;
  if (f.segment?.trim())            score += 10;
  if (f.target_audience?.trim())    score += 15;
  if (f.brand_personality?.trim())  score += 10;
  if (f.main_differentials?.trim()) score += 10;
  if (f.value_proposition?.trim())  score += 15;
  if (f.content_pillars?.length >= 3) score += 15;
  if (f.keywords?.length >= 5)      score += 15;
  return Math.min(score, 100);
}

// ===================================
// COMPONENTE PRINCIPAL
// ===================================
export default function BriefingPage() {
  const { workspace, briefing: wsBriefing, refetch } = useWorkspace();
  const [form, setForm] = useState<BriefingFormFlat>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Deserializa JSONB do banco → form plano da UI
  useEffect(() => {
    if (!wsBriefing) { setForm(EMPTY_FORM); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setForm(dbToForm(wsBriefing as unknown as Record<string, any>));
  }, [wsBriefing]);

  const updateForm = (updates: Partial<BriefingFormFlat>) => {
    const next = { ...form, ...updates };
    next.completeness_score = calculateCompleteness(next);
    setForm(next);
  };

  const handleSave = async (f = form) => {
    if (!workspace?.id) return;
    setIsSaving(true);
    try {
      const score = calculateCompleteness(f);
      // Serializa form plano → estrutura JSONB do banco
      const payload = formToDb(f, workspace.id, score);

      if (wsBriefing) {
        const { error } = await fromTable('briefings')
          .update(payload)
          .eq('workspace_id', workspace.id);
        if (error) throw error;
      } else {
        const { error } = await fromTable('briefings').insert(payload);
        if (error) throw error;
      }

      setForm(prev => ({ ...prev, completeness_score: score }));
      await refetch();
      toast.success('DNA Estratégico salvo com sucesso!');
    } catch (error) {
      console.error('[BriefingPage] handleSave error:', error);
      toast.error('Briefing falhou na atualização.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAIMagic = async () => {
    if (!workspace?.id) return;
    toast.info('IA Estrategista em ação...', { description: 'A Inteligência Simwork está redigindo seu DNA.' });
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("sw-briefing-generate", {
        body: {
          workspace_id: workspace.id,
          form_data: {
            company_name:       form.company_name,
            segment:            form.segment,
            target_audience:    form.target_audience,
            main_differentials: form.main_differentials,
          }
        }
      });

      if (error) throw error;
      
      const aiResponse = data?.data;
      if (aiResponse) {
        toast.info('Construindo interface...', { description: 'Aplicando novas estratégias na tela.' });
        
        const nextForm: BriefingFormFlat = {
          ...form,
          brand_dna:          aiResponse.brand_dna          || form.brand_dna,
          tone_of_voice:      aiResponse.tone_of_voice      || form.tone_of_voice,
          main_differentials: aiResponse.main_differentials || form.main_differentials,
          value_proposition:  aiResponse.value_proposition  || form.value_proposition,
          content_pillars: Array.isArray(aiResponse.content_pillars) 
            ? aiResponse.content_pillars 
            : form.content_pillars,
          keywords: Array.isArray(aiResponse.keywords)
            ? aiResponse.keywords
            : form.keywords,
        };
        
        updateForm(nextForm);
        await handleSave(nextForm);
        toast.success('Briefing Genial gerado com sucesso!');
      } else {
        throw new Error('Retorno vazio da Inteligência Artificial');
      }
    } catch (e) {
      console.error('[BriefingPage] handleAIMagic error:', e);
      toast.error('Falha ao conectar com o estúdio de IA.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePillarChange = (index: number, val: string) => {
    const next = [...form.content_pillars];
    next[index] = val;
    updateForm({ content_pillars: next });
  };
  
  const addPillar    = () => updateForm({ content_pillars: [...form.content_pillars, ''] });
  const removePillar = (i: number) => updateForm({ content_pillars: form.content_pillars.filter((_, idx) => idx !== i) });

  const handleKeywordChange = (index: number, val: string) => {
    const next = [...form.keywords];
    next[index] = val;
    updateForm({ keywords: next });
  };

  const addKeyword    = () => updateForm({ keywords: [...form.keywords, ''] });
  const removeKeyword = (i: number) => updateForm({ keywords: form.keywords.filter((_, idx) => idx !== i) });

  const score = calculateCompleteness(form);
  const scoreColor = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex h-full bg-[var(--surface-app)] text-[var(--text-primary)] overflow-hidden">
      {/* 
        ========================================
        COLUNA 1: EDITOR (Estratégia)
        ========================================
      */}
      <div className="flex-1 overflow-y-auto no-scrollbar border-r border-[#1f1f1f]">
        
        {/* Header Premium */}
        <div className="sticky top-0 z-20 backdrop-blur-3xl bg-[var(--surface-app)]/60 border-b border-[var(--border)] p-6 lg:p-8 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-2 opacity-70">
              <BrainCircuit size={16} className="text-[#a855f7]" /> <span className="text-xs font-semibold tracking-widest uppercase">Estratégia Engine</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white to-[#a8a8a8] bg-clip-text text-transparent">
              Brand Briefing
            </h1>
            {wsBriefing && (
              <p className="text-xs text-stone-500 mt-1 font-mono">
                Última sync: {new Date(wsBriefing.updated_at || '').toLocaleString('pt-BR')}
              </p>
            )}
          </div>
          <div className="flex gap-4">
            <SwButton variant="ghost" onClick={handleAIMagic} disabled={isGenerating}>
              {isGenerating ? <RefreshCw size={16} className="animate-spin" /> : <Wand2 size={16} className="text-[var(--sw-accent)]" />}
              {isGenerating ? 'Gerando...' : 'Gerar com IA'}
            </SwButton>
            <SwButton variant="primary" onClick={() => handleSave()} disabled={isSaving}>
              <Save size={16} />
              {isSaving ? 'Salvando...' : 'Salvar Briefing'}
            </SwButton>
          </div>
        </div>

        {/* Score de completude */}
        <div className="px-6 lg:px-8 pt-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-mono text-stone-500 uppercase tracking-widest">Completude do DNA</p>
            <p className="text-sm font-bold" style={{ color: scoreColor }}>{score}%</p>
          </div>
          <div className="h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${score}%`, background: `linear-gradient(to right, ${scoreColor}88, ${scoreColor})` }}
            />
          </div>
        </div>

        {/* Formulário */}
        <div className="p-6 lg:p-8 space-y-8 max-w-4xl">

          {/* Identidade da empresa */}
          <Section glass title="Identidade da Empresa" desc="Informações fundamentais sobre a marca.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nome da empresa *" val={form.company_name} set={(v) => updateForm({company_name:v})} placeholder="Simwork, Nubank, Apple..." />
              <Field label="Segmento / Nicho *" val={form.segment} set={(v) => updateForm({segment:v})} placeholder="SaaS, Varejo, Moda, Saúde..." />
              <Field label="Tagline" val={form.tagline} set={(v) => updateForm({tagline:v})} placeholder="Think different. Just do it. Etc." />
              <Field label="Proposta de Valor *" val={form.value_proposition} set={(v) => updateForm({value_proposition:v})} placeholder="O que você entrega de único?" />
            </div>
            <div className="mt-4">
              <FieldArea label="DNA da Marca (Brand DNA)" val={form.brand_dna} set={(v) => updateForm({brand_dna:v})} placeholder="Descreva a essência e personalidade da marca em um parágrafo profundo..." />
            </div>
            <div className="mt-4">
              <FieldArea label="Diferenciais Competitivos *" val={form.main_differentials} set={(v) => updateForm({main_differentials:v})} placeholder="O que te faz único contra a concorrência?" />
            </div>
          </Section>

          {/* Audiência */}
          <Section glass title="Audiência e Persona" desc="Defina para quem você cria.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Faixa etária" val={form.audience_age_range} set={(v) => updateForm({audience_age_range:v})} placeholder="25-40 anos, Millennials..." />
              <Field label="Tom de Voz" val={form.tone_of_voice} set={(v) => updateForm({tone_of_voice:v})} placeholder="Profissional, Descontraído, Inspiracional..." />
              <Field label="Personalidade da Marca" val={form.brand_personality} set={(v) => updateForm({brand_personality:v})} placeholder="Inovadora, Acolhedora, Disruptiva..." />
              <Field label="Evitar Tópicos" val={form.avoid_topics} set={(v) => updateForm({avoid_topics:v})} placeholder="Política, religião, concorrente X..." />
            </div>
            <div className="mt-4">
              <FieldArea label="Descrição do Público-Alvo *" val={form.target_audience} set={(v) => updateForm({target_audience:v})} placeholder="Quem compra? Quais dores tem? O que deseja? Onde está?" />
            </div>
          </Section>

          {/* Pilares de Conteúdo */}
          <Section glass title="Pilares de Conteúdo" desc="Temas que guiam toda a produção de conteúdo da marca.">
            <div className="space-y-3">
              {form.content_pillars.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <SwInput
                    value={p}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePillarChange(i, e.target.value)}
                    placeholder={`Pilar ${i + 1} — ex: Inovação, Sustentabilidade...`}
                    className="flex-1"
                  />
                  <button onClick={() => removePillar(i)} className="p-2 text-stone-600 hover:text-red-400 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <SwButton variant="ghost" onClick={addPillar} className="mt-4 w-full border-dashed border-[#333]">
              + Adicionar Pilar
            </SwButton>
          </Section>

          {/* Palavras-chave */}
          <Section glass title="Keywords Estratégicas" desc="Palavras-chave que aparecem em todo conteúdo gerado.">
            <div className="flex flex-wrap gap-2 mb-4">
              {form.keywords.map((k, i) => (
                <div key={i} className="flex items-center gap-2 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5">
                  <SwInput
                    value={k}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleKeywordChange(i, e.target.value)}
                    placeholder="keyword..."
                    className="bg-transparent border-0 text-xs p-0 w-24 outline-none"
                  />
                  <button onClick={() => removeKeyword(i)} className="text-stone-600 hover:text-red-400">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
            <SwButton variant="ghost" onClick={addKeyword} className="border-dashed border-[#333]">
              + Adicionar Keyword
            </SwButton>
          </Section>

        </div>
      </div>

      {/* 
        ========================================
        COLUNA 2: PAINEL LATERAL (Score & CCP)
        ========================================
      */}
      <div className="w-[320px] shrink-0 bg-[var(--surface-app)] hidden xl:flex flex-col">
        <div className="p-6 border-b border-[var(--border)]">
          <h2 className="text-sm font-bold flex gap-2 items-center text-white">
            <BarChart3 size={16} /> Radar do DNA
          </h2>
          <p className="text-xs text-stone-400 mt-1">Score em tempo real de todas as dimensões.</p>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto no-scrollbar flex-1">
          {/* Score visual */}
          <div className="relative flex items-center justify-center">
            <svg className="w-32 h-32" viewBox="0 0 36 36">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--border)" strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={scoreColor} strokeWidth="3" strokeDasharray={`${score}, 100`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.7s ease' }} />
            </svg>
            <div className="absolute text-center">
              <p className="text-3xl font-black" style={{ color: scoreColor }}>{score}</p>
              <p className="text-[10px] text-stone-500 font-mono">/ 100</p>
            </div>
          </div>

          {/* Dimensões */}
          <div className="space-y-3">
            {[
              { label: 'Empresa', ok: !!form.company_name && !!form.segment },
              { label: 'Audiência', ok: !!form.target_audience && !!form.brand_personality },
              { label: 'Diferenciais', ok: !!form.main_differentials && !!form.value_proposition },
              { label: 'Tom de Voz', ok: !!form.tone_of_voice },
              { label: 'Pilares', ok: form.content_pillars.length >= 3 },
              { label: 'Keywords', ok: form.keywords.length >= 5 },
            ].map(({ label, ok }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-stone-400">{label}</span>
                <span className={`text-xs font-bold ${ok ? 'text-green-400' : 'text-stone-600'}`}>
                  {ok ? '✓ OK' : '○ Faltando'}
                </span>
              </div>
            ))}
          </div>

          {/* Aviso de CCP */}
          {score >= 60 && (
            <div className="bg-[#a855f7]/10 border border-[#a855f7]/30 rounded-xl p-4">
              <p className="text-xs font-bold text-[#a855f7] mb-1 flex items-center gap-1">
                <CheckCircle2 size={12} /> CCP Ativo
              </p>
              <p className="text-[10px] text-stone-400">Este briefing alimenta automaticamente a geração de Posts, Vídeos, Sites e Bio Links da sua marca.</p>
            </div>
          )}

          {/* Uso do CCP */}
          <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4">
            <p className="text-[10px] text-stone-500 font-mono mb-2 uppercase">Schema real no banco</p>
            <pre className="text-[10px] text-stone-500 overflow-auto leading-relaxed">
{`company.name: "${form.company_name || '—'}"
company.segment: "${form.segment || '—'}"
audience.personality: "${form.brand_personality || '—'}"
content.pillars: [${form.content_pillars.length} itens]
content.keywords: [${form.keywords.length} itens]`}
            </pre>
          </div>
        </div>

        {/* Users section */}
        <div className="p-6 border-t border-[var(--border)]">
          <div className="flex items-center gap-3 mb-3">
            <Users size={14} className="text-stone-500" />
            <p className="text-xs font-bold text-stone-400">Módulos que usam este briefing</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {['PostGen', 'Video Studio', 'Bio Link', 'Site Builder', 'Agentes'].map((m) => (
              <span key={m} className="text-[10px] bg-[#1a1a1a] text-stone-400 px-2 py-1 rounded-md border border-[#2a2a2a]">{m}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================================
// UTILS & COMPONENTS
// ===================================
interface SectionProps { title: string; desc: string; children: React.ReactNode; glass?: boolean; }
const Section = ({ title, desc, children, glass }: SectionProps) => (
  <SwCard glass={glass} className="p-6 md:p-8 rounded-[24px]">
    <h3 className="text-lg font-bold tracking-wide mb-1 text-white">{title}</h3>
    <p className="text-sm text-stone-400 mb-6 font-medium">{desc}</p>
    {children}
  </SwCard>
);

interface FieldProps { label: string; val: string; set: (v: string) => void; placeholder?: string; }
const Field = ({ label, val, set, placeholder }: FieldProps) => (
  <div>
    <label className="block text-[10px] font-bold mb-2 uppercase tracking-widest text-[#777] font-mono">{label}</label>
    <SwInput value={val} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set(e.target.value)} placeholder={placeholder} />
  </div>
);

interface FieldAreaProps { label: string; val: string; set: (v: string) => void; placeholder?: string; }
const FieldArea = ({ label, val, set, placeholder }: FieldAreaProps) => (
  <div>
    <label className="block text-[10px] font-bold mb-2 uppercase tracking-widest text-[#777] font-mono">{label}</label>
    <SwTextarea value={val} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set(e.target.value)} placeholder={placeholder} rows={3} />
  </div>
);
