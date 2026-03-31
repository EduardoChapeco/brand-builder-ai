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
      variables: selectedTemplate.variables,
      default_values: values,
      platform_params: selectedTemplate.platform_params,
      is_system: false,
    };

    const isExistingWorkspaceTemplate = selectedTemplate.workspace_id === workspace.id && !selectedTemplate.is_system;
    const query = isExistingWorkspaceTemplate
      ? supabase.from('image_prompt_templates').update(payload).eq('id', selectedTemplate.id)
      : supabase.from('image_prompt_templates').insert(payload);

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
    <div className="flex h-full w-full overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      <div className="w-[300px] flex-shrink-0 border-r overflow-y-auto" style={{ borderRightColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <div className="p-5 border-b sticky top-0 z-10" style={{ borderBottomColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <h2 className="font-display font-semibold text-lg flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
            <Sparkles className="w-5 h-5 text-[color:var(--primary)]" />
            Prompt Config
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Brand-aware prompt builder e media library.</p>
        </div>

        <div className="p-5 space-y-5">
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

      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-6 border-b flex items-center justify-between" style={{ borderBottomColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <div>
            <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--text-1)' }}>Prompt Studio</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>O prompt é compilado com a marca, a plataforma e, se quiser, com seu personagem de marca.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(compiled.prompt || '')} className="gap-2">
              <Copy size={14} /> Copiar
            </Button>
            <Button variant="outline" onClick={handleGenerateVariants} disabled={isGeneratingVariants} className="gap-2">
              <RefreshCcw size={14} /> {isGeneratingVariants ? 'Gerando...' : '3 Variações'}
            </Button>
            <Button onClick={handleGenerateImage} disabled={isGeneratingImage || !compiled.prompt} className="gap-2" style={{ background: 'var(--primary)', color: '#fff' }}>
              <ImageIcon size={14} /> {isGeneratingImage ? 'Gerando...' : 'Gerar Imagem'}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 xl:grid-cols-[1.3fr_0.9fr] gap-6">
          <div className="rounded-3xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
            <div className="p-4 border-b" style={{ borderBottomColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>Preview do Prompt</p>
            </div>
            <div className="p-6">
              <pre className="whitespace-pre-wrap text-sm leading-7" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-mono)' }}>
                {compiled.prompt}
              </pre>
              <div className="mt-4 flex flex-wrap gap-2">
                {compiled.warnings.map((warning) => (
                  <span key={warning} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(245, 158, 11, 0.14)', color: '#F59E0B' }}>
                    {warning}
                  </span>
                ))}
              </div>

              {variants.length > 0 && (
                <div className="mt-6 space-y-3">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Variações</p>
                  {variants.map((variant, index) => (
                    <button
                      key={`${index}-${variant.slice(0, 24)}`}
                      onClick={() => navigator.clipboard.writeText(variant)}
                      className="w-full rounded-2xl p-4 text-left"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                    >
                      <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>Variação {index + 1}</p>
                      <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-1)' }}>{variant}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
            <Tabs defaultValue="assets">
              <div className="p-4 border-b" style={{ borderBottomColor: 'var(--border)', background: 'var(--bg-card)' }}>
                <TabsList>
                  <TabsTrigger value="assets">Resultados</TabsTrigger>
                  <TabsTrigger value="library">Biblioteca</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="assets" className="m-0 p-4 space-y-4">
                {assets.length === 0 ? (
                  <div className="rounded-2xl p-6 text-sm" style={{ background: 'var(--bg-card)', color: 'var(--text-3)' }}>
                    Nenhum asset salvo para este template ainda. Gere uma imagem para popular a galeria.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {assets.map((asset) => (
                      <div key={asset.id} className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                        <img src={asset.public_url} alt={asset.asset_type} className="w-full aspect-square object-cover" />
                        <div className="p-3">
                          <p className="text-xs" style={{ color: 'var(--text-3)' }}>{asset.module}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="library" className="m-0 p-4 space-y-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplateId(template.id)}
                    className="w-full rounded-2xl p-4 text-left"
                    style={{
                      background: selectedTemplateId === template.id ? 'var(--primary-muted)' : 'var(--bg-card)',
                      border: `1px solid ${selectedTemplateId === template.id ? 'var(--primary)' : 'var(--border)'}`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium" style={{ color: 'var(--text-1)' }}>{template.name}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{template.category}{template.is_system ? ' • Sistema' : ' • Workspace'}</p>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>{template.usage_count}x</span>
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
