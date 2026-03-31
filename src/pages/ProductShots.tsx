import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPalette } from 'colorthief';
import { Camera, Copy, Loader2, Sparkles, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { PHASE2_PROMPT_PLATFORMS, PLATFORM_PARAM_SUFFIX, PRODUCT_SHOT_PRESETS, PromptPlatform } from '@/lib/postgenPhase2';

type MediaAsset = Tables<'media_assets'>;

const lightingPresets = ['Clean Softbox', 'Dramatic Studio', 'Golden Backlit', 'Minimal'];

const rgbToHex = (value: number[]) => `#${value.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;

const ProductShots = () => {
  const navigate = useNavigate();
  const { workspace, brandKit } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
  const [productDescription, setProductDescription] = useState('');
  const [palette, setPalette] = useState<string[]>([]);
  const [productCategory, setProductCategory] = useState('Outro');
  const [selectedPreset, setSelectedPreset] = useState(PRODUCT_SHOT_PRESETS[0].id);
  const [backgroundColor, setBackgroundColor] = useState('#1a1a1a');
  const [elements, setElements] = useState('');
  const [lighting, setLighting] = useState(lightingPresets[0]);
  const [platform, setPlatform] = useState<PromptPlatform>('midjourney');
  const [savedAssets, setSavedAssets] = useState<MediaAsset[]>([]);
  const [generatedAsset, setGeneratedAsset] = useState<MediaAsset | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedPresetModel = useMemo(
    () => PRODUCT_SHOT_PRESETS.find((preset) => preset.id === selectedPreset) || PRODUCT_SHOT_PRESETS[0],
    [selectedPreset],
  );

  const loadAssets = useCallback(async () => {
    if (!workspace?.id) return;
    const { data } = await supabase
      .from('media_assets')
      .select('*')
      .eq('workspace_id', workspace.id)
      .eq('module', 'product-shots')
      .order('created_at', { ascending: false })
      .limit(12);
    setSavedAssets((data || []) as MediaAsset[]);
  }, [workspace?.id]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const prompt = useMemo(() => {
    const paletteHint = palette.length > 0
      ? palette.join(', ')
      : [brandKit?.color_primary, brandKit?.color_secondary, brandKit?.color_accent].filter(Boolean).join(', ');

    const base = [
      `Use the uploaded product image as the exact product reference.`,
      `Product category: ${productCategory}.`,
      `Shot type: ${selectedPresetModel.name}. ${selectedPresetModel.promptHint}`,
      `Product description: ${productDescription || 'Premium commercial product.'}`,
      `Background color: ${backgroundColor}.`,
      `Lighting preset: ${lighting}.`,
      `Brand palette: ${paletteHint}.`,
      elements ? `Additional elements: ${elements}.` : '',
      `Maintain packaging shape, branding and proportions from the reference.`,
      `No text overlays. No watermarks. Ultra-realistic premium product photography.`,
    ].filter(Boolean).join('\n');

    const platformSuffix = PLATFORM_PARAM_SUFFIX[platform].suffix.replace('{ratio}', '1:1');
    return `${base}\n${platformSuffix}`.trim();
  }, [backgroundColor, brandKit?.color_accent, brandKit?.color_primary, brandKit?.color_secondary, elements, lighting, palette, platform, productCategory, productDescription, selectedPresetModel]);

  const handleExtractPalette = async (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setProductImageUrl(objectUrl);
    if (!productDescription) {
      setProductDescription(file.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' '));
    }

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = async () => {
      try {
        const extractedPalette = await getPalette(image, { colorCount: 5, quality: 8 });
        const extracted = (extractedPalette || []).map((color: any) => rgbToHex(Array.isArray(color) ? color : [color.r ?? color[0], color.g ?? color[1], color.b ?? color[2]]));
        setPalette(extracted);
        setBackgroundColor(extracted[0] || '#1a1a1a');

        if (workspace?.id) {
          const { data } = await supabase.functions.invoke('extract-product-colors', {
            body: {
              workspace_id: workspace.id,
              provided_palette: extracted,
              product_description: productDescription || file.name,
              filename: file.name,
            },
          });
          if (Array.isArray(data?.palette) && data.palette.length > 0) {
            setPalette(data.palette);
            setBackgroundColor(data.palette[0]);
          }
          if (data?.product_category) {
            setProductCategory(data.product_category);
          }
        }
      } catch (error) {
        console.error(error);
        toast.warning('Nao foi possivel extrair toda a paleta do upload');
      }
    };
    image.src = objectUrl;
  };

  const handleGenerate = async () => {
    if (!workspace?.id || !prompt.trim()) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: {
          workspace_id: workspace.id,
          prompt,
          aspect_ratio: '1:1',
          purpose: 'product-shots',
        },
      });
      if (error) throw error;
      if (data?.asset) {
        setGeneratedAsset(data.asset as MediaAsset);
        setSavedAssets((current) => [data.asset as MediaAsset, ...current]);
        toast.success('Shot gerado e salvo na media library');
      }
    } catch (error) {
      console.error(error);
      toast.error('Nao foi possivel gerar a imagem');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-8 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <p className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--text-3)' }}>
            Product Photography Module
          </p>
          <h1 className="mt-2 text-3xl font-display font-bold" style={{ color: 'var(--text-1)' }}>
            Product Shots
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: 'var(--text-2)' }}>
            Upload do produto, extracao de paleta, montagem de prompt e geracao opcional no mesmo fluxo. Os
            resultados vao para a media library e podem ser usados como fundo no gerador.
          </p>
        </div>

        <div className="p-8 space-y-6">
          <div className="rounded-3xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6">
              <div className="space-y-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full min-h-[280px] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-colors"
                  style={{ borderColor: 'var(--primary)', background: 'rgba(124,58,237,0.08)' }}
                >
                  {productImageUrl ? (
                    <img src={productImageUrl} alt="Produto" className="w-full h-full object-cover rounded-[22px]" />
                  ) : (
                    <>
                      <Upload size={28} style={{ color: 'var(--primary)' }} />
                      <div className="text-center">
                        <p className="font-semibold" style={{ color: 'var(--text-1)' }}>Arraste ou selecione o produto</p>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Aceita image/* e usa ColorThief para extrair a paleta.</p>
                      </div>
                    </>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleExtractPalette(file);
                  }}
                />

                <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>Paleta extraida</p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {palette.length === 0 ? (
                      <span className="text-sm" style={{ color: 'var(--text-3)' }}>Aguardando upload.</span>
                    ) : (
                      palette.map((color) => (
                        <button
                          key={color}
                          onClick={() => setBackgroundColor(color)}
                          className="w-12 h-12 rounded-2xl border"
                          style={{ background: color, borderColor: color === backgroundColor ? '#fff' : 'rgba(255,255,255,0.12)' }}
                        />
                      ))
                    )}
                  </div>
                  <p className="mt-4 text-sm" style={{ color: 'var(--text-2)' }}>Categoria detectada: {productCategory}</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Descricao do produto</label>
                  <Input value={productDescription} onChange={(event) => setProductDescription(event.target.value)} placeholder="Chocolate premium com recheio cremoso" />
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Tipo de shot</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {PRODUCT_SHOT_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => setSelectedPreset(preset.id)}
                        className="rounded-2xl p-4 text-left transition-all"
                        style={{
                          background: selectedPreset === preset.id ? 'var(--primary-muted)' : 'var(--bg-card)',
                          border: `1px solid ${selectedPreset === preset.id ? 'var(--primary)' : 'var(--border)'}`,
                        }}
                      >
                        <p className="font-semibold" style={{ color: 'var(--text-1)' }}>{preset.name}</p>
                        <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-3)' }}>{preset.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Cor de fundo</label>
                    <div className="flex gap-2">
                      <Input type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} className="w-14 h-10 p-1" />
                      <Input value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Lighting</label>
                    <div className="grid grid-cols-2 gap-2">
                      {lightingPresets.map((item) => (
                        <button
                          key={item}
                          onClick={() => setLighting(item)}
                          className="rounded-xl px-3 py-2 text-sm"
                          style={{
                            background: lighting === item ? 'var(--primary-muted)' : 'var(--bg-card)',
                            border: `1px solid ${lighting === item ? 'var(--primary)' : 'var(--border)'}`,
                            color: lighting === item ? 'var(--primary)' : 'var(--text-2)',
                          }}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Elementos adicionais</label>
                    <Textarea value={elements} onChange={(event) => setElements(event.target.value)} placeholder="crumbs, pouring sauce, eucalyptus leaves..." className="min-h-[90px] resize-none" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Plataforma alvo</label>
                    <div className="grid grid-cols-2 xl:grid-cols-5 gap-2">
                      {PHASE2_PROMPT_PLATFORMS.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setPlatform(item.id)}
                          className="rounded-xl px-3 py-2 text-sm"
                          style={{
                            background: platform === item.id ? 'var(--primary-muted)' : 'var(--bg-card)',
                            border: `1px solid ${platform === item.id ? 'var(--primary)' : 'var(--border)'}`,
                            color: platform === item.id ? 'var(--primary)' : 'var(--text-2)',
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
            <div className="rounded-3xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--text-1)' }}>
                    Prompt preview
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                    O prompt e compilado localmente e pode ser enviado para a IA ou copiado para uso externo.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => navigator.clipboard.writeText(prompt)}>
                    <Copy size={14} />
                  </Button>
                  <Button onClick={handleGenerate} disabled={isGenerating || !productImageUrl} className="gap-2" style={{ background: 'var(--primary)', color: '#fff' }}>
                    {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {isGenerating ? 'Gerando...' : 'Gerar via IA'}
                  </Button>
                </div>
              </div>

              <pre className="whitespace-pre-wrap text-sm leading-7 rounded-2xl p-4" style={{ background: 'var(--bg-card)', color: 'var(--text-1)', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>
                {prompt}
              </pre>
            </div>

            <div className="rounded-3xl p-6 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--text-1)' }}>
                Resultados
              </h2>

              {generatedAsset ? (
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <img src={generatedAsset.public_url} alt="Generated product shot" className="w-full aspect-square object-cover" />
                  <div className="p-4 flex flex-wrap gap-2">
                    <Button onClick={() => navigate('../generator', {
                      state: {
                        topic: productDescription,
                        mediaAsset: generatedAsset,
                        recommendedTemplate: 'editorial-magazine',
                      },
                    })}>
                      Usar como fundo
                    </Button>
                    <Button variant="outline" onClick={() => navigator.clipboard.writeText(prompt)}>
                      Copiar prompt
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl p-5 text-sm" style={{ background: 'var(--bg-card)', color: 'var(--text-3)' }}>
                  Nenhuma geracao nesta sessao ainda.
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-2)' }}>Biblioteca recente</p>
                <div className="grid grid-cols-2 gap-3">
                  {savedAssets.slice(0, 6).map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => setGeneratedAsset(asset)}
                      className="rounded-2xl overflow-hidden"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                    >
                      <img src={asset.public_url} alt={asset.asset_type} className="w-full aspect-square object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductShots;
