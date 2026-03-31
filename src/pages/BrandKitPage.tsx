import { useEffect, useMemo, useState } from 'react';
import { Palette, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { DEFAULT_BRAND_KIT } from '@/lib/canvasEngine';
import { minimalDark } from '@/lib/templates/minimalDark';

type ColorFieldName =
  | 'color_primary'
  | 'color_secondary'
  | 'color_accent'
  | 'color_bg_dark'
  | 'color_bg_light'
  | 'color_text_dark'
  | 'color_text_light';

type FontFieldName = 'font_headline' | 'font_body' | 'font_accent';

interface CustomColor {
  name: string;
  hex: string;
}

interface BrandKitForm {
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  color_bg_dark: string;
  color_bg_light: string;
  color_text_dark: string;
  color_text_light: string;
  font_headline: string;
  font_body: string;
  font_accent: string;
  logo_url: string;
  logo_dark_url: string;
  watermark_text: string;
  custom_colors: CustomColor[];
}

const FONTS = [
  { name: 'Bebas Neue', label: 'Impacto', css: "'Bebas Neue', sans-serif" },
  { name: 'DM Sans', label: 'Moderno', css: "'DM Sans', sans-serif" },
  { name: 'Playfair Display', label: 'Elegante', css: "'Playfair Display', serif" },
  { name: 'Syne', label: 'Futurista', css: "'Syne', sans-serif" },
  { name: 'Oswald', label: 'Bold', css: "'Oswald', sans-serif" },
  { name: 'Montserrat', label: 'Versatil', css: "'Montserrat', sans-serif" },
];

const EMPTY_FORM: BrandKitForm = {
  color_primary: '#7C3AED',
  color_secondary: '#06B6D4',
  color_accent: '#F59E0B',
  color_bg_dark: '#09090F',
  color_bg_light: '#FFFFFF',
  color_text_dark: '#111111',
  color_text_light: '#F8FAFC',
  font_headline: 'Bebas Neue',
  font_body: 'DM Sans',
  font_accent: 'Playfair Display',
  logo_url: '',
  logo_dark_url: '',
  watermark_text: '',
  custom_colors: [],
};

const BrandKitPage = () => {
  const { workspace, brandKit: wsBrandKit, refreshBrandKit } = useWorkspace();
  const [form, setForm] = useState<BrandKitForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!wsBrandKit) { setForm(EMPTY_FORM); return; }
    setForm({
      color_primary:   wsBrandKit.color_primary,
      color_secondary: wsBrandKit.color_secondary,
      color_accent:    wsBrandKit.color_accent,
      color_bg_dark:   wsBrandKit.color_bg_dark,
      color_bg_light:  wsBrandKit.color_bg_light,
      color_text_dark: wsBrandKit.color_text_dark,
      color_text_light:wsBrandKit.color_text_light,
      font_headline:   wsBrandKit.font_headline,
      font_body:       wsBrandKit.font_body,
      font_accent:     wsBrandKit.font_accent,
      logo_url:        wsBrandKit.logo_url || '',
      logo_dark_url:   wsBrandKit.logo_dark_url || '',
      watermark_text:  wsBrandKit.watermark_text || '',
      custom_colors:   Array.isArray(wsBrandKit.custom_colors) ? wsBrandKit.custom_colors as CustomColor[] : [],
    });
  }, [wsBrandKit]);

  const previewHtml = useMemo(() => {
    const brand = { ...DEFAULT_BRAND_KIT, ...form, logo_url: form.logo_url || null, watermark_text: form.watermark_text || null };
    return minimalDark({ headline: 'Sua marca em destaque', body: 'Preview em tempo real com cores, fontes e watermark.' }, brand);
  }, [form]);

  const setColor = (field: ColorFieldName, value: string) => setForm(c => ({ ...c, [field]: value }));
  const setFont = (field: FontFieldName, value: string) => setForm(c => ({ ...c, [field]: value }));

  const addCustomColor = () => setForm(c => ({ ...c, custom_colors: [...c.custom_colors, { name: '', hex: '#FFFFFF' }] }));
  const removeCustomColor = (index: number) => setForm(c => ({ ...c, custom_colors: c.custom_colors.filter((_, i) => i !== index) }));
  const updateCustomColor = (index: number, patch: Partial<CustomColor>) =>
    setForm(c => ({ ...c, custom_colors: c.custom_colors.map((col, i) => i === index ? { ...col, ...patch } : col) }));

  const handleSave = async () => {
    if (!workspace?.id) return;
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        custom_colors: form.custom_colors as unknown as Json,
        logo_url: form.logo_url || null,
        logo_dark_url: form.logo_dark_url || null,
        watermark_text: form.watermark_text || null,
        updated_at: new Date().toISOString(),
      };
      if (wsBrandKit) {
        await supabase.from('brand_kits').update(payload).eq('workspace_id', workspace.id);
      } else {
        await supabase.from('brand_kits').insert({ ...payload, workspace_id: workspace.id, custom_colors: payload.custom_colors as Json });
      }
      await refreshBrandKit();
      toast.success('Brand Kit salvo com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar Brand Kit');
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)' } as const;
  const fieldClass = 'w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors';

  const ColorField = ({ label, field }: { label: string; field: ColorFieldName }) => (
    <div>
      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>{label}</label>
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={inputStyle}>
        <input type="color" value={form[field]} onChange={e => setColor(field, e.target.value)}
          className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer" />
        <input value={form[field]} onChange={e => setColor(field, e.target.value)}
          className="flex-1 text-xs font-mono bg-transparent outline-none" style={{ color: 'var(--text-2)' }} />
      </div>
    </div>
  );

  const FontPicker = ({ label, field }: { label: string; field: FontFieldName }) => (
    <div>
      <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {FONTS.map(font => (
          <button key={`${field}-${font.name}`} onClick={() => setFont(field, font.name)}
            className="p-3 rounded-xl text-left transition-all"
            style={{
              background: form[field] === font.name ? 'var(--primary-muted)' : 'var(--bg-elevated)',
              border: `1px solid ${form[field] === font.name ? 'var(--primary)' : 'var(--border)'}`,
            }}>
            <p className="text-base font-bold" style={{ fontFamily: font.css, color: 'var(--text-1)' }}>{font.name}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>{font.label}</p>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      {/* Editor column */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Premium hero */}
        <div className="page-hero">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="page-hero-eyebrow">Intelligence Suite • Brand Kit</p>
              <h1 className="page-hero-title" style={{ fontSize: '2rem' }}>Brand Kit</h1>
              <p className="text-sm mt-2" style={{ color: 'var(--text-3)' }}>
                Cores, tipografia e identidade visual — propagados para todos os módulos
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 disabled:opacity-50"
              style={{ background: 'var(--primary)', color: '#fff', boxShadow: '0 8px 24px rgba(124,58,237,0.3)' }}
            >
              <Save size={15} />
              {isSaving ? 'Salvando...' : 'Salvar Brand Kit'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 no-scrollbar space-y-6">
          {/* Colors */}
          <div className="glass-card rounded-3xl p-6">
            <h3 className="font-display font-bold text-base mb-5" style={{ color: 'var(--text-1)' }}>Paleta de Cores</h3>
            <div className="grid grid-cols-2 gap-3">
              <ColorField label="Primária" field="color_primary" />
              <ColorField label="Secundária" field="color_secondary" />
              <ColorField label="Accent" field="color_accent" />
              <ColorField label="Fundo escuro" field="color_bg_dark" />
              <ColorField label="Fundo claro" field="color_bg_light" />
              <ColorField label="Texto escuro" field="color_text_dark" />
              <ColorField label="Texto claro" field="color_text_light" />
            </div>
          </div>

          {/* Custom colors */}
          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-base" style={{ color: 'var(--text-1)' }}>Cores Adicionais</h3>
              <button onClick={addCustomColor}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                style={{ background: 'var(--primary-muted)', border: '1px solid var(--primary)', color: 'var(--primary)' }}>
                <Plus size={12} /> Adicionar
              </button>
            </div>
            {form.custom_colors.length === 0 ? (
              <div className="rounded-xl px-4 py-3 text-sm text-center"
                style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border)', color: 'var(--text-3)' }}>
                Nenhuma cor extra cadastrada.
              </div>
            ) : (
              <div className="space-y-2">
                {form.custom_colors.map((color, index) => (
                  <div key={`${color.name}-${index}`} className="grid grid-cols-[1fr_140px_48px] gap-2">
                    <input value={color.name} onChange={e => updateCustomColor(index, { name: e.target.value })}
                      placeholder="Nome da cor" className={fieldClass} style={inputStyle} />
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={inputStyle}>
                      <input type="color" value={color.hex} onChange={e => updateCustomColor(index, { hex: e.target.value })}
                        className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer" />
                      <input value={color.hex} onChange={e => updateCustomColor(index, { hex: e.target.value })}
                        className="flex-1 text-xs font-mono bg-transparent outline-none" style={{ color: 'var(--text-2)' }} />
                    </div>
                    <button onClick={() => removeCustomColor(index)}
                      className="rounded-xl flex items-center justify-center"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: '#EF4444' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fonts */}
          <div className="glass-card rounded-3xl p-6 space-y-6">
            <h3 className="font-display font-bold text-base" style={{ color: 'var(--text-1)' }}>Tipografia</h3>
            <FontPicker label="Fonte de Títulos" field="font_headline" />
            <FontPicker label="Fonte de Corpo" field="font_body" />
            <FontPicker label="Fonte de Destaque" field="font_accent" />
          </div>

          {/* Logo & identity */}
          <div className="glass-card rounded-3xl p-6 space-y-4">
            <h3 className="font-display font-bold text-base" style={{ color: 'var(--text-1)' }}>Logo & Marca d'Água</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
                  URL do Logo (fundo claro)
                </label>
                <input value={form.logo_url}
                  onChange={e => setForm(c => ({ ...c, logo_url: e.target.value }))}
                  placeholder="https://..." className={fieldClass} style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
                  URL do Logo (fundo escuro)
                </label>
                <input value={form.logo_dark_url}
                  onChange={e => setForm(c => ({ ...c, logo_dark_url: e.target.value }))}
                  placeholder="https://..." className={fieldClass} style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
                  Texto Marca d'Água
                </label>
                <input value={form.watermark_text}
                  onChange={e => setForm(c => ({ ...c, watermark_text: e.target.value }))}
                  placeholder="@suamarca" className={fieldClass} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Mobile save */}
          <button onClick={handleSave} disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all disabled:opacity-60 xl:hidden"
            style={{ background: 'var(--primary)', color: 'white', boxShadow: '0 8px 24px rgba(124,58,237,0.25)' }}>
            <Save size={15} />
            {isSaving ? 'Salvando...' : 'Salvar Brand Kit'}
          </button>
        </div>
      </div>

      {/* Right: live preview */}
      <div className="hidden xl:flex w-80 shrink-0 flex-col" style={{ borderLeft: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <div className="px-5 py-5 shrink-0 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Preview ao vivo</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Atualiza em tempo real com suas cores e fontes</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-start gap-6 p-6 overflow-y-auto no-scrollbar">
          {/* Template preview */}
          <div>
            <p className="text-xs font-semibold mb-3 text-center uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Template Preview</p>
            <div style={{ width: 240, height: 240, borderRadius: 12, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}>
              <iframe srcDoc={previewHtml} title="brand-kit-preview" sandbox="allow-same-origin" scrolling="no"
                style={{ width: 540, height: 540, border: 'none', transform: 'scale(0.444)', transformOrigin: 'top left', display: 'block' }} />
            </div>
          </div>
          {/* Color swatch */}
          <div className="w-full">
            <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Paleta atual</p>
            <div className="flex gap-2 flex-wrap">
              {[form.color_primary, form.color_secondary, form.color_accent, form.color_bg_dark, form.color_accent].map((color, i) => (
                <div key={i} className="w-10 h-10 rounded-xl border" style={{ background: color, borderColor: 'rgba(255,255,255,0.1)' }}
                  title={color} />
              ))}
            </div>
          </div>
          {/* Font preview */}
          <div className="w-full space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Tipografia</p>
            <div className="glass-card rounded-2xl p-4 space-y-2">
              <p className="font-bold text-2xl" style={{ fontFamily: `'${form.font_headline}', sans-serif`, color: 'var(--text-1)' }}>
                Headline
              </p>
              <p className="text-sm" style={{ fontFamily: `'${form.font_body}', sans-serif`, color: 'var(--text-2)' }}>
                Corpo do texto com legibilidade
              </p>
              <p className="text-xs italic" style={{ fontFamily: `'${form.font_accent}', serif`, color: 'var(--text-3)' }}>
                Destaque editorial
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandKitPage;
