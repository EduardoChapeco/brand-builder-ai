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
  { emoji: '🔥', label: 'Direto e Provocativo', description: 'Sem rodeios e com opiniao forte.' },
  { emoji: '📚', label: 'Educativo e Claro', description: 'Didatico, organizado e util.' },
  { emoji: '💼', label: 'Profissional', description: 'Confiavel e corporativo.' },
  { emoji: '😄', label: 'Leve e Descontraido', description: 'Humano, proximo e amigavel.' },
  { emoji: '⚡', label: 'Urgente e Motivacional', description: 'Energia, acao e momentum.' },
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

      await Promise.all([
        supabase.from('briefings').insert({
          workspace_id: workspace.id,
          company_name: form.name,
          segment: form.segment,
          target_audience: form.targetAudience,
          tone_of_voice: form.tone,
          main_differentials: form.differentials,
          instagram_handle: form.instagramHandle,
          main_competitors: competitors as unknown as Json,
        }),
        supabase.from('brand_kits').insert({
          workspace_id: workspace.id,
          color_primary: form.colorPrimary,
          color_secondary: form.colorSecondary,
          font_headline: form.fontHeadline,
          watermark_text: form.instagramHandle ? `@${form.instagramHandle.replace('@', '')}` : null,
          logo_url: form.logoUrl || null,
        }),
      ]);

      confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.6 },
        colors: [form.colorPrimary, form.colorSecondary, '#F59E0B'],
      });

      setStep(4);
      setTimeout(() => navigate(`/workspace/${workspace.id}/generator`), 1800);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar workspace');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 gradient-mesh overflow-y-auto"
      style={{ background: 'var(--bg-app)', scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
    >
      <div className="w-full max-w-xl mb-8">
        <div className="flex items-center gap-2 mb-3">
          {STEPS.map((label, index) => (
            <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                style={{
                  background: index <= step ? 'var(--primary)' : 'var(--bg-card)',
                  color: index <= step ? 'white' : 'var(--text-3)',
                  border: `2px solid ${index <= step ? 'var(--primary)' : 'var(--border)'}`,
                }}
              >
                {index < step && step < 4 ? <Check size={12} /> : index + 1}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className="h-0.5 flex-1 rounded transition-all duration-300"
                  style={{ background: index < step ? 'var(--primary)' : 'var(--border)' }}
                />
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
          Passo {Math.min(step + 1, STEPS.length)} de {STEPS.length}
        </p>
      </div>

      <div
        className="w-full max-w-xl rounded-2xl p-8"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="identity" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-4xl mb-4">🏢</div>
              <h2 className="text-2xl font-bold font-display mb-1" style={{ color: 'var(--text-1)' }}>
                Qual o nome da sua empresa?
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>
                Comece pela identidade basica do workspace.
              </p>

              <div className="space-y-4">
                <input
                  autoFocus
                  value={form.name}
                  onChange={event => setField('name', event.target.value)}
                  placeholder="Ex: Studio Criativo"
                  className="w-full px-4 py-3 rounded-xl text-base outline-none"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                />
                <select
                  value={form.segment}
                  onChange={event => setField('segment', event.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none cursor-pointer"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: form.segment ? 'var(--text-1)' : 'var(--text-3)' }}
                >
                  <option value="">Selecione o segmento...</option>
                  {SEGMENTS.map(segment => (
                    <option key={segment} value={segment}>
                      {segment}
                    </option>
                  ))}
                </select>
                <input
                  value={form.logoUrl}
                  onChange={event => setField('logoUrl', event.target.value)}
                  placeholder="URL do logo (opcional)"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                />
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="tone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-4xl mb-4">🗣️</div>
              <h2 className="text-2xl font-bold font-display mb-1" style={{ color: 'var(--text-1)' }}>
                Como a marca se comunica?
              </h2>
              <p className="text-sm mb-5" style={{ color: 'var(--text-2)' }}>
                Defina o publico e o tom de voz principal.
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  {TONES.map(tone => (
                    <button
                      key={tone.label}
                      onClick={() => setField('tone', tone.label)}
                      className="flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-150"
                      style={{
                        background: form.tone === tone.label ? 'var(--primary-muted)' : 'var(--bg-elevated)',
                        border: `1px solid ${form.tone === tone.label ? 'var(--primary)' : 'var(--border)'}`,
                      }}
                    >
                      <span className="text-xl">{tone.emoji}</span>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: form.tone === tone.label ? 'var(--primary)' : 'var(--text-1)' }}>
                          {tone.label}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-3)' }}>
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
                  className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                />

                <textarea
                  value={form.differentials}
                  onChange={event => setField('differentials', event.target.value)}
                  placeholder="Principais diferenciais da marca..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                />
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="competitors" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-4xl mb-4">🔍</div>
              <h2 className="text-2xl font-bold font-display mb-1" style={{ color: 'var(--text-1)' }}>
                Quem voce quer analisar?
              </h2>
              <p className="text-sm mb-5" style={{ color: 'var(--text-2)' }}>
                Adicione ate 5 concorrentes ou inspiracoes para enriquecer o briefing.
              </p>

              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <input
                    value={competitorDraft.name}
                    onChange={event => setCompetitorDraft(current => ({ ...current, name: event.target.value }))}
                    placeholder="Nome"
                    className="px-3 py-3 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                  />
                  <input
                    value={competitorDraft.url}
                    onChange={event => setCompetitorDraft(current => ({ ...current, url: event.target.value }))}
                    placeholder="https://site.com"
                    className="px-3 py-3 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                  />
                  <div className="flex gap-2">
                    <input
                      value={competitorDraft.notes}
                      onChange={event => setCompetitorDraft(current => ({ ...current, notes: event.target.value }))}
                      placeholder="Notas"
                      className="flex-1 px-3 py-3 rounded-xl text-sm outline-none"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                    />
                    <button
                      onClick={handleAddCompetitor}
                      className="px-3 rounded-xl"
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
                    Este passo e opcional. Se preferir, avance sem adicionar concorrentes.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {competitors.map(item => (
                      <div
                        key={item.url}
                        className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>
                            {item.name || item.url}
                          </p>
                          <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>
                            {item.url}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveCompetitor(item.url)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ background: 'var(--bg-app)', border: '1px solid var(--border)', color: '#EF4444' }}
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
              <div className="text-4xl mb-4">🎨</div>
              <h2 className="text-2xl font-bold font-display mb-1" style={{ color: 'var(--text-1)' }}>
                Sua identidade visual
              </h2>
              <p className="text-sm mb-5" style={{ color: 'var(--text-2)' }}>
                Escolha as bases do Brand Kit inicial.
              </p>

              <div className="space-y-5">
                <div className="flex gap-4">
                  {[
                    { label: 'Cor primaria', key: 'colorPrimary' as const },
                    { label: 'Cor secundaria', key: 'colorSecondary' as const },
                  ].map(item => (
                    <div key={item.key} className="flex-1">
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
                        {item.label}
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <input
                          type="color"
                          value={form[item.key]}
                          onChange={event => setField(item.key, event.target.value)}
                          className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                        />
                        <span className="text-xs font-mono" style={{ color: 'var(--text-2)' }}>
                          {form[item.key]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2.5" style={{ color: 'var(--text-2)' }}>
                    Fonte dos titulos
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {FONTS.map(font => (
                      <button
                        key={font.name}
                        onClick={() => setField('fontHeadline', font.name)}
                        className="p-3 rounded-xl text-left transition-all duration-150"
                        style={{
                          background: form.fontHeadline === font.name ? 'var(--primary-muted)' : 'var(--bg-elevated)',
                          border: `1px solid ${form.fontHeadline === font.name ? 'var(--primary)' : 'var(--border)'}`,
                        }}
                      >
                        <p className="text-lg font-bold mb-0.5" style={{ fontFamily: font.css, color: 'var(--text-1)' }}>
                          {font.name}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>
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
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
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
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: 'var(--primary)', boxShadow: '0 0 40px rgba(124,58,237,0.5)' }}
              >
                <Check size={36} className="text-white" strokeWidth={2.5} />
              </motion.div>
              <h2 className="text-3xl font-bold font-display mb-2" style={{ color: 'var(--text-1)' }}>
                Workspace pronto
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                Redirecionando para o gerador...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {step < 4 && (
          <div className="flex items-center justify-between mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={() => step > 0 && setStep(current => current - 1)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150"
              style={{ color: 'var(--text-2)', opacity: step === 0 ? 0 : 1, pointerEvents: step === 0 ? 'none' : 'auto' }}
            >
              <ArrowLeft size={16} />
              Voltar
            </button>

            {step < 3 ? (
              <button
                disabled={!canProgress()}
                onClick={() => setStep(current => current + 1)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'var(--primary)', color: 'white' }}
              >
                Proximo
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                disabled={isSaving}
                onClick={handleFinish}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-60"
                style={{ background: 'var(--primary)', color: 'white', boxShadow: '0 8px 24px rgba(124,58,237,0.3)' }}
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
