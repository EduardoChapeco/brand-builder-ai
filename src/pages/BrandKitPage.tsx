import { useEffect, useMemo, useState } from 'react';
import { Palette, Save, Wand2, History, CheckCircle2, LayoutTemplate, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { fromTable } from '@/integrations/supabase/db-custom';
import { supabase } from '@/integrations/supabase/client';
import { SwButton, SwCard, SwInput, SwSelect } from '@/components/shared/SwComponents';
import type { BrandKitFormFlat } from '@/types/app.types';
import { MediaUploader } from '@/components/shared/MediaUploader';

// ===================================
// TIPAGEM LOCAL DE FORMULÁRIO
// ===================================
// BrandKitFormFlat vem de app.types.ts — campos planos da UI
// No banco, são serializados em JSONB { colors, fonts, logos, voice }

interface CustomColor { name: string; hex: string; }

const EMPTY_FORM: BrandKitFormFlat & { custom_colors: CustomColor[] } = {
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
  logo_dark_url: '',
  logo_icon_url: '',
  logo_light_url: '',
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

// ── Helpers de serialização JSONB ←→ Form ───────────────────
/** Converte o registro JSONB do banco para o formulário plano da UI */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToForm(bk: Record<string, any>): typeof EMPTY_FORM {
  const colors = bk.colors || {};
  const fonts  = bk.fonts  || {};
  const logos  = bk.logos  || {};
  const voice  = bk.voice  || {};

  return {
    ...EMPTY_FORM,
    // Cores
    color_primary:    colors.primary    || EMPTY_FORM.color_primary,
    color_secondary:  colors.secondary  || EMPTY_FORM.color_secondary,
    color_accent:     colors.accent     || EMPTY_FORM.color_accent,
    color_bg_dark:    colors.background || EMPTY_FORM.color_bg_dark,
    color_bg_light:   colors.bg_light   || EMPTY_FORM.color_bg_light,
    color_text_dark:  colors.text       || EMPTY_FORM.color_text_dark,
    color_text_light: colors.text_light || EMPTY_FORM.color_text_light,
    color_success:    colors.success    || EMPTY_FORM.color_success,
    color_warning:    colors.warning    || EMPTY_FORM.color_warning,
    color_danger:     colors.danger     || EMPTY_FORM.color_danger,
    custom_colors:    Array.isArray(colors.palette)
      ? colors.palette.map((hex: string, i: number) => ({ name: `Custom ${i + 1}`, hex }))
      : [],
    // Tipografia
    font_heading: fonts.heading || EMPTY_FORM.font_heading,
    font_body:    fonts.body    || EMPTY_FORM.font_body,
    font_mono:    fonts.mono    || fonts.sizes?.mono || EMPTY_FORM.font_mono,
    font_display: fonts.display || fonts.sizes?.display || EMPTY_FORM.font_display,
    // Logos
    logo_url:      logos.main_url  || '',
    logo_dark_url: logos.dark_url  || '',
    logo_icon_url: logos.icon_url  || '',
    logo_light_url: logos.light_url || '',
    // Estética (guardada em voice)
    border_radius_scale: voice.border_radius_scale || EMPTY_FORM.border_radius_scale,
    shadow_style:        voice.shadow_style        || EMPTY_FORM.shadow_style,
    animation_style:     voice.animation_style     || EMPTY_FORM.animation_style,
    icon_set:            voice.icon_set            || EMPTY_FORM.icon_set,
  };
}

/** Converte o formulário plano da UI para a estrutura JSONB do banco */
function formToDb(f: typeof EMPTY_FORM, workspaceId: string) {
  return {
    workspace_id: workspaceId,
    colors: {
      primary:    f.color_primary,
      secondary:  f.color_secondary,
      accent:     f.color_accent,
      background: f.color_bg_dark,
      bg_light:   f.color_bg_light,
      text:       f.color_text_dark,
      text_light: f.color_text_light,
      success:    f.color_success,
      warning:    f.color_warning,
      danger:     f.color_danger,
      palette:    f.custom_colors.map((c) => c.hex),
    },
    fonts: {
      heading: f.font_heading,
      body:    f.font_body,
      mono:    f.font_mono,
      display: f.font_display,
    },
    logos: {
      main_url:  f.logo_url      || null,
      dark_url:  f.logo_dark_url  || null,
      icon_url:  f.logo_icon_url  || null,
      light_url: f.logo_light_url || null,
    },
    voice: {
      border_radius_scale: f.border_radius_scale,
      shadow_style:        f.shadow_style,
      animation_style:     f.animation_style,
      icon_set:            f.icon_set,
    },
    updated_at: new Date().toISOString(),
  };
}

// ===================================
// COMPONENTE PRINCIPAL
// ===================================
export default function BrandKitPage() {
  const { workspace, brandKit: wsBrandKit, refetch } = useWorkspace();
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Deserializa JSONB do banco → form plano da UI
  useEffect(() => {
    if (!wsBrandKit) { setForm(EMPTY_FORM); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setForm(dbToForm(wsBrandKit as unknown as Record<string, any>));
  }, [wsBrandKit]);

  const handleSave = async (f = form) => {
    if (!workspace?.id) return;
    setIsSaving(true);
    try {
      // Serializa form plano → estrutura JSONB do banco
      const payload = formToDb(f, workspace.id);

      if (wsBrandKit) {
        const { error } = await fromTable('brand_kits')
          .update(payload)
          .eq('workspace_id', workspace.id);
        if (error) throw error;
      } else {
        const { error } = await fromTable('brand_kits').insert(payload);
        if (error) throw error;
      }

      await refetch();
      toast.success('DNA visual consolidado com sucesso!');
    } catch (error) {
      console.error('[BrandKitPage] handleSave error:', error);
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
      // Leitura correta do briefing usando campos JSONB reais do banco
      const { data: bData } = await fromTable('briefings')
        .select('company, content')
        .eq('workspace_id', workspace.id)
        .maybeSingle();

      // Normaliza para o formato esperado pela Edge Function
      const briefingData = bData ? {
        company_name:       bData.company?.name       || '',
        segment:            bData.company?.segment     || '',
        brand_dna:          bData.company?.brand_dna   || '',
        value_proposition:  bData.content?.value_proposition || '',
        tone_of_voice:      bData.content?.tone_of_voice     || '',
      } : {};

      const { data, error } = await supabase.functions.invoke("sw-brand-generate", {
        body: {
          workspace_id: workspace.id,
          briefing_data: briefingData,
        }
      });

      if (error) throw error;
      
      const aiResponse = data?.data;
      if (aiResponse) {
        toast.info('Aplicando Brand Kit...', { description: 'Injetando tokens no Design System.' });
        
        const nextForm = {
          ...form,
          color_primary:   aiResponse.colors?.primary   || form.color_primary,
          color_secondary: aiResponse.colors?.secondary || form.color_secondary,
          color_accent:    aiResponse.colors?.accent     || form.color_accent,
          color_bg_dark:   aiResponse.colors?.bg_dark    || form.color_bg_dark,
          color_bg_light:  aiResponse.colors?.bg_light   || form.color_bg_light,
          color_text_dark: aiResponse.colors?.text_dark  || form.color_text_dark,
          color_text_light:aiResponse.colors?.text_light || form.color_text_light,
          font_heading:    aiResponse.fonts?.heading || form.font_heading,
          font_body:       aiResponse.fonts?.body    || form.font_body,
          font_display:    aiResponse.fonts?.accent  || form.font_display,
        };
        
        updateForm(nextForm);
        await handleSave(nextForm);
        toast.success('DNA Visual (Brand Kit) gerado com sucesso!');
      } else {
        throw new Error('Retorno vazio da Inteligência Artificial');
      }
    } catch (e) {
      console.error('[BrandKitPage] handleAIMagic error:', e);
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

  const updateForm = (updates: Partial<typeof EMPTY_FORM>) => setForm(f => ({ ...f, ...updates }));

  return (
    <div className="flex h-full bg-[var(--surface-app)] text-[var(--text-primary)] overflow-hidden">
      {/* 
        ========================================
        COLUNA 1: EDITOR (Settings)
        ========================================
      */}
      <div className="flex-1 overflow-y-auto no-scrollbar border-r border-[var(--border)]">
        
        {/* Header Premium */}
        <div className="sticky top-0 z-20 backdrop-blur-3xl bg-[var(--surface-app)]/60 border-b border-[var(--border)] p-6 lg:p-8 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-2 opacity-70">
              <Palette size={16} className="text-[#a855f7]" /> <span className="text-xs font-semibold tracking-widest uppercase">Design System &amp; DNA</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white to-[#a8a8a8] bg-clip-text text-transparent">
              Brand Kit
            </h1>
            {wsBrandKit && (
              <p className="text-xs text-stone-500 mt-1 font-mono">
                Última atualização: {new Date(wsBrandKit.updated_at).toLocaleString('pt-BR')}
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
              {isSaving ? 'Salvando...' : 'Salvar Brand Kit'}
            </SwButton>
          </div>
        </div>

        {/* Formulário - Glass Cards */}
        <div className="p-6 lg:p-8 space-y-8 max-w-4xl">
          
          {/* Seção: Logomarcas */}
          <Section glass title="Logos e Identidade Gráfica" desc="Sincronize variações da logo para interfaces claras e escuras.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-2 font-medium">Logo Principal (Fundo Claro)</p>
                <MediaUploader folderPath={workspace?.id} value={form.logo_url} onChange={(v) => updateForm({logo_url:v})} label="Upload Logo Claro" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-2 font-medium">Logo Inversa (Fundo Escuro)</p>
                <MediaUploader folderPath={workspace?.id} value={form.logo_dark_url} onChange={(v) => updateForm({logo_dark_url:v})} label="Upload Logo Escuro" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-2 font-medium">Ícone / Favicon</p>
                <MediaUploader folderPath={workspace?.id} value={form.logo_icon_url} onChange={(v) => updateForm({logo_icon_url:v})} label="Upload Ícone" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-2 font-medium">Wordmark (Texto + Logo)</p>
                <MediaUploader folderPath={workspace?.id} value={form.logo_light_url} onChange={(v) => updateForm({logo_light_url:v})} label="Upload Wordmark" />
              </div>
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
              <ColorPicker label="Bg Light" val={form.color_bg_light} set={(v) => updateForm({color_bg_light:v})} />
              <ColorPicker label="Text Dark" val={form.color_text_dark} set={(v) => updateForm({color_text_dark:v})} />
              <ColorPicker label="Success" val={form.color_success} set={(v) => updateForm({color_success:v})} />
              <ColorPicker label="Warning" val={form.color_warning} set={(v) => updateForm({color_warning:v})} />
              <ColorPicker label="Danger" val={form.color_danger} set={(v) => updateForm({color_danger:v})} />
            </div>
          </Section>

          {/* Seção: Tipografia */}
          <Section glass title="Pilha Tipográfica" desc="Importado automaticamente do Google Fonts ao salvar.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FontSelect label="Font Heading" val={form.font_heading} options={FONTS_SANS} set={(v) => updateForm({font_heading:v})} />
              <FontSelect label="Font Body" val={form.font_body} options={FONTS_SANS} set={(v) => updateForm({font_body:v})} />
              <FontSelect label="Font Display" val={form.font_display} options={[...FONTS_SERIF, ...FONTS_DISPLAY]} set={(v) => updateForm({font_display:v})} />
              <FontSelect label="Font Mono" val={form.font_mono} options={FONTS_MONO} set={(v) => updateForm({font_mono:v})} />
            </div>
          </Section>

          {/* Seção: Estética & Borda */}
          <Section glass title="Estética &amp; Feel" desc="Define o comportamento global de UI do sistema.">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <SelectVal label="Arredondamento" val={form.border_radius_scale} options={['none','small','medium','large','pill']} set={(v: string) => updateForm({border_radius_scale: v as typeof EMPTY_FORM['border_radius_scale']})} />
              <SelectVal label="Sombras" val={form.shadow_style} options={['none','subtle','medium','strong']} set={(v: string) => updateForm({shadow_style: v as typeof EMPTY_FORM['shadow_style']})} />
              <SelectVal label="Motion" val={form.animation_style} options={['none','minimal','smooth','bouncy']} set={(v: string) => updateForm({animation_style: v as typeof EMPTY_FORM['animation_style']})} />
              <SelectVal label="Icon Set" val={form.icon_set} options={['lucide','phosphor','heroicons']} set={(v: string) => updateForm({icon_set: v as typeof EMPTY_FORM['icon_set']})} />
            </div>
          </Section>

        </div>
      </div>

      {/* 
        ========================================
        COLUNA 2: PREVIEW LIVE
        ========================================
      */}
      <div className="w-[380px] shrink-0 border-r border-[var(--border)] bg-[var(--surface-app)] hidden xl:flex flex-col relative overflow-hidden">
        <style>{injectedCSS}</style>
        
        {/* Fundo do preview com degradê das cores do kit */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
          background: `radial-gradient(circle at 50% 0%, ${form.color_primary} 0%, transparent 70%), radial-gradient(circle at 100% 100%, ${form.color_secondary} 0%, transparent 70%)`
        }} />

        <div className="p-6 border-b border-[var(--border)] z-10 bg-[var(--surface-app)]/50 backdrop-blur-md">
          <h2 className="text-sm font-bold flex gap-2 items-center text-white"><LayoutTemplate size={16} /> Live Preview</h2>
          <p className="text-xs text-stone-400 mt-1">Sua interface será gerada com estes tokens exatos.</p>
        </div>

        <div className="flex-1 p-6 overflow-y-auto no-scrollbar z-10 flex flex-col gap-6">
          
          {/* Mock Component 1: Login / Card */}
          <div className="pvw-card p-6 pvw-bg transition-all duration-300">
            {form.logo_url ? (
              <img src={form.logo_url} alt="Logo" className="h-6 mb-6 object-contain" />
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

          {/* Color palette preview */}
          <div className="pvw-card p-4">
            <p className="pvw-mono text-[10px] uppercase opacity-60 mb-3">Color Tokens</p>
            <div className="flex gap-2 flex-wrap">
              {[form.color_primary, form.color_secondary, form.color_accent, form.color_success, form.color_warning, form.color_danger].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-lg border border-white/10" style={{ backgroundColor: c }} title={c} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 
        ========================================
        COLUNA 3: HISTÓRICO & STATUS
        ========================================
      */}
      <div className="w-[300px] shrink-0 bg-[var(--surface-app)] hidden 2xl:flex flex-col">
        <div className="p-6 border-b border-[#1f1f1f]">
          <h2 className="text-sm font-bold flex gap-2 items-center text-white"><History size={16} /> Versões &amp; Auditoria</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex flex-col gap-4 relative pl-4 border-l border-[#333]">
            <div className="relative">
              <div className="absolute -left-[20.5px] top-1 rounded-full bg-[#10b981] w-[8px] h-[8px] shadow-[0_0_10px_#10b981]" />
              <p className="text-[10px] font-mono text-stone-500 mb-0.5">ESTADO ATUAL</p>
              <p className="text-sm text-stone-100 font-medium">{wsBrandKit ? 'Sincronizado com banco' : 'Não configurado'}</p>
            </div>
            <div className="relative opacity-40">
              <div className="absolute -left-[20.5px] top-1 rounded-full bg-[#555] w-[8px] h-[8px]" />
              <p className="text-[10px] font-mono mb-0.5">SCHEMA</p>
              <p className="text-sm font-medium">JSONB: colors / fonts / logos / voice</p>
            </div>
          </div>

          <div className="bg-[var(--surface-2)] p-4 rounded-xl border border-[var(--border)]">
            <p className="text-xs font-bold mb-3 flex items-center gap-1.5"><CheckCircle2 className="text-[#a855f7]" size={14} /> Checklist do Motor</p>
            <ul className="text-xs space-y-2 text-stone-400">
              <li className={form.color_primary !== '#7C3AED' ? 'text-green-400' : ''}>• Paleta personalizada {form.color_primary !== '#7C3AED' ? '✓' : '(padrão)'}</li>
              <li className={form.font_heading !== 'Inter' ? 'text-green-400' : ''}>• Fontes configuradas {form.font_heading !== 'Inter' ? '✓' : '(padrão)'}</li>
              <li className={form.logo_url ? 'text-green-400' : ''}>• Logo carregada {form.logo_url ? '✓' : '(faltando)'}</li>
            </ul>
          </div>

          {wsBrandKit && (
            <div className="bg-[var(--surface-2)] p-4 rounded-xl border border-[var(--border)]">
              <p className="text-[10px] font-mono text-stone-500 mb-2 uppercase tracking-widest">Schema real no banco</p>
              <pre className="text-[10px] text-stone-400 overflow-auto">
{`colors.primary: "${form.color_primary}"
fonts.heading: "${form.font_heading}"
logos.main_url: "${form.logo_url || 'null'}"`}
              </pre>
            </div>
          )}
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
    <div className="flex bg-[var(--surface-2)] border border-[var(--border)] rounded-xl overflow-hidden focus-within:border-[var(--sw-accent)] transition-colors p-1.5 pr-3 items-center gap-2">
      <input type="color" value={val} onChange={e => set(e.target.value)} className="w-8 h-8 rounded shrink-0 border-0 bg-transparent cursor-pointer" />
      <input type="text" value={val} onChange={e => set(e.target.value)} className="w-full bg-transparent text-xs text-white outline-none font-mono tracking-wider font-semibold" />
    </div>
  </div>
);

const Input = ({ label, val, set }: BaseProps) => (
  <div>
    <label className="block text-[10px] font-bold mb-2 uppercase tracking-widest text-[#777] font-mono">{label}</label>
    <SwInput value={val} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set(e.target.value)} placeholder="https://..." />
  </div>
);

interface SelectProps extends BaseProps { options: string[]; }

const SelectVal = ({ label, val, options, set }: SelectProps) => (
  <div>
    <label className="block text-[10px] font-bold mb-2 uppercase tracking-widest text-[#777] font-mono">{label}</label>
    <SwSelect value={val} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set(e.target.value)}>
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
