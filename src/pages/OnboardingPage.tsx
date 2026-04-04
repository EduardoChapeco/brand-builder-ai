import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

const SEGMENTS = [
  'Marketing Digital',
  'E-commerce',
  'Saude & Bem-estar',
  'Educacao',
  'Tecnologia',
  'Financas',
  'Gastronomia',
  'Moda & Lifestyle',
  'Imoveis',
  'Outro',
];

const TONES = [
  { label: 'Direto e Provocativo', description: 'Sem rodeios e com opiniao forte.' },
  { label: 'Educativo e Claro', description: 'Didatico, organizado e util.' },
  { label: 'Profissional', description: 'Confiavel e corporativo.' },
  { label: 'Leve e Descontraido', description: 'Humano, proximo e amigavel.' },
  { label: 'Urgente e Motivacional', description: 'Energia, acao e momentum.' },
];

const FONTS = [
  { name: 'Bebas Neue', label: 'Impacto', css: "'Bebas Neue', sans-serif" },
  { name: 'DM Sans', label: 'Moderno', css: "'DM Sans', sans-serif" },
  { name: 'Playfair Display', label: 'Elegante', css: "'Playfair Display', serif" },
  { name: 'Syne', label: 'Futurista', css: "'Syne', sans-serif" },
];

const STEPS = ['Identidade', 'Publico & Tom', 'Concorrentes', 'Brand Kit'];

interface CompetitorInput {
  name: string;
  url: string;
  notes: string;
}

interface OnboardingForm {
  name: string;
  segment: string;
  logoUrl: string;
  targetAudience: string;
  tone: string;
  differentials: string;
  colorPrimary: string;
  colorSecondary: string;
  fontHeadline: string;
  instagramHandle: string;
}

const EMPTY_COMPETITOR: CompetitorInput = {
  name: '',
  url: '',
  notes: '',
};

const OnboardingPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<OnboardingForm>({
    name: '',
    segment: '',
    logoUrl: '',
    targetAudience: '',
    tone: '',
    differentials: '',
    colorPrimary: '#7C3AED',
    colorSecondary: '#06B6D4',
    fontHeadline: 'Bebas Neue',
    instagramHandle: '',
  });
  const [competitors, setCompetitors] = useState<CompetitorInput[]>([]);
  const [competitorDraft, setCompetitorDraft] = useState<CompetitorInput>(EMPTY_COMPETITOR);

  const setField = <K extends keyof OnboardingForm>(field: K, value: OnboardingForm[K]) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const canProgress = () => {
    if (step === 0) return form.name.trim().length > 0;
    if (step === 1) return form.tone.trim().length > 0;
    return true;
  };

  const handleAddCompetitor = () => {
    if (!competitorDraft.url.trim()) {
      toast.error('Informe pelo menos a URL do concorrente');
      return;
    }

    setCompetitors(current => [
      ...current,
      {
        name: competitorDraft.name.trim(),
        url: competitorDraft.url.trim(),
        notes: competitorDraft.notes.trim(),
      },
    ]);
    setCompetitorDraft(EMPTY_COMPETITOR);
  };

  const handleRemoveCompetitor = (url: string) => {
    setCompetitors(current => current.filter(item => item.url !== url));
  };

  const handleFinish = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const slug = form.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // 1. Cria o workspace (o Trigger no BD vai inserir vc como Dono via RLS)
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          name: form.name,
          slug,
          logo_url: form.logoUrl || null,
        })
        .select()
        .single();

      if (workspaceError || !workspace) throw workspaceError || new Error('Falha ao criar workspace');

      // 2. Agora o usuario ja e dono. Pode inserir nos modulos.
      await Promise.all([
        supabase.from('briefings').insert({
          workspace_id: workspace.id,
          company: { name: form.name, segment: form.segment },
          audience: { description: form.targetAudience },
          voice: { tone: form.tone },
          company_differentials: form.differentials,
          market: { competitors: competitors as unknown as Json },
        } as any),
        supabase.from('brand_kits').insert({
          workspace_id: workspace.id,
          colors: { primary: form.colorPrimary, secondary: form.colorSecondary },
          fonts: { headline: form.fontHeadline },
          logos: { main_url: form.logoUrl || null },
          voice: { watermark: form.instagramHandle ? `@${form.instagramHandle.replace('@', '')}` : null }
        }),
      ]);

      confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.6 },
        colors: [form.colorPrimary, form.colorSecondary, '#F59E0B'],
      });

      setStep(4);
      setTimeout(() => navigate(`/workspace/${workspace.id}/painel`), 1800);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar workspace');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--surface-app)] text-[var(--text-primary)]">
      <div className="w-full max-w-xl mb-8">
        <div className="flex items-center gap-2 mb-3">
          {STEPS.map((label, index) => (
            <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  index <= step ? 'bg-purple-600 text-white border-2 border-purple-600' : 'bg-[var(--surface-2)] text-[var(--text-muted)] border-2 border-[var(--border)]'
                }`}
              >
                {index < step && step < 4 ? <Check size={12} strokeWidth={3} /> : index + 1}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 rounded transition-all duration-300 ${
                    index < step ? 'bg-purple-600' : 'bg-[var(--border)]'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-center text-[var(--text-muted)]">
          Passo {Math.min(step + 1, STEPS.length)} de {STEPS.length}
        </p>
      </div>

      <div className="w-full max-w-xl rounded-2xl p-8 bg-[var(--surface-card)] border border-[var(--border)] shadow-xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
        
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="identity" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-4xl mb-4">🏢</div>
              <h2 className="text-2xl font-bold font-display mb-1 text-white">
                Qual o nome da sua empresa?
              </h2>
              <p className="text-sm mb-6 text-[var(--text-muted)]">
                Comece pela identidade basica do workspace.
              </p>

              <div className="space-y-4">
                <input
                  autoFocus
                  value={form.name}
                  onChange={event => setField('name', event.target.value)}
                  placeholder="Ex: Studio Criativo"
                  className="w-full px-4 py-3 rounded-xl text-base outline-none bg-[var(--surface-2)] text-white border border-[var(--border)] focus:border-purple-500 transition-colors placeholder:text-[var(--text-muted)]"
                />
                <select
                  value={form.segment}
                  onChange={event => setField('segment', event.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none cursor-pointer bg-[var(--surface-2)] text-white border border-[var(--border)] focus:border-purple-500 transition-colors"
                >
                  <option value="" className="text-[var(--text-muted)]">Selecione o segmento...</option>
                  {SEGMENTS.map(segment => (
                    <option key={segment} value={segment} className="bg-[var(--surface-2)]">
                      {segment}
                    </option>
                  ))}
                </select>
                <input
                  value={form.logoUrl}
                  onChange={event => setField('logoUrl', event.target.value)}
                  placeholder="URL do logo (opcional)"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none bg-[var(--surface-2)] text-white border border-[var(--border)] focus:border-purple-500 transition-colors placeholder:text-[var(--text-muted)]"
                />
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="tone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-4xl mb-4">🗣️</div>
              <h2 className="text-2xl font-bold font-display mb-1 text-white">
                Como a marca se comunica?
              </h2>
              <p className="text-sm mb-5 text-[var(--text-muted)]">
                Defina o publico e o tom de voz principal.
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  {TONES.map(tone => (
                    <button
                      key={tone.label}
                      onClick={() => setField('tone', tone.label)}
                      className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-150 border ${
                        form.tone === tone.label ? 'bg-purple-500/10 border-purple-500' : 'bg-[var(--surface-2)] border-[var(--border)] hover:border-purple-500/50'
                      }`}
                    >
                      <div>
                        <p className={`text-sm font-semibold ${form.tone === tone.label ? 'text-purple-400' : 'text-white'}`}>
                          {tone.label}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {tone.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <textarea
                  value={form.targetAudience}
                  onChange={event => setField('targetAudience', event.target.value)}
                  placeholder="Descreva o publico-alvo..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none bg-[var(--surface-2)] text-white border border-[var(--border)] focus:border-purple-500 transition-colors placeholder:text-[var(--text-muted)]"
                />

                <textarea
                  value={form.differentials}
                  onChange={event => setField('differentials', event.target.value)}
                  placeholder="Principais diferenciais da marca..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none bg-[var(--surface-2)] text-white border border-[var(--border)] focus:border-purple-500 transition-colors placeholder:text-[var(--text-muted)]"
                />
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="competitors" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-2xl font-bold font-display mb-1 text-white">
                Quem voce quer analisar?
              </h2>
              <p className="text-sm mb-5 text-[var(--text-muted)]">
                Adicione ate 5 concorrentes ou inspiracoes para enriquecer o briefing.
              </p>

              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <input
                    value={competitorDraft.name}
                    onChange={event => setCompetitorDraft(current => ({ ...current, name: event.target.value }))}
                    placeholder="Nome"
                    className="px-3 py-3 rounded-xl text-sm outline-none bg-[var(--surface-2)] text-white border border-[var(--border)] focus:border-purple-500 placeholder:text-[var(--text-muted)]"
                  />
                  <input
                    value={competitorDraft.url}
                    onChange={event => setCompetitorDraft(current => ({ ...current, url: event.target.value }))}
                    placeholder="https://site.com"
                    className="px-3 py-3 rounded-xl text-sm outline-none bg-[var(--surface-2)] text-white border border-[var(--border)] focus:border-purple-500 placeholder:text-[var(--text-muted)]"
                  />
                  <div className="flex gap-2">
                    <input
                      value={competitorDraft.notes}
                      onChange={event => setCompetitorDraft(current => ({ ...current, notes: event.target.value }))}
                      placeholder="Notas"
                      className="flex-1 px-3 py-3 rounded-xl text-sm outline-none bg-[var(--surface-2)] text-white border border-[var(--border)] focus:border-purple-500 placeholder:text-[var(--text-muted)]"
                    />
                    <button
                      onClick={handleAddCompetitor}
                      className="px-3 rounded-xl bg-purple-600 text-white hover:bg-purple-500 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {competitors.length === 0 ? (
                  <div className="rounded-xl px-4 py-3 text-sm bg-[var(--surface-2)] border border-dashed border-[var(--border)] text-[var(--text-muted)]">
                    Este passo e opcional. Se preferir, avance sem adicionar concorrentes.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {competitors.map(item => (
                      <div
                        key={item.url}
                        className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)]"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate text-white">
                            {item.name || item.url}
                          </p>
                          <p className="text-xs truncate text-[var(--text-muted)]">
                            {item.url}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveCompetitor(item.url)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="brand-kit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-2xl font-bold font-display mb-1 text-white">
                Sua identidade visual
              </h2>
              <p className="text-sm mb-5 text-[var(--text-muted)]">
                Escolha as bases do Brand Kit inicial.
              </p>

              <div className="space-y-5">
                <div className="flex gap-4">
                  {[
                    { label: 'Cor primaria', key: 'colorPrimary' as const },
                    { label: 'Cor secundaria', key: 'colorSecondary' as const },
                  ].map(item => (
                    <div key={item.key} className="flex-1">
                      <label className="block text-xs font-medium mb-1.5 text-[var(--text-secondary)]">
                        {item.label}
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                        <input
                          type="color"
                          value={form[item.key]}
                          onChange={event => setField(item.key, event.target.value)}
                          className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                        />
                        <span className="text-xs font-mono text-[var(--text-secondary)]">
                          {form[item.key]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2.5 text-[var(--text-secondary)]">
                    Fonte dos titulos
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {FONTS.map(font => (
                      <button
                        key={font.name}
                        onClick={() => setField('fontHeadline', font.name)}
                        className={`p-3 rounded-xl text-left transition-all duration-150 border ${
                          form.fontHeadline === font.name ? 'bg-purple-500/10 border-purple-500' : 'bg-[var(--surface-2)] border-[var(--border)] hover:border-purple-500/50'
                        }`}
                      >
                        <p className="text-lg font-bold mb-0.5 text-white" style={{ fontFamily: font.css }}>
                          {font.name}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {font.label}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  value={form.instagramHandle}
                  onChange={event => setField('instagramHandle', event.target.value)}
                  placeholder="@suaempresa"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none bg-[var(--surface-2)] text-white border border-[var(--border)] focus:border-purple-500 placeholder:text-[var(--text-muted)]"
                />
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-purple-600 shadow-[0_0_40px_rgba(124,58,237,0.5)]"
              >
                <Check size={36} className="text-white" strokeWidth={2.5} />
              </motion.div>
              <h2 className="text-3xl font-bold font-display mb-2 text-white">
                Workspace pronto
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                Redirecionando para as ferramentas de criacao...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {step < 4 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--border)]">
            <button
              onClick={() => step > 0 && setStep(current => current - 1)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 text-[var(--text-secondary)] hover:text-white ${
                step === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            >
              <ArrowLeft size={16} />
              Voltar
            </button>

            {step < 3 ? (
              <button
                disabled={!canProgress()}
                onClick={() => setStep(current => current + 1)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Proximo
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                disabled={isSaving}
                onClick={handleFinish}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-60 shadow-[0_8px_24px_rgba(124,58,237,0.3)]"
              >
                {isSaving ? 'Criando...' : 'Criar workspace'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;
