import { useEffect, useMemo, useState } from 'react';
import { Palette, Save, Wand2, History, CheckCircle2, LayoutTemplate } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { fromTable } from '@/integrations/supabase/db-custom';
import { supabase } from '@/integrations/supabase/client';
import { SwButton, SwCard, SwInput, SwSelect } from '@/components/shared/SwComponents';

// ===================================
// TIPAGENS
// ===================================
interface CustomColor { name: string; hex: string; }

interface BrandKitForm {
  // Cores Base
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  color_bg_dark: string;
  color_bg_light: string;
  color_text_dark: string;
  color_text_light: string;
  color_success: string;
  color_warning: string;
  color_danger: string;

  // Tipografia
  font_heading: string;
  font_body: string;
  font_mono: string;
  font_display: string;

  // Logomarcas
  logo_url: string;
  logo_light_url: string;
  logo_icon_url: string;
  logo_horizontal_url: string;

  // Estética
  border_radius_scale: 'none' | 'small' | 'medium' | 'large' | 'pill';
  shadow_style: 'none' | 'subtle' | 'medium' | 'strong';
  animation_style: 'none' | 'minimal' | 'smooth' | 'bouncy';
  icon_set: 'lucide' | 'phosphor' | 'heroicons';

  custom_colors: CustomColor[];
}

const EMPTY_FORM: BrandKitForm = {
  color_primary: '#7C3AED',
  color_secondary: '#06B6D4',
  color_accent: '#F59E0B',
  color_bg_dark: '#09090F',
  color_bg_light: '#FFFFFF',
  color_text_dark: '#111111',
  color_text_light: '#F8FAFC',
  color_success: '#10B981',
  color_warning: '#F59E0B',
  color_danger: '#EF4444',
  font_heading: 'Inter',
  font_body: 'Inter',
  font_mono: 'JetBrains Mono',
  font_display: 'Playfair Display',
  logo_url: '',
  logo_light_url: '',
  logo_icon_url: '',
  logo_horizontal_url: '',
  border_radius_scale: 'medium',
  shadow_style: 'subtle',
  animation_style: 'smooth',
  icon_set: 'lucide',
  custom_colors: [],
};

const FONTS_SANS = ['Inter', 'Roboto', 'Outfit', 'DM Sans', 'Montserrat', 'Poppins'];
const FONTS_SERIF = ['Playfair Display', 'Merriweather', 'Lora', 'PT Serif'];
const FONTS_MONO = ['JetBrains Mono', 'Fira Code', 'Roboto Mono', 'Space Mono'];
const FONTS_DISPLAY = ['Bebas Neue', 'Oswald', 'Syne', 'Clash Display'];

