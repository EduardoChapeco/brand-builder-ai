import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Copy, ImageIcon, RefreshCcw, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import {
  BrandCharacterRecord,
  compilePrompt,
  MediaAssetRecord,
  normalizePromptTemplate,
  PHASE2_PROMPT_PLATFORMS,
  PLATFORM_PARAM_SUFFIX,
  PromptPlatform,
  PromptTemplateModel,
} from '@/lib/postgenPhase2';
import type { Tables } from '@/integrations/supabase/types';

type TemplateRecord = Tables<'image_prompt_templates'>;

const PromptStudio = () => {
  const location = useLocation();
  const { workspace, brandKit } = useWorkspace();
  const incomingState = location.state as { character?: BrandCharacterRecord | null } | null;

  const [templates, setTemplates] = useState<PromptTemplateModel[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [activePlatform, setActivePlatform] = useState<PromptPlatform>('midjourney');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [includeBrandParams, setIncludeBrandParams] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});
  const [variants, setVariants] = useState<string[]>([]);
  const [assets, setAssets] = useState<MediaAssetRecord[]>([]);
  const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [characters, setCharacters] = useState<BrandCharacterRecord[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('none');
  const [saveName, setSaveName] = useState('');

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedTemplateId) || null,
    [selectedTemplateId, templates],
  );

  const selectedCharacter = useMemo(
    () => characters.find((item) => item.id === selectedCharacterId) || null,
    [characters, selectedCharacterId],
  );

  const compiled = useMemo(() => {
    if (!selectedTemplate) return { prompt: '', warnings: [] as string[] };
    return compilePrompt(
      selectedTemplate,
      values,
      activePlatform,
      aspectRatio,
      includeBrandParams,
      brandKit,
      selectedCharacter?.seed_prompt || incomingState?.character?.seed_prompt || null,
    );
  }, [selectedTemplate, values, activePlatform, aspectRatio, includeBrandParams, brandKit, selectedCharacter?.seed_prompt, incomingState?.character?.seed_prompt]);

  const loadAssets = useCallback(async (templateId: string) => {
    if (!workspace?.id) return;
    const { data } = await supabase
      .from('media_assets')
      .select('*')
      .eq('workspace_id', workspace.id)
      .eq('module', 'prompt-studio')
      .eq('prompt_template_id', templateId)
      .order('created_at', { ascending: false })
      .limit(12);
    setAssets((data || []) as MediaAssetRecord[]);
  }, [workspace?.id]);

  useEffect(() => {
    if (!workspace?.id) return;
    let mounted = true;

    const load = async () => {
      const [{ data: templateRows }, { data: characterRows }] = await Promise.all([
        supabase
          .from('image_prompt_templates')
          .select('*')
          .or(`is_system.eq.true,workspace_id.eq.${workspace.id}`)
          .order('is_system', { ascending: false })
          .order('usage_count', { ascending: false }),
        supabase
          .from('brand_characters')
          .select('*')
          .eq('workspace_id', workspace.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
      ]);

      if (!mounted) return;
      const normalized = ((templateRows || []) as TemplateRecord[]).map(normalizePromptTemplate);
      setTemplates(normalized);
      setCharacters((characterRows || []) as BrandCharacterRecord[]);

      const initialTemplate = normalized[0];
      if (initialTemplate) {
        setSelectedTemplateId(initialTemplate.id);
        setValues(initialTemplate.default_values);
        setSaveName(initialTemplate.name);
        loadAssets(initialTemplate.id);
      }

      if (incomingState?.character?.id) {
        setSelectedCharacterId(incomingState.character.id);
      }
    };

    load();
    return () => { mounted = false; };
  }, [workspace?.id, incomingState?.character, loadAssets]);

  useEffect(() => {
    if (!selectedTemplate) return;
    setValues(selectedTemplate.default_values);
    setSaveName(selectedTemplate.name);
    setVariants([]);
    loadAssets(selectedTemplate.id);
  }, [loadAssets, selectedTemplate]);

  const handleForkOrSave = async () => {
    if (!workspace?.id || !selectedTemplate) return;

    const payload = {
      workspace_id: workspace.id,
      name: saveName.trim() || selectedTemplate.name,
      category: selectedTemplate.category,
      subcategory: selectedTemplate.subcategory,
      base_template: selectedTemplate.base_template,
      variables: selectedTemplate.variables as unknown as Json,
      default_values: values as unknown as Json,
      platform_params: selectedTemplate.platform_params as unknown as Json,
      is_system: false,
    };

    const isExistingWorkspaceTemplate = selectedTemplate.workspace_id === workspace.id && !selectedTemplate.is_system;
    const query = isExistingWorkspaceTemplate
      ? supabase.from('image_prompt_templates').update(payload).eq('id', selectedTemplate.id)
      : supabase.from('image_prompt_templates').insert(payload as unknown as any);

    const { error } = await query;
    if (error) {
      toast.error('Nao foi possivel salvar o prompt');
      return;
    }

    toast.success(isExistingWorkspaceTemplate ? 'Prompt atualizado no workspace' : 'Fork salvo no workspace');

    const { data } = await supabase
      .from('image_prompt_templates')
      .select('*')
      .or(`is_system.eq.true,workspace_id.eq.${workspace.id}`)
      .order('is_system', { ascending: false })
      .order('usage_count', { ascending: false });

    const normalized = ((data || []) as TemplateRecord[]).map(normalizePromptTemplate);
    setTemplates(normalized);
  };

  const handleGenerateVariants = async () => {
    if (!workspace?.id || !selectedTemplate) return;
    setIsGeneratingVariants(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image-prompt', {
        body: {
          workspace_id: workspace.id,
          template_id: selectedTemplate.id,
          variables: values,
          platform: activePlatform,
          aspect_ratio: aspectRatio,
          include_brand_params: includeBrandParams,
          character_id: selectedCharacterId !== 'none' ? selectedCharacterId : null,
          generate_variants: true,
        },
      });
      if (error) throw error;
      setVariants(data?.variants || []);
      toast.success('Variações geradas');
    } catch (error) {
      console.error(error);
      toast.error('Nao foi possivel gerar variacoes');
    } finally {
      setIsGeneratingVariants(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!workspace?.id || !selectedTemplate || !compiled.prompt) return;
    setIsGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: {
          workspace_id: workspace.id,
          prompt: compiled.prompt,
          aspect_ratio: aspectRatio,
          purpose: 'prompt-studio',
          prompt_template_id: selectedTemplate.id,
          character_id: selectedCharacterId !== 'none' ? selectedCharacterId : null,
        },
      });
      if (error) throw error;
      if (data?.asset) {
        setAssets((current) => [data.asset as MediaAssetRecord, ...current]);
        toast.success('Imagem gerada e salva como asset');
      }
    } catch (error) {
      console.error(error);
      toast.error('Nao foi possivel gerar a imagem');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden gradient-mesh" style={{ background: 'var(--bg-app)' }}>
      <div className="w-[320px] flex-shrink-0 border-r overflow-y-auto no-scrollbar" style={{ borderRightColor: 'var(--border)', background: 'rgba(15, 15, 26, 0.4)', backdropFilter: 'blur(20px)' }}>
        <div className="p-6 border-b sticky top-0 z-10" style={{ borderBottomColor: 'var(--border)', background: 'rgba(15, 15, 26, 0.8)', backdropFilter: 'blur(12px)' }}>
          <h2 className="font-display font-bold text-xl flex items-center gap-3" style={{ color: 'var(--text-1)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-inner" style={{ background: 'var(--primary-muted)', border: '1px solid var(--primary-muted)' }}>
              <Sparkles className="w-4 h-4 text-[color:var(--primary)]" />
            </div>
            Prompt Studio
          </h2>
          <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--text-3)' }}>Brand-aware prompt builder e media library inteligente.</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <Label>Template Base</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger><SelectValue placeholder="Selecione um template" /></SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}{template.is_system ? ' • Sistema' : ' • Workspace'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Salvar como</Label>
            <Input value={saveName} onChange={(event) => setSaveName(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Plataforma</Label>
            <Select value={activePlatform} onValueChange={(value) => setActivePlatform(value as PromptPlatform)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PHASE2_PROMPT_PLATFORMS.map((platform) => (
                  <SelectItem key={platform.id} value={platform.id}>{platform.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>{PLATFORM_PARAM_SUFFIX[activePlatform].notes}</p>
          </div>

          <div className="space-y-2">
            <Label>Aspect Ratio</Label>
            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['1:1', '4:5', '9:16', '16:9'].map((ratio) => (
                  <SelectItem key={ratio} value={ratio}>{ratio}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-2xl p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <Label className="flex items-center justify-between gap-3">
              <span>Usar parâmetros da marca</span>
              <input type="checkbox" checked={includeBrandParams} onChange={(event) => setIncludeBrandParams(event.target.checked)} />
            </Label>
          </div>

          <div className="space-y-2">
            <Label>Brand Character</Label>
            <Select value={selectedCharacterId} onValueChange={setSelectedCharacterId}>
              <SelectTrigger><SelectValue placeholder="Nenhum personagem" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {characters.map((character) => (
                  <SelectItem key={character.id} value={character.id}>{character.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTemplate?.variables.map((variable) => (
            <div key={variable.id} className="space-y-2">
              <Label>{variable.label}</Label>
              {variable.type === 'color' ? (
                <div className="flex gap-2">
                  <Input type="color" value={values[variable.id] || '#7C3AED'} onChange={(event) => setValues((current) => ({ ...current, [variable.id]: event.target.value }))} className="w-12 h-10 p-1" />
                  <Input value={values[variable.id] || ''} onChange={(event) => setValues((current) => ({ ...current, [variable.id]: event.target.value }))} placeholder={variable.placeholder} />
                </div>
              ) : (
                <Textarea
                  value={values[variable.id] || ''}
                  onChange={(event) => setValues((current) => ({ ...current, [variable.id]: event.target.value }))}
                  placeholder={variable.placeholder}
                  className="resize-none min-h-[72px]"
                />
              )}
            </div>
          ))}

          <Button onClick={handleForkOrSave} className="w-full gap-2" style={{ background: 'var(--primary)', color: '#fff' }}>
            <Save size={14} /> Salvar no Workspace
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto no-scrollbar scroll-smooth">
        <div className="px-8 py-10 relative overflow-hidden flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(15, 15, 26, 0.4)', backdropFilter: 'blur(20px)' }}>
          <div className="absolute top-0 right-0 w-[500px] h-[300px] opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle at top right, var(--primary), transparent 70%)' }}></div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] mb-3" style={{ color: 'var(--primary)' }}>
              Intelligence Suite
            </p>
            <h1 className="mt-2 text-4xl font-display font-extrabold tracking-tight" style={{ color: 'var(--text-1)' }}>
              Prompt Builder
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed" style={{ color: 'var(--text-2)' }}>
              O prompt é compilado automaticamente integrando tokens da marca, sintaxe da plataforma escolhida e o seed_prompt do seu Brand Character.
            </p>
          </div>

          <div className="flex gap-3 relative z-10">
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(compiled.prompt || '')} className="gap-2 h-11 px-5 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white">
              <Copy size={16} /> Copiar
            </Button>
            <Button variant="outline" onClick={handleGenerateVariants} disabled={isGeneratingVariants} className="gap-2 h-11 px-5 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white">
              <RefreshCcw size={16} /> {isGeneratingVariants ? 'Gerando...' : 'Criar Variações'}
            </Button>
            <Button onClick={handleGenerateImage} disabled={isGeneratingImage || !compiled.prompt} className="gap-2 h-11 px-6 rounded-xl shadow-primary/30" style={{ background: 'var(--primary)', color: '#fff' }}>
              <ImageIcon size={16} /> {isGeneratingImage ? 'Gerando...' : 'Gerar Imagem Pronta'}
            </Button>
          </div>
        </div>

        <div className="flex-1 p-8 grid grid-cols-1 xl:grid-cols-[1.3fr_0.9fr] gap-8 max-w-[1600px] mx-auto w-full">
          <div className="glass-card rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b" style={{ borderBottomColor: 'var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>Renderizador de Prompt</p>
            </div>
            
            <div className="p-8 flex-1">
              <pre className="whitespace-pre-wrap text-[15px] leading-8 p-6 rounded-2xl" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                {compiled.prompt || 'Nenhum prompt disponível.'}
              </pre>
              
              {compiled.warnings.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {compiled.warnings.map((warning) => (
                    <span key={warning} className="px-4 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#F59E0B' }}>
                      {warning}
                    </span>
                  ))}
                </div>
              )}

              {variants.length > 0 && (
                <div className="mt-8 space-y-4">
                  <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Variações Opcionais</p>
                  {variants.map((variant, index) => (
                    <button
                      key={`${index}-${variant.slice(0, 24)}`}
                      onClick={() => navigator.clipboard.writeText(variant)}
                      className="w-full rounded-2xl p-5 text-left transition-all hover:-translate-y-1 hover:shadow-xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--primary)' }}>Variação inteligente {index + 1}</p>
                      <p className="text-[15px] leading-7" style={{ color: 'var(--text-2)' }}>{variant}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="glass-card rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
            <Tabs defaultValue="assets" className="flex-1 flex flex-col">
              <div className="p-6 border-b" style={{ borderBottomColor: 'var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                <TabsList className="bg-black/30 border border-white/5 rounded-xl p-1">
                  <TabsTrigger value="assets" className="rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white">Assets Gerados</TabsTrigger>
                  <TabsTrigger value="library" className="rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white">Biblioteca Geral</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="assets" className="p-8 m-0 flex-1 overflow-y-auto no-scrollbar">
                {assets.length === 0 ? (
                  <div className="glass-card rounded-2xl p-8 flex items-center justify-center min-h-[200px] text-center" style={{ color: 'var(--text-3)' }}>
                    Nenhum asset salvo.<br/>Gere uma imagem usando o builder para registrar no workspace.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {assets.map((asset) => (
                      <div key={asset.id} className="rounded-2xl overflow-hidden group cursor-pointer" style={{ border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                        <div className="relative aspect-square overflow-hidden">
                          <img src={asset.public_url} alt={asset.asset_type} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        </div>
                        <div className="p-4">
                          <p className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: 'var(--text-2)' }}>
                            {asset.module}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="library" className="p-8 m-0 flex-1 overflow-y-auto no-scrollbar space-y-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplateId(template.id)}
                    className="w-full rounded-2xl p-5 text-left transition-all"
                    style={{
                      background: selectedTemplateId === template.id ? 'var(--primary-muted)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${selectedTemplateId === template.id ? 'var(--primary)' : 'var(--border)'}`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-base" style={{ color: 'var(--text-1)' }}>{template.name}</p>
                        <p className="text-[11px] font-medium uppercase tracking-wider mt-1.5" style={{ color: 'var(--text-3)' }}>{template.category}{template.is_system ? ' • Builtin' : ' • Custom'}</p>
                      </div>
                      <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--primary)' }}>{template.usage_count}x</span>
                    </div>
                  </button>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptStudio;
