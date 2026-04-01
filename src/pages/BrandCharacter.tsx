import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Loader2, Plus, Sparkles, Trash2, UserCircle2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { parseJsonArray } from '@/lib/postgenPhase3';

type BrandCharacter = Tables<'brand_characters'>;
type MediaAsset = Tables<'media_assets'>;

const defaultForm = {
  id: '',
  name: '',
  gender: 'Feminino',
  age_range: '30-40s',
  ethnicity_notes: '',
  signature_item: '',
  archetype: 'entrepreneur',
  expression_default: 'Confiante',
  physical_traits: [] as string[],
  physical_traits_input: '',
  style_notes: '',
  seed_prompt: '',
};

const BrandCharacterPage = () => {
  const navigate = useNavigate();
  const { workspace, brandKit } = useWorkspace();

  const [form, setForm] = useState(defaultForm);
  const [characters, setCharacters] = useState<BrandCharacter[]>([]);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [isGeneratingSeed, setIsGeneratingSeed] = useState(false);
  const [generatingFacesFor, setGeneratingFacesFor] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!workspace?.id) return;

    const [{ data: characterRows, error: characterError }, { data: assetRows }] = await Promise.all([
      supabase
        .from('brand_characters')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('media_assets')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('module', 'brand-character')
        .order('created_at', { ascending: false }),
    ]);

    if (characterError) {
      toast.error('Nao foi possivel carregar os personagens');
      return;
    }

    setCharacters((characterRows || []) as BrandCharacter[]);
    setAssets((assetRows || []) as MediaAsset[]);
  }, [workspace?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const galleryByCharacter = useMemo(() => {
    const grouped = new Map<string, MediaAsset[]>();
    assets.forEach((asset) => {
      if (!asset.character_id) return;
      const current = grouped.get(asset.character_id) || [];
      current.push(asset);
      grouped.set(asset.character_id, current);
    });
    return grouped;
  }, [assets]);

  const buildCharacterDraft = () => ({
    name: form.name.trim(),
    gender: form.gender,
    age_range: form.age_range,
    ethnicity_notes: form.ethnicity_notes.trim(),
    physical_traits: form.physical_traits,
    style_notes: form.style_notes.trim(),
    archetype: form.archetype.trim(),
    signature_item: form.signature_item.trim(),
    expression_default: form.expression_default,
    brand_palette: [brandKit?.color_primary, brandKit?.color_secondary, brandKit?.color_accent].filter(Boolean),
  });

  const handleGenerateSeed = async () => {
    if (!workspace?.id || !form.name.trim()) {
      toast.error('Defina pelo menos o nome do personagem');
      return;
    }

    setIsGeneratingSeed(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-character-seed', {
        body: {
          workspace_id: workspace.id,
          character_draft: buildCharacterDraft(),
        },
      });

      if (error) throw error;

      setForm((current) => ({ ...current, seed_prompt: data?.seed_prompt || '' }));
      toast.success('Seed prompt gerado');
    } catch (error) {
      console.error(error);
      toast.error('Nao foi possivel gerar o seed prompt');
    } finally {
      setIsGeneratingSeed(false);
    }
  };

  const handleGenerateFaces = async (character: BrandCharacter) => {
    if (!workspace?.id || !character.seed_prompt) {
      toast.error('O personagem precisa de um Seed Prompt gerado para forjar o rosto.');
      return;
    }
    setGeneratingFacesFor(character.id);
    const prompts = [
      `Front profile portrait, highly detailed face, symmetrical, straight on, looking directly at camera. Face consistency reference shot. ${character.seed_prompt}`,
      `Side profile portrait, highly detailed face, looking away, 90 degree angle. Face consistency reference shot. ${character.seed_prompt}`,
      `Front profile portrait, highly detailed face, natural expressive smile, engaging. Face consistency reference shot. ${character.seed_prompt}`
    ];

    try {
      toast.info('Forjando faces de ancoragem (isso pode demorar).');
      const promises = prompts.map(prompt => 
        supabase.functions.invoke('generate-image', {
          body: {
            workspace_id: workspace.id,
            prompt,
            aspect_ratio: '1:1',
            purpose: 'brand-character',
            character_id: character.id
          }
        })
      );
      
      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error || (r.data && r.data.error)).map(r => r.error || (r.data && r.data.error));
      
      if (errors.length > 0) {
        console.error('Errors generating faces:', errors);
        toast.warning(`Algumas faces falharam (${errors.length}/3).`);
      } else {
        toast.success('Rostos de consistência forjados com sucesso!');
      }
      
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error('Falha crítica ao forjar rostos.');
    } finally {
      setGeneratingFacesFor(null);
    }
  };

  const handleSave = async () => {
    if (!workspace?.id || !form.name.trim()) {
      toast.error('Nome do personagem e obrigatorio');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        workspace_id: workspace.id,
        name: form.name.trim(),
        gender: form.gender,
        age_range: form.age_range,
        ethnicity_notes: form.ethnicity_notes.trim() || null,
        physical_traits: form.physical_traits.map((trait) => ({ trait })),
        style_notes: JSON.stringify({
          signature_item: form.signature_item.trim(),
          expression_default: form.expression_default,
          notes: form.style_notes.trim(),
        }),
        archetype: form.archetype.trim(),
        seed_prompt: form.seed_prompt.trim() || null,
        is_active: true,
      };

      const query = form.id
        ? supabase.from('brand_characters').update(payload).eq('id', form.id)
        : supabase.from('brand_characters').insert(payload);

      const { error } = await query;
      if (error) throw error;

      toast.success(form.id ? 'Personagem atualizado' : 'Personagem salvo');
      setForm(defaultForm);
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error('Nao foi possivel salvar o personagem');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (character: BrandCharacter) => {
    const styleNotes = (() => {
      if (!character.style_notes) return {};
      try {
        return JSON.parse(character.style_notes) as {
          signature_item?: string;
          expression_default?: string;
          notes?: string;
        };
      } catch {
        return {};
      }
    })();

    setForm({
      id: character.id,
      name: character.name,
      gender: character.gender || 'Feminino',
      age_range: character.age_range || '30-40s',
      ethnicity_notes: character.ethnicity_notes || '',
      signature_item: styleNotes.signature_item || '',
      archetype: character.archetype || 'entrepreneur',
      expression_default: styleNotes.expression_default || 'Confiante',
      physical_traits: parseJsonArray<{ trait?: string }>(character.physical_traits).map((item) => item.trait || '').filter(Boolean),
      physical_traits_input: '',
      style_notes: styleNotes.notes || '',
      seed_prompt: character.seed_prompt || '',
    });
  };

  const handleDelete = async (characterId: string) => {
    const { error } = await supabase.from('brand_characters').delete().eq('id', characterId);
    if (error) {
      toast.error('Nao foi possivel remover o personagem');
      return;
    }
    toast.success('Personagem removido');
    await loadData();
  };

  const handleDuplicate = async (character: BrandCharacter) => {
    if (!workspace?.id) return;
    const { error } = await supabase.from('brand_characters').insert({
      workspace_id: workspace.id,
      name: `${character.name} Copy`,
      gender: character.gender,
      age_range: character.age_range,
      ethnicity_notes: character.ethnicity_notes,
      physical_traits: character.physical_traits,
      style_notes: character.style_notes,
      archetype: character.archetype,
      seed_prompt: character.seed_prompt,
      sample_images: character.sample_images,
      is_active: true,
    });
    if (error) {
      toast.error('Nao foi possivel duplicar');
      return;
    }
    toast.success('Personagem duplicado');
    await loadData();
  };

  return (
    <div className="flex h-full w-full overflow-hidden gradient-mesh" style={{ background: 'var(--bg-app)' }}>
      <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
        <div className="px-8 py-10 relative overflow-hidden flex flex-col justify-end min-h-[160px]" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(15, 15, 26, 0.4)', backdropFilter: 'blur(20px)' }}>
          <div className="absolute top-0 right-0 w-[500px] h-[300px] opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle at top right, var(--primary), transparent 70%)' }}></div>
          <div className="relative z-10 w-full max-w-[1600px] mx-auto">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] mb-3" style={{ color: 'var(--primary)' }}>
              Intelligence Suite • Personagens Inteligentes
            </p>
            <h1 className="mt-2 text-4xl font-display font-extrabold tracking-tight" style={{ color: 'var(--text-1)' }}>
              Brand Character Designer
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed" style={{ color: 'var(--text-2)' }}>
              Crie personas dinâmicas reutilizáveis que aprendem sobre sua identidade visual. Envie o seed_prompt diretamente ao Prompt Studio e nunca quebre a consistência nos assets gerados.
            </p>
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 xl:grid-cols-[1fr_1.1fr] gap-8 max-w-[1600px] mx-auto w-full">
          <div className="glass-card rounded-[2rem] shadow-2xl p-8 space-y-8 h-fit">
            <div className="flex items-center gap-4 border-b pb-6" style={{ borderColor: 'var(--border)' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <UserCircle2 size={24} style={{ color: 'var(--primary)' }} />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--text-1)' }}>
                  Forja de Identidade
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
                  Determine características dominantes e o gatilho emocional base.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 md:col-span-2">
                <label className="text-sm font-semibold tracking-wide" style={{ color: 'var(--text-2)' }}>Nome ou Entidade</label>
                <Input className="h-12 bg-black/20 border-white/10 rounded-xl" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ex: Alex, Especialista" />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold tracking-wide" style={{ color: 'var(--text-2)' }}>Gênero</label>
                <Input className="h-12 bg-black/20 border-white/10 rounded-xl" value={form.gender} onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))} />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold tracking-wide" style={{ color: 'var(--text-2)' }}>Idade Geral</label>
                <Input className="h-12 bg-black/20 border-white/10 rounded-xl" value={form.age_range} onChange={(event) => setForm((current) => ({ ...current, age_range: event.target.value }))} />
              </div>
              <div className="space-y-3 md:col-span-2">
                <label className="text-sm font-semibold tracking-wide" style={{ color: 'var(--text-2)' }}>Arquétipo Principal</label>
                <Input className="h-12 bg-black/20 border-white/10 rounded-xl" value={form.archetype} onChange={(event) => setForm((current) => ({ ...current, archetype: event.target.value }))} />
              </div>
              <div className="space-y-3 md:col-span-2">
                <label className="text-sm font-semibold tracking-wide" style={{ color: 'var(--text-2)' }}>Etnia e Notas Raciais</label>
                <Input className="h-12 bg-black/20 border-white/10 rounded-xl" value={form.ethnicity_notes} onChange={(event) => setForm((current) => ({ ...current, ethnicity_notes: event.target.value }))} />
              </div>
              <div className="space-y-3 md:col-span-2">
                <label className="text-sm font-semibold tracking-wide" style={{ color: 'var(--text-2)' }}>Item Assinatura (Obrigatório Visualmente)</label>
                <Input className="h-12 bg-black/20 border-white/10 rounded-xl" value={form.signature_item} onChange={(event) => setForm((current) => ({ ...current, signature_item: event.target.value }))} placeholder="Óculos redondo, gravata amarela..." />
              </div>
              <div className="space-y-3 md:col-span-2">
                <label className="text-sm font-semibold tracking-wide" style={{ color: 'var(--text-2)' }}>Expressão Recorrente</label>
                <Input className="h-12 bg-black/20 border-white/10 rounded-xl" value={form.expression_default} onChange={(event) => setForm((current) => ({ ...current, expression_default: event.target.value }))} />
              </div>
              <div className="space-y-3 md:col-span-2">
                <label className="text-sm font-semibold tracking-wide mb-1 block" style={{ color: 'var(--text-2)' }}>Traços Anatômicos (Adicione e Enter)</label>
                <div className="flex gap-3">
                  <Input
                    className="h-12 bg-black/20 border-white/10 rounded-xl flex-1"
                    value={form.physical_traits_input}
                    onChange={(event) => setForm((current) => ({ ...current, physical_traits_input: event.target.value }))}
                    placeholder="Sardas, cabelo cacheado escuro..."
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') return;
                      event.preventDefault();
                      const value = form.physical_traits_input.trim();
                      if (!value) return;
                      setForm((current) => ({
                        ...current,
                        physical_traits: [...current.physical_traits, value],
                        physical_traits_input: '',
                      }));
                    }}
                  />
                  <Button
                    variant="outline"
                    className="h-12 w-12 rounded-xl border-white/10 bg-white/5 hover:bg-white/10"
                    onClick={() => {
                      const value = form.physical_traits_input.trim();
                      if (!value) return;
                      setForm((current) => ({
                        ...current,
                        physical_traits: [...current.physical_traits, value],
                        physical_traits_input: '',
                      }));
                    }}
                  >
                    <Plus size={16} />
                  </Button>
                </div>
                {form.physical_traits.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {form.physical_traits.map((trait) => (
                      <button
                        key={trait}
                        type="button"
                        onClick={() => setForm((current) => ({
                          ...current,
                          physical_traits: current.physical_traits.filter((item) => item !== trait),
                        }))}
                        className="px-4 py-1.5 rounded-full text-xs font-bold transition-all hover:opacity-80 flex items-center gap-2 shadow-sm"
                        style={{ background: 'var(--primary-muted)', color: 'var(--primary)', border: '1px solid rgba(124, 58, 237, 0.2)' }}
                      >
                        {trait} <span className="opacity-50 hover:opacity-100">✕</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-3 md:col-span-2">
                <label className="text-sm font-semibold tracking-wide" style={{ color: 'var(--text-2)' }}>Vibe & Estilo Fotográfico</label>
                <Textarea className="bg-black/20 border-white/10 rounded-xl p-4 text-[15px] resize-none h-32" value={form.style_notes} onChange={(event) => setForm((current) => ({ ...current, style_notes: event.target.value }))} />
              </div>
            </div>

            <div className="rounded-2xl p-6 relative overflow-hidden group" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center justify-between gap-4 mb-4 relative z-10">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>Seed Prompt Base (Midjourney Ready)</p>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg bg-black/40 border-white/5 hover:bg-white/10" onClick={() => navigator.clipboard.writeText(form.seed_prompt)}>
                  <Copy size={12} />
                </Button>
              </div>
              <Textarea
                value={form.seed_prompt}
                onChange={(event) => setForm((current) => ({ ...current, seed_prompt: event.target.value }))}
                className="min-h-[160px] resize-none border-none bg-transparent p-0 text-[15px] leading-relaxed font-mono focus-visible:ring-0 relative z-10"
                style={{ color: 'var(--text-2)' }}
                placeholder="Insira manualmente ou clique em 'Sintetizar Genoma Visual' para que a IA crie o prompt técnico otimizado para a engine..."
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={handleGenerateSeed} disabled={isGeneratingSeed} className="gap-2 flex-1 h-12 rounded-xl text-sm font-semibold shadow-primary/20" style={{ background: 'var(--primary)', color: '#fff' }}>
                {isGeneratingSeed ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isGeneratingSeed ? 'Decodificando DNA Visual...' : 'Sintetizar Genoma Visual'}
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="gap-2 h-12 px-6 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-medium">
                <Save size={16} />
                {isSaving ? 'Gravando...' : form.id ? 'Salvar Mutação' : 'Registrar Entidade'}
              </Button>
              {form.id && (
                <Button variant="outline" onClick={() => setForm(defaultForm)} className="gap-2 h-12 px-4 rounded-xl border-white/10 bg-transparent hover:bg-white/5 text-white/50">
                  Cancelar
                </Button>
              )}
            </div>
          </div>

          <div className="glass-card rounded-[2rem] shadow-2xl p-8 h-fit flex flex-col">
            <div className="flex flex-col gap-2 mb-8 border-b pb-6" style={{ borderColor: 'var(--border)' }}>
              <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--text-1)' }}>
                Galeria de Entidades
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-3)' }}>
                Personagens isolados e prontos para injeção via Prompt Studio na criação de assets da marca.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {characters.length === 0 ? (
                <div className="glass-card rounded-2xl p-8 flex items-center justify-center min-h-[160px] text-center md:col-span-2" style={{ color: 'var(--text-3)' }}>
                  Ainda não existem Personagens parametrizados neste Brand Kit. Crie seu primeiro mascote ao lado.
                </div>
              ) : (
                characters.map((character) => {
                  const gallery = galleryByCharacter.get(character.id) || [];
                  return (
                    <div
                      key={character.id}
                      className="rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex items-center gap-4 mb-4">
                          <div
                            className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-display text-lg font-bold shadow-lg"
                            style={{ background: `linear-gradient(135deg, ${brandKit?.color_primary || '#7C3AED'} 0%, ${brandKit?.color_secondary || '#EC4899'} 100%)` }}
                          >
                            {character.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-[17px] truncate max-w-[120px]" style={{ color: 'var(--text-1)' }}>{character.name}</p>
                            <p className="text-[11px] font-bold uppercase tracking-wider mt-1" style={{ color: 'var(--text-3)' }}>{character.archetype || 'Hero'}</p>
                          </div>
                        </div>

                        <p className="mt-2 text-[13px] leading-6 line-clamp-3 mb-4 flex-1" style={{ color: 'var(--text-2)' }}>
                          {character.seed_prompt || 'Seed técnico ainda não parametrizado, atualize a entidade.'}
                        </p>

                        {gallery.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2 mb-5">
                            {gallery.slice(0, 3).map((img, i) => (
                              <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                <img
                                  src={img.public_url}
                                  alt={`${character.name} face ${i}`}
                                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="w-full aspect-[3/1] rounded-xl flex items-center justify-center mb-5 border border-dashed border-white/10 bg-white/5 text-[10px] text-white/40">
                            Nenhuma Face Âncora
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 mt-auto">
                          <Button className="h-9 px-3 rounded-lg text-xs font-semibold shadow-primary/30" style={{ background: 'var(--primary)', color: '#fff' }} onClick={() => navigate('../image-prompts', { state: { character } })}>
                            Usar no Studio
                          </Button>
                          <Button variant="outline" className="h-9 px-2 rounded-lg text-xs font-semibold shadow-primary/30"
                            style={{ background: 'var(--primary)', color: '#fff' }}
                            onClick={() => handleGenerateFaces(character)}
                            disabled={generatingFacesFor === character.id || !character.seed_prompt}>
                            {generatingFacesFor === character.id ? <Loader2 className="animate-spin w-4 h-4" /> : 'Gerar Rostos'}
                          </Button>
                          <Button variant="outline" className="h-9 px-2 rounded-lg text-[11px] font-medium border-white/10 bg-white/5 hover:bg-white/10" onClick={() => handleEdit(character)}>
                            Editar
                          </Button>
                          <Button variant="outline" className="h-9 px-2 rounded-lg text-[11px] font-medium border-white/10 bg-white/5 hover:bg-white/10" onClick={() => handleDuplicate(character)}>
                            Clonar
                          </Button>
                          <Button variant="outline" className="h-9 rounded-lg border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20 col-span-2" onClick={() => handleDelete(character.id)}>
                            Excluir Personagem
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandCharacterPage;