// ===================================
// COMPONENTE PRINCIPAL
// ===================================
export default function BrandKitPage() {
  const { workspace, brandKit: wsBrandKit, refreshBrandKit } = useWorkspace();
  const [form, setForm] = useState<BrandKitForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!wsBrandKit) { setForm(EMPTY_FORM); return; }
    
    // Fallback safe property maping
    setForm({
      ...EMPTY_FORM,
      ...wsBrandKit,
      font_heading: (wsBrandKit as Record<string, unknown>).font_headline as string || (wsBrandKit as Record<string, unknown>).font_heading as string || EMPTY_FORM.font_heading,
      custom_colors: Array.isArray(wsBrandKit.custom_colors) ? wsBrandKit.custom_colors as CustomColor[] : [],
    });
  }, [wsBrandKit]);

  const handleSave = async (f = form) => {
    if (!workspace?.id) return;
    setIsSaving(true);
    try {
      const swPayload = {
        workspace_id: workspace.id,
        brand_name: wsBrandKit?.brand_name ?? workspace.name,
        tone_of_voice: null,
        colors: {
          primary: f.color_primary,
          secondary: f.color_secondary,
          accent: f.color_accent,
          bg_dark: f.color_bg_dark,
          bg_light: f.color_bg_light,
          text_dark: f.color_text_dark,
          text_light: f.color_text_light,
          custom: f.custom_colors,
        },
        fonts: {
          heading: f.font_heading,
          body: f.font_body,
          accent: f.font_display,
        },
        logos: {
          primary: f.logo_url || null,
          dark: f.logo_light_url || null,
        },
        updated_at: new Date().toISOString(),
      };

      if (wsBrandKit) {
        const { error } = await fromTable('sw_brand_kits')
          .update(swPayload)
          .eq('workspace_id', workspace.id);
        if (error) throw error;
      } else {
        const { error } = await fromTable('sw_brand_kits').insert(swPayload);
        if (error) throw error;
      }

      await refreshBrandKit();
      toast.success('DNA visual consolidado com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Brand Kit falhou na atualização.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAIMagic = async () => {
    if (!workspace?.id) return;
    toast.info('Diretor de Arte IA operando...', { description: 'Sintetizando cores e tipografia a partir do seu DNA.' });
    setIsGenerating(true);
    try {
      const { data: briefingData } = await fromTable('sw_briefings')
        .select('content')
        .eq('workspace_id', workspace.id)
        .maybeSingle();

      const { data, error } = await supabase.functions.invoke("sw-brand-generate", {
        body: {
          workspace_id: workspace.id,
          briefing_data: briefingData?.content || {}
        }
      });

      if (error) throw error;
      
      const aiResponse = data?.data;
      if (aiResponse) {
        toast.info('Aplicando Brand Kit...', { description: 'Injetando tokens no Design System.' });
        
        const nextForm = {
          ...form,
          color_primary: aiResponse.colors?.primary || form.color_primary,
          color_secondary: aiResponse.colors?.secondary || form.color_secondary,
          color_accent: aiResponse.colors?.accent || form.color_accent,
          color_bg_dark: aiResponse.colors?.bg_dark || form.color_bg_dark,
          color_bg_light: aiResponse.colors?.bg_light || form.color_bg_light,
          color_text_dark: aiResponse.colors?.text_dark || form.color_text_dark,
          color_text_light: aiResponse.colors?.text_light || form.color_text_light,
          font_heading: aiResponse.fonts?.heading || form.font_heading,
          font_body: aiResponse.fonts?.body || form.font_body,
          font_display: aiResponse.fonts?.accent || form.font_display,
        };
        
        updateForm(nextForm);
        await handleSave(nextForm);
        toast.success('DNA Visual (Brand Kit) gerado com extremo sucesso!');
      } else {
        throw new Error('Retorno vazio da Inteligência Artificial');
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro de conexão com o painel de criação digital.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Preview dinâmico do design system
  const injectedCSS = useMemo(() => `
    .pvw-heading { font-family: '${form.font_heading}', sans-serif; color: ${form.color_primary}; }
    .pvw-display { font-family: '${form.font_display}', serif; }
    .pvw-body { font-family: '${form.font_body}', sans-serif; }
    .pvw-mono { font-family: '${form.font_mono}', monospace; }
    .pvw-bg { background-color: ${form.color_bg_dark}; color: ${form.color_text_light}; }
    .pvw-card { 
      background-color: ${form.color_bg_dark};
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: ${form.border_radius_scale === 'small' ? '4px' : form.border_radius_scale === 'medium' ? '12px' : form.border_radius_scale === 'large' ? '24px' : form.border_radius_scale === 'pill' ? '999px' : '0' };
      box-shadow: ${form.shadow_style === 'subtle' ? '0 4px 20px rgba(0,0,0,0.1)' : form.shadow_style === 'medium' ? '0 10px 30px rgba(0,0,0,0.3)' : form.shadow_style === 'strong' ? '0 20px 40px rgba(0,0,0,0.5)' : 'none' };
    }
    .pvw-btn {
      background: ${form.color_accent};
      color: ${form.color_text_dark};
      border-radius: ${form.border_radius_scale === 'small' ? '4px' : form.border_radius_scale === 'medium' ? '8px' : form.border_radius_scale === 'large' ? '16px' : form.border_radius_scale === 'pill' ? '999px' : '0' };
    }
  `, [form]);

  const updateForm = (updates: Partial<BrandKitForm>) => setForm(f => ({ ...f, ...updates }));

  return (
    <div className="flex h-full bg-[#0a0a0a] text-white overflow-hidden">
      {/* 
        ========================================
        COLUNA 1: EDITOR (Settings)
        ========================================
      */}
      <div className="flex-1 overflow-y-auto no-scrollbar border-r border-[#1f1f1f]">
        
        {/* Header Premium */}
        <div className="sticky top-0 z-20 backdrop-blur-3xl bg-black/60 border-b border-[#1f1f1f] p-6 lg:p-8 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-2 opacity-70">
              <Palette size={16} className="text-[#a855f7]" /> <span className="text-xs font-semibold tracking-widest uppercase">Design System & DNA</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white to-[#a8a8a8] bg-clip-text text-transparent">
              Brand Kit
            </h1>
          </div>
          <div className="flex gap-4">
            <SwButton variant="ghost" onClick={handleAIMagic} disabled={isGenerating}>
              <Wand2 size={16} className="text-[var(--sw-accent)]" />
              {isGenerating ? 'Gerando...' : 'Gerar com IA'}
            </SwButton>
            <SwButton variant="primary" onClick={() => handleSave()} disabled={isSaving}>
              <Save size={16} />
              {isSaving ? 'Salvando...' : 'Publicar V2'}
            </SwButton>
          </div>
        </div>

        {/* Formulário - Glass Cards */}
        <div className="p-6 lg:p-8 space-y-8 max-w-4xl">
          
          {/* Seção: Logomarcas */}
          <Section glass title="Logos e Identidade Gráfica" desc="Sincronize variações da logo para interfaces claras e escuras.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Logo Original (Fundo Claro)" val={form.logo_url} set={(v) => updateForm({logo_url:v})} />
              <Input label="Logo Inversa (Fundo Escuro)" val={form.logo_light_url} set={(v) => updateForm({logo_light_url:v})} />
              <Input label="Ícone / Favicon" val={form.logo_icon_url} set={(v) => updateForm({logo_icon_url:v})} />
              <Input label="Wordmark (Texto)" val={form.logo_horizontal_url} set={(v) => updateForm({logo_horizontal_url:v})} />
            </div>
          </Section>

          {/* Seção: Paleta Dinâmica */}
          <Section glass title="Cores Tokens Principais" desc="Estas cores controlam toda a geração de posts, biolinks e sites.">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              <ColorPicker label="Primary" val={form.color_primary} set={(v) => updateForm({color_primary:v})} />
              <ColorPicker label="Secondary" val={form.color_secondary} set={(v) => updateForm({color_secondary:v})} />
              <ColorPicker label="Accent" val={form.color_accent} set={(v) => updateForm({color_accent:v})} />
              <ColorPicker label="Bg Dark" val={form.color_bg_dark} set={(v) => updateForm({color_bg_dark:v})} />
              <ColorPicker label="Text Light" val={form.color_text_light} set={(v) => updateForm({color_text_light:v})} />
            </div>
            
            <div className="mt-6 border-t border-[#333] pt-6 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 opacity-80">
              <ColorPicker label="Success" val={form.color_success} set={(v) => updateForm({color_success:v})} />
              <ColorPicker label="Warning" val={form.color_warning} set={(v) => updateForm({color_warning:v})} />
              <ColorPicker label="Danger" val={form.color_danger} set={(v) => updateForm({color_danger:v})} />
            </div>
          </Section>

          {/* Seção: Tipografia */}
          <Section glass title="Pilha Tipográfica" desc="Importado automaticamente do Google Fonts ao gerar.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FontSelect label="Font Heading" val={form.font_heading} options={FONTS_SANS} set={(v) => updateForm({font_heading:v})} />
              <FontSelect label="Font Body" val={form.font_body} options={FONTS_SANS} set={(v) => updateForm({font_body:v})} />
              <FontSelect label="Font Display" val={form.font_display} options={FONTS_DISPLAY} set={(v) => updateForm({font_display:v})} />
              <FontSelect label="Font Mono" val={form.font_mono} options={FONTS_MONO} set={(v) => updateForm({font_mono:v})} />
            </div>
          </Section>

          {/* Seção: Estética & Borda */}
          <Section glass title="Estética & Feel" desc="Define o comportamento global de UI do sistema.">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <SelectVal label="Arredondamento" val={form.border_radius_scale} options={['none','small','medium','large','pill']} set={(v: string) => updateForm({border_radius_scale:v})} />
              <SelectVal label="Sombras" val={form.shadow_style} options={['none','subtle','medium','strong']} set={(v: string) => updateForm({shadow_style:v})} />
              <SelectVal label="Motion" val={form.animation_style} options={['none','minimal','smooth','bouncy']} set={(v: string) => updateForm({animation_style:v})} />
              <SelectVal label="Icon Set" val={form.icon_set} options={['lucide','phosphor','heroicons']} set={(v: string) => updateForm({icon_set:v})} />
            </div>
          </Section>

        </div>
      </div>

      {/* 
        ========================================
        COLUNA 2: PREVIEW LIVE
        ========================================
      */}
      <div className="w-[380px] shrink-0 border-r border-[#1f1f1f] bg-[#050505] hidden xl:flex flex-col relative overflow-hidden">
        <style>{injectedCSS}</style>
        
        {/* Fundo do preview com degradê das cores do kit */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
          background: `radial-gradient(circle at 50% 0%, ${form.color_primary} 0%, transparent 70%), radial-gradient(circle at 100% 100%, ${form.color_secondary} 0%, transparent 70%)`
        }} />

        <div className="p-6 border-b border-[#1f1f1f] z-10 bg-black/50 backdrop-blur-md">
          <h2 className="text-sm font-bold flex gap-2 items-center text-white"><LayoutTemplate size={16} /> Live Preview</h2>
          <p className="text-xs text-stone-400 mt-1">Sua interface será gerada com estes tokens exatos.</p>
        </div>

        <div className="flex-1 p-6 overflow-y-auto no-scrollbar z-10 flex flex-col gap-6">
          
          {/* Mock Component 1: Login / Card */}
          <div className="pvw-card p-6 pvw-bg transition-all duration-300">
            {form.logo_light_url ? (
              <img src={form.logo_light_url} alt="Logo" className="h-6 mb-6 object-contain" />
            ) : (
              <div className="w-10 h-10 mb-6 bg-gradient-to-br rounded-xl" style={{ backgroundImage: `linear-gradient(to bottom right, ${form.color_primary}, ${form.color_secondary})`}} />
            )}
            
            <h3 className="pvw-heading text-2xl font-black tracking-tight mb-2 leading-tight">Welcome into the void.</h3>
            <p className="pvw-body text-sm opacity-80 mb-6">Experience the magic of true dynamic multi-tenant ecosystems.</p>
            
            <div className="space-y-3">
              <div className="w-full h-10 border border-[#333] rounded flex items-center px-4 pvw-body text-xs opacity-50" style={{ borderRadius: form.border_radius_scale === 'none' ? 0 : form.border_radius_scale === 'small' ? '4px' : '8px'}}>name@acme.com</div>
              <button className="w-full pvw-btn py-3 px-4 pvw-heading text-sm uppercase tracking-wider font-bold transition-transform hover:scale-[1.02]">
                Join platform
              </button>
            </div>
          </div>

          {/* Mock Component 2: Dashboard stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="pvw-card p-5">
              <p className="pvw-mono text-[10px] uppercase opacity-60 font-semibold tracking-wider">Conversion</p>
              <p className="pvw-display text-4xl mt-1 tracking-tighter" style={{ color: form.color_accent}}>14%</p>
            </div>
            <div className="pvw-card p-5">
              <p className="pvw-mono text-[10px] uppercase opacity-60 font-semibold tracking-wider">Revenue</p>
              <p className="pvw-display text-4xl mt-1 tracking-tighter text-white">$12k</p>
            </div>
          </div>
        </div>
      </div>

      {/* 
        ========================================
        COLUNA 3: HISTÓRICO & STATUS
        ========================================
      */}
      <div className="w-[300px] shrink-0 bg-[#0a0a0a] hidden 2xl:flex flex-col">
        <div className="p-6 border-b border-[#1f1f1f]">
          <h2 className="text-sm font-bold flex gap-2 items-center text-white"><History size={16} /> Versões & Auditoria</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex flex-col gap-4 relative pl-4 border-l border-[#333]">
            <div className="relative">
              <div className="absolute -left-[20.5px] top-1 rounded-full bg-[#10b981] w-[8px] h-[8px] shadow-[0_0_10px_#10b981]" />
              <p className="text-[10px] font-mono text-stone-500 mb-0.5">ESTADO ATUAL (V2)</p>
              <p className="text-sm text-stone-100 font-medium">Sincronizado</p>
            </div>
            <div className="relative opacity-40">
              <div className="absolute -left-[20.5px] top-1 rounded-full bg-[#555] w-[8px] h-[8px]" />
              <p className="text-[10px] font-mono mb-0.5">HÁ 2 DIAS (V1)</p>
              <p className="text-sm font-medium">Extração via IA falhou</p>
            </div>
          </div>

          <div className="bg-[#111] p-4 rounded-xl border border-[#222]">
            <p className="text-xs font-bold mb-3 flex items-center gap-1.5"><CheckCircle2 className="text-[#a855f7]" size={14} /> Checklist do Motor</p>
            <ul className="text-xs space-y-2 text-stone-400">
              <li>• Paleta Canônica (OK)</li>
              <li>• Fontes H/B/D importadas</li>
              <li>• Logo carregadas no bucket</li>
            </ul>
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
    <h3 className="text-lg font-bold font-display tracking-wide mb-1 text-white">{title}</h3>
    <p className="text-sm text-stone-400 mb-6 font-medium">{desc}</p>
    {children}
  </SwCard>
);

interface BaseProps { label?: string; val: string; set: (v: string) => void; }

const ColorPicker = ({ label, val, set }: BaseProps) => (
  <div>
    <label className="block text-[10px] font-bold mb-2 uppercase tracking-widest text-[#777] font-mono">{label}</label>
    <div className="flex bg-[#1a1a1a] border border-[var(--border)] rounded-xl overflow-hidden focus-within:border-[var(--sw-accent)] transition-colors p-1.5 pr-3 items-center gap-2">
      <input type="color" value={val} onChange={e => set(e.target.value)} className="w-8 h-8 rounded shrink-0 border-0 bg-transparent cursor-pointer" />
      <input type="text" value={val} onChange={e => set(e.target.value)} className="w-full bg-transparent text-xs text-white outline-none font-mono tracking-wider font-semibold" />
    </div>
  </div>
);

const Input = ({ label, val, set }: BaseProps) => (
  <div>
    <label className="block text-[10px] font-bold mb-2 uppercase tracking-widest text-[#777] font-mono">{label}</label>
    <SwInput value={val} onChange={(e: any) => set(e.target.value)} placeholder="https://..." />
  </div>
);

interface SelectProps extends BaseProps { options: string[]; }

const SelectVal = ({ label, val, options, set }: SelectProps) => (
  <div>
    <label className="block text-[10px] font-bold mb-2 uppercase tracking-widest text-[#777] font-mono">{label}</label>
    <SwSelect value={val} onChange={(e: any) => set(e.target.value)}>
      {options.map((o: string) => <option key={o} value={o} className="bg-[#111]">{o}</option>)}
    </SwSelect>
  </div>
);

const FontSelect = ({ label, val, options, set }: SelectProps) => (
  <div>
    <label className="block text-[10px] font-bold mb-2 uppercase tracking-widest text-[#777] font-mono">{label}</label>
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt: string) => (
        <button
          key={opt}
          onClick={() => set(opt)}
          className={`py-3 px-3 rounded-xl border text-sm transition-all focus:outline-none ${
            val === opt
              ? 'bg-[#a855f7]/10 border-[#a855f7] text-white font-bold'
              : 'bg-[#1a1a1a] border-[#333] text-stone-400 hover:border-[#555]'
          }`}
        >
          <span style={{ fontFamily: `'${opt}', sans-serif` }}>{opt}</span>
        </button>
      ))}
    </div>
  </div>
);
