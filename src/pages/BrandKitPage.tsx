import { useEffect, useMemo, useState } from 'react';
import { Palette, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
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
    if (!wsBrandKit) {
      setForm(EMPTY_FORM);
      return;
    }

    setForm({
      color_primary: wsBrandKit.color_primary,
      color_secondary: wsBrandKit.color_secondary,
      color_accent: wsBrandKit.color_accent,
      color_bg_dark: wsBrandKit.color_bg_dark,
      color_bg_light: wsBrandKit.color_bg_light,
      color_text_dark: wsBrandKit.color_text_dark,
      color_text_light: wsBrandKit.color_text_light,
      font_headline: wsBrandKit.font_headline,
      font_body: wsBrandKit.font_body,
      font_accent: wsBrandKit.font_accent,
      logo_url: wsBrandKit.logo_url || '',
      logo_dark_url: wsBrandKit.logo_dark_url || '',
      watermark_text: wsBrandKit.watermark_text || '',
      custom_colors: Array.isArray(wsBrandKit.custom_colors) ? wsBrandKit.custom_colors : [],
    });
  }, [wsBrandKit]);

  const previewHtml = useMemo(() => {
    const brand = {
      ...DEFAULT_BRAND_KIT,
      ...form,
      logo_url: form.logo_url || null,
      watermark_text: form.watermark_text || null,
    };

    return minimalDark(
      {
        headline: 'Sua marca em destaque',
        body: 'Preview em tempo real com cores, fontes e watermark.',
      },
      brand,
    );
  }, [form]);

  const setColor = (field: ColorFieldName, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const setFont = (field: FontFieldName, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const updateCustomColor = (index: number, patch: Partial<CustomColor>) => {
    setForm(current => ({
      ...current,
      custom_colors: current.custom_colors.map((color, currentIndex) => (
        currentIndex === index ? { ...color, ...patch } : color
      )),
    }));
  };

  const addCustomColor = () => {
    setForm(current => ({
      ...current,
      custom_colors: [...current.custom_colors, { name: '', hex: '#FFFFFF' }],
    }));
  };

  const removeCustomColor = (index: number) => {
    setForm(current => ({
      ...current,
      custom_colors: current.custom_colors.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const handleSave = async () => {
    if (!workspace?.id) return;

    setIsSaving(true);
    try {
      const payload = {
        ...form,
        logo_url: form.logo_url || null,
        logo_dark_url: form.logo_dark_url || null,
        watermark_text: form.watermark_text || null,
        updated_at: new Date().toISOString(),
      };

      if (wsBrandKit) {
        await supabase.from('brand_kits').update(payload).eq('workspace_id', workspace.id);
      } else {
        await supabase.from('brand_kits').insert({ ...payload, workspace_id: workspace.id });
      }

      await refreshBrandKit();
      toast.success('Brand Kit salvo');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar Brand Kit');
    } finally {
      setIsSaving(false);
    }
  };

  const cardStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
  } as const;
  const inputStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-1)',
  } as const;
  const fieldClass = 'w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors';

  const ColorField = ({ label, field }: { label: string; field: ColorFieldName }) => (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-2)' }}>
        {label}
      </label>
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={inputStyle}>
        <input
          type="color"
          value={form[field]}
          onChange={event => setColor(field, event.target.value)}
          className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
        />
        <input
          value={form[field]}
          onChange={event => setColor(field, event.target.value)}
          className="flex-1 text-xs font-mono bg-transparent outline-none"
          style={{ color: 'var(--text-2)' }}
        />
      </div>
    </div>
  );

  const FontPicker = ({ label, field }: { label: string; field: FontFieldName }) => (
    <div>
      <p className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>
        {label}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {FONTS.map(font => (
          <button
            key={`${field}-${font.name}`}
            onClick={() => setFont(field, font.name)}
            className="p-3 rounded-xl text-left transition-all"
            style={{
              background: form[field] === font.name ? 'var(--primary-muted)' : 'var(--bg-elevated)',
              border: `1px solid ${form[field] === font.name ? 'var(--primary)' : 'var(--border)'}`,
            }}
          >
            <p className="text-base font-bold" style={{ fontFamily: font.css, color: 'var(--text-1)' }}>
              {font.name}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>
              {font.label}
            </p>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div
          className="flex items-center gap-3 px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}
        >
          <Palette size={20} style={{ color: 'var(--primary)' }} />
          <h1 className="text-lg font-bold font-display" style={{ color: 'var(--text-1)' }}>
            Brand Kit
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="rounded-2xl p-5" style={cardStyle}>
            <h3 className="font-semibold font-display mb-4" style={{ color: 'var(--text-1)' }}>
              Cores principais
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <ColorField label="Primaria" field="color_primary" />
              <ColorField label="Secundaria" field="color_secondary" />
              <ColorField label="Accent" field="color_accent" />
              <ColorField label="Fundo escuro" field="color_bg_dark" />
              <ColorField label="Fundo claro" field="color_bg_light" />
              <ColorField label="Texto escuro" field="color_text_dark" />
              <ColorField label="Texto claro" field="color_text_light" />
            </div>
          </div>

          <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold font-display" style={{ color: 'var(--text-1)' }}>
                Cores customizadas
              </h3>
              <button
                onClick={addCustomColor}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium"
                style={{ background: 'var(--primary-muted)', border: '1px solid var(--primary)', color: 'var(--primary)' }}
              >
                <Plus size={12} />
                Adicionar
              </button>
            </div>

            {form.custom_colors.length === 0 ? (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border)', color: 'var(--text-3)' }}
              >
                Nenhuma cor extra cadastrada.
              </div>
            ) : (
              <div className="space-y-2">
                {form.custom_colors.map((color, index) => (
                  <div key={`${color.name}-${index}`} className="grid grid-cols-[1fr_140px_48px] gap-2">
                    <input
                      value={color.name}
                      onChange={event => updateCustomColor(index, { name: event.target.value })}
                      placeholder="Nome da cor"
                      className={fieldClass}
                      style={inputStyle}
                    />
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={inputStyle}>
                      <input
                        type="color"
                        value={color.hex}
                        onChange={event => updateCustomColor(index, { hex: event.target.value })}
                        className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                      />
                      <input
                        value={color.hex}
                        onChange={event => updateCustomColor(index, { hex: event.target.value })}
                        className="flex-1 text-xs font-mono bg-transparent outline-none"
                        style={{ color: 'var(--text-2)' }}
                      />
                    </div>
                    <button
                      onClick={() => removeCustomColor(index)}
                      className="rounded-xl flex items-center justify-center"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: '#EF4444' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
            <h3 className="font-semibold font-display" style={{ color: 'var(--text-1)' }}>
              Tipografia
            </h3>
            <FontPicker label="Fonte de titulos" field="font_headline" />
            <FontPicker label="Fonte de corpo" field="font_body" />
            <FontPicker label="Fonte de destaque" field="font_accent" />
          </div>

          <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
            <h3 className="font-semibold font-display" style={{ color: 'var(--text-1)' }}>
              Logo e marca
            </h3>
            <input
              value={form.logo_url}
              onChange={event => setForm(current => ({ ...current, logo_url: event.target.value }))}
              placeholder="URL do logo claro"
              className={fieldClass}
              style={inputStyle}
            />
            <input
              value={form.logo_dark_url}
              onChange={event => setForm(current => ({ ...current, logo_dark_url: event.target.value }))}
              placeholder="URL do logo escuro"
              className={fieldClass}
              style={inputStyle}
            />
            <input
              value={form.watermark_text}
              onChange={event => setForm(current => ({ ...current, watermark_text: event.target.value }))}
              placeholder="@suaempresa"
              className={fieldClass}
              style={inputStyle}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
            style={{ background: 'var(--primary)', color: 'white', boxShadow: '0 8px 24px rgba(124,58,237,0.25)' }}
          >
            <Save size={15} />
            {isSaving ? 'Salvando...' : 'Salvar Brand Kit'}
          </button>
        </div>
      </div>

      <div className="w-80 shrink-0 flex flex-col" style={{ borderLeft: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <div className="px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
            Preview ao vivo
          </p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            Atualiza em tempo real
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div
            style={{
              width: 240,
              height: 240,
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
            }}
          >
            <iframe
              srcDoc={previewHtml}
              title="brand-kit-preview"
              sandbox="allow-same-origin"
              scrolling="no"
              style={{
                width: 540,
                height: 540,
                border: 'none',
                transform: 'scale(0.444)',
                transformOrigin: 'top left',
                display: 'block',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandKitPage;
