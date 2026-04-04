import { useEffect, useState } from 'react';
import { Target, Wand2, Save, FileText, LayoutDashboard, BrainCircuit, Mic2, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { fromTable } from '@/integrations/supabase/db-custom';
import { supabase } from '@/integrations/supabase/client';
import { SwButton, SwCard, SwInput, SwTextarea } from '@/components/shared/SwComponents';

// ===================================
// TIPAGENS
// ===================================
interface BriefingForm {
  company_name: string;
  tagline: string;
  segment: string;
  target_audience: string;
  audience_age_range: string;
  brand_personality: string;
  tone_of_voice: string;
  main_differentials: string;
  value_proposition: string;
  avoid_topics: string;
  content_pillars: string[];
  keywords: string[];
  brand_dna: string;
  completeness_score: number;
}

const EMPTY_FORM: BriefingForm = {
  company_name: '',
  tagline: '',
  segment: '',
  target_audience: '',
  audience_age_range: '',
  brand_personality: '',
  tone_of_voice: '',
  main_differentials: '',
  value_proposition: '',
  avoid_topics: '',
  content_pillars: [],
  keywords: [],
  brand_dna: '',
  completeness_score: 0,
};

export default function BriefingPage() {
  const { workspace, briefing: wsBriefing, refreshBriefing } = useWorkspace();
  const [form, setForm] = useState<BriefingForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!wsBriefing) { setForm(EMPTY_FORM); return; }
    
    setForm({
      ...EMPTY_FORM,
      ...wsBriefing,
      content_pillars: Array.isArray(wsBriefing.content_pillars) ? (wsBriefing.content_pillars as unknown as string[]) : [],
      keywords: Array.isArray(wsBriefing.keywords) ? (wsBriefing.keywords as unknown as string[]) : [],
    });
  }, [wsBriefing]);

  const calculateCompleteness = (f: BriefingForm): number => {
    let score = 0;
    if (f.company_name?.trim()) score += 10;
    if (f.segment?.trim()) score += 10;
    if (f.target_audience?.trim()) score += 15;
    if (f.brand_personality?.trim()) score += 10;
    if (f.main_differentials?.trim()) score += 10;
    if (f.value_proposition?.trim()) score += 15;
    if (f.content_pillars?.length >= 3) score += 15;
    if (f.keywords?.length >= 5) score += 15;
    return score > 100 ? 100 : score;
  };

  const handleSave = async (f = form) => {
    if (!workspace?.id) return;
    setIsSaving(true);
    try {
      const score = calculateCompleteness(f);
      const contentPayload = {
        company_name: f.company_name,
        tagline: f.tagline,
        segment: f.segment,
        target_audience: f.target_audience,
        audience_age_range: f.audience_age_range,
        brand_personality: f.brand_personality,
        tone_of_voice: f.tone_of_voice,
        main_differentials: f.main_differentials,
        value_proposition: f.value_proposition,
        avoid_topics: f.avoid_topics,
        content_pillars: f.content_pillars,
        keywords: f.keywords,
        brand_dna: f.brand_dna,
      };

      const swPayload = {
        workspace_id: workspace.id,
        title: f.company_name || 'Briefing principal',
        status: f.completeness_score > 80 ? 'ready' : 'draft',
        content: contentPayload,
        brand_dna: f.brand_dna || `${f.company_name} - ${f.segment}`,
        updated_at: new Date().toISOString(),
      };

      if (wsBriefing) {
        const { error } = await fromTable('sw_briefings')
          .update(swPayload)
          .eq('workspace_id', workspace.id);
        if (error) throw error;
      } else {
        const { error } = await fromTable('sw_briefings').insert(swPayload);
        if (error) throw error;
      }

      setForm(prev => ({ ...prev, completeness_score: score }));
      await refreshBriefing();
      toast.success('DNA Estratégico salvo com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Briefing falhou na atualização.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateForm = (updates: Partial<BriefingForm>) => {
    const next = { ...form, ...updates };
    next.completeness_score = calculateCompleteness(next);
    setForm(next);
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
             company_name: form.company_name,
             segment: form.segment,
             target_audience: form.target_audience,
             main_differentials: form.main_differentials
          }
        }
      });

      if (error) throw error;
      
      const aiResponse = data?.data;
      if (aiResponse) {
        toast.info('Construindo interface...', { description: 'Aplicando novas estratégias na tela.' });
        
        const nextForm = {
          ...form,
          brand_dna: aiResponse.brand_dna || form.brand_dna,
          tone_of_voice: aiResponse.tone_of_voice || form.tone_of_voice,
          main_differentials: aiResponse.main_differentials || form.main_differentials,
          content_pillars: Array.isArray(aiResponse.content_pillars) 
            ? aiResponse.content_pillars 
            : form.content_pillars
        };
        
        updateForm(nextForm);
        await handleSave(nextForm);
        toast.success('Briefing Genial gerado com sucesso!');
      } else {
        throw new Error('Retorno vazio da Inteligência Artificial');
      }
    } catch (e) {
      console.error(e);
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
  
  const addPillar = () => updateForm({ content_pillars: [...form.content_pillars, ''] });
  const remPillar = (i: number) => updateForm({ content_pillars: form.content_pillars.filter((_, idx) => idx !== i) });

  return (
    <div className="flex h-full bg-[#0a0a0a] text-white overflow-hidden">
      {/* 
        ========================================
        COLUNA 1: EDITOR (Estratégia)
        ========================================
      */}
      <div className="flex-1 overflow-y-auto no-scrollbar border-r border-[#1f1f1f]">
        
        {/* Header Premium */}
        <div className="sticky top-0 z-20 backdrop-blur-3xl bg-black/60 border-b border-[#1f1f1f] p-6 lg:p-8 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-2 opacity-70">
              <BrainCircuit size={16} className="text-[#a855f7]" /> <span className="text-xs font-semibold tracking-widest uppercase">Estratégia Engine</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white to-[#a8a8a8] bg-clip-text text-transparent">
              Brand Briefing
            </h1>
          </div>
          <div className="flex gap-4">
            <SwButton variant="ghost" onClick={handleAIMagic} disabled={isGenerating}>
              <Wand2 size={16} className="text-[#10b981]" />
              {isGenerating ? 'Processando...' : 'IA Auto-Completar'}
            </SwButton>
            <SwButton variant="primary" onClick={() => handleSave()} disabled={isSaving} className="bg-[#10b981] hover:bg-[#059669] text-black shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <Save size={16} />
              {isSaving ? 'Salvando...' : 'Publicar V2'}
            </SwButton>
          </div>
        </div>

        {/* Formulário - Glass Cards */}
        <div className="p-6 lg:p-8 space-y-8 max-w-4xl">
          
          <Section icon={<Target />} title="Posicionamento Core" desc="O núcleo de quem você é e do que você faz.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Nome da Marca" val={form.company_name} set={(v:any) => updateForm({company_name:v})} />
              <Input label="Segmento (Ex: SaúdeTech)" val={form.segment} set={(v:any) => updateForm({segment:v})} />
              <Input label="Tagline/Slogan" val={form.tagline} set={(v:any) => updateForm({tagline:v})} colspan />
              <TextArea label="Unique Value Proposition (UVP)" val={form.value_proposition} set={(v:any) => updateForm({value_proposition:v})} colspan />
              <TextArea label="Diferenciais Competitivos" val={form.main_differentials} set={(v:any) => updateForm({main_differentials:v})} colspan rows={3} />
            </div>
          </Section>

          <Section icon={<Users />} title="Público & Personas" desc="Para quem estamos construindo isso.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextArea label="Descrição do Público (Dores/Desejos)" val={form.target_audience} set={(v:any) => updateForm({target_audience:v})} rows={3} />
              <div className="space-y-4">
                <Input label="Faixa Etária Principal" val={form.audience_age_range} placeholder="Ex: 25-45 anos" set={(v:any) => updateForm({audience_age_range:v})} />
                <Input label="Tópicos a Evitar (Antipadrões)" val={form.avoid_topics} placeholder="Ex: Religião, promessas irrealistas" set={(v:any) => updateForm({avoid_topics:v})} />
              </div>
            </div>
          </Section>

          <Section icon={<Mic2 />} title="Voz e Personalidade" desc="Como a IA incorporará sua marca ao escrever.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Personalidade (3-5 adjetivos)" placeholder="Ex: Ousada, visionária, direta" val={form.brand_personality} set={(v:any) => updateForm({brand_personality:v})} />
              <Input label="Tom de Voz" placeholder="Ex: Acolhedor sem jargões" val={form.tone_of_voice} set={(v:any) => updateForm({tone_of_voice:v})} />
            </div>
          </Section>

          <Section icon={<LayoutDashboard />} title="Arquitetura de Conteúdo" desc="Pilares para a geração automática de posts e vídeos.">
            <div className="space-y-4">
              <div className="space-y-3 bg-[#131313] p-5 border border-[#222] rounded-2xl">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#777] font-mono">Pilares Editoriais ({form.content_pillars.length})</label>
                  <button onClick={addPillar} className="text-xs bg-[#222] font-semibold hover:bg-[#333] px-3 py-1 rounded transition-colors">+ Adicionar</button>
                </div>
                {form.content_pillars.length === 0 && <p className="text-sm text-[#555] italic">Nenhum pilar adicionado. A IA não saberá sobre o que gerar.</p>}
                {form.content_pillars.map((pillar, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input type="text" value={pillar} onChange={e => handlePillarChange(idx, e.target.value)}
                      placeholder="Ex: Educação em Investimentos" className="w-full bg-[#1a1a1a] border border-[#333] px-4 py-3 rounded-xl text-sm focus:border-[#10b981] outline-none" />
                    <button onClick={() => remPillar(idx)} className="px-4 bg-[#1a1a1a] border border-[#333] hover:border-red-500 hover:text-red-500 rounded-xl transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <TextArea label="Keywords / SEO (separadas por vírgula)" val={(form.keywords || []).join(', ')} set={(v:any) => updateForm({keywords: v.split(',').map((s:string)=>s.trim())})} rows={2} />
            </div>
          </Section>

        </div>
      </div>

      {/* 
        ========================================
        COLUNA 2: COMPLETENESS SCORE & DNA
        ========================================
      */}
      <div className="w-[340px] shrink-0 bg-[#050505] hidden xl:flex flex-col relative overflow-hidden border-r border-[#1f1f1f]">
        
        {/* Dashboard de Completude */}
        <div className="p-6 border-b border-[#1f1f1f] bg-black">
          <p className="text-[10px] font-bold tracking-widest text-stone-500 mb-2 font-mono">READINESS SCORE</p>
          <div className="flex items-end gap-2 mb-4">
            <h2 className="text-6xl font-black tracking-tighter" style={{ color: form.completeness_score >= 80 ? '#10b981' : form.completeness_score >= 50 ? '#f59e0b' : '#ef4444' }}>
              {form.completeness_score}<span className="text-2xl text-stone-600">%</span>
            </h2>
          </div>
          
          <div className="w-full h-1.5 bg-[#1a1a1a] rounded overflow-hidden">
            <div className="h-full transition-all duration-1000 ease-out" style={{ 
              width: `${form.completeness_score}%`,
              backgroundColor: form.completeness_score >= 80 ? '#10b981' : form.completeness_score >= 50 ? '#f59e0b' : '#ef4444'
            }} />
          </div>

          <p className="text-xs text-stone-400 font-medium mt-4">
            {form.completeness_score >= 80 ? 'Excelente! A IA tem contexto profundo para gerar assets de alta conversão.' :
             form.completeness_score >= 50 ? 'Bom. Mas fornecer detalhes como Diferenciais melhoraria as copys.' :
             'Incompleto. Seus templates e agentes podem gerar conteúdo genérico.'}
          </p>
        </div>

        {/* Brand DNA Box */}
        <div className="flex-1 p-6 overflow-y-auto no-scrollbar font-sans space-y-5">
           <div>
             <div className="flex items-center gap-2 mb-3 text-stone-400">
               <FileText size={16} /> <span className="text-sm font-bold tracking-wide">Brand DNA (IA)</span>
             </div>
             {form.brand_dna ? (
               <div className="text-sm leading-relaxed text-stone-300 italic opacity-80" style={{ whiteSpace: 'pre-line' }}>
                 "{form.brand_dna}"
               </div>
             ) : (
               <div className="bg-[#111] p-4 rounded-xl border border-[#222] border-dashed text-xs text-stone-500 text-center">
                 Execute o botão "IA Auto-Completar" para condensar suas regras num DNA canônico.
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}

// ===================================
// COMPONENTS
// ===================================

interface SectionProps { icon?: React.ReactNode; title: string; desc: string; children: React.ReactNode; }
const Section = ({ icon, title, desc, children }: SectionProps) => (
  <SwCard glass className="p-6 md:p-8 rounded-[24px]">
    <div className="flex items-center gap-3 mb-2">
      {icon && <div className="p-2 rounded-lg bg-[#222] text-white/70">{icon}</div>}
      <h3 className="text-lg font-bold font-display tracking-wide text-white">{title}</h3>
    </div>
    <p className="text-sm text-[#94a3b8] mb-6 font-medium border-b border-[var(--border)] pb-6">{desc}</p>
    {children}
  </SwCard>
);

interface BaseProps { label: string; val: string; set: (v: string) => void; placeholder?: string; colspan?: boolean; }

const Input = ({ label, val, set, placeholder, colspan }: BaseProps) => (
  <div className={colspan ? "md:col-span-2" : ""}>
    <label className="block text-[10px] font-bold mb-2 uppercase tracking-widest text-[#777] font-mono">{label}</label>
    <SwInput value={val} onChange={(e: any) => set(e.target.value)} placeholder={placeholder} />
  </div>
);

interface TextAreaProps extends BaseProps { rows?: number; }
const TextArea = ({ label, val, set, placeholder, rows = 4, colspan }: TextAreaProps) => (
  <div className={colspan ? "md:col-span-2" : ""}>
    <label className="block text-[10px] font-bold mb-2 uppercase tracking-widest text-[#777] font-mono">{label}</label>
    <SwTextarea value={val} onChange={(e: any) => set(e.target.value)} placeholder={placeholder} rows={rows} />
  </div>
);
