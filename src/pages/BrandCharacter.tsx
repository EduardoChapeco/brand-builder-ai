import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Loader2, Plus, Sparkles, Trash2, UserCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { parseJsonArray } from '@/lib/postgenPhase2';

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
    <div className="flex h-full w-full overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-8 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <p className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--text-3)' }}>
            Brand Character Module
          </p>
          <h1 className="mt-2 text-3xl font-display font-bold" style={{ color: 'var(--text-1)' }}>
            Personagens consistentes para a marca
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: 'var(--text-2)' }}>
            Crie uma persona visual reutilizavel, gere o seed prompt tecnico e entregue esse contexto para o Prompt
            Studio ou para o Quick Post sem quebrar a consistencia da marca.
          </p>
        </div>

        <div className="p-8 grid grid-cols-1 xl:grid-cols-[1fr_1.1fr] gap-6">
          <div className="rounded-3xl p-6 space-y-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <UserCircle2 size={18} style={{ color: 'var(--primary)' }} />
              <div>
                <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--text-1)' }}>
                  Criar personagem
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                  Seed prompt, traços dominantes e item assinatura.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Nome</label>
                <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Genero</label>
                <Input value={form.gender} onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Faixa etaria</label>
                <Input value={form.age_range} onChange={(event) => setForm((current) => ({ ...current, age_range: event.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Arquetipo</label>
                <Input value={form.archetype} onChange={(event) => setForm((current) => ({ ...current, archetype: event.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Ethnicity notes</label>
                <Input value={form.ethnicity_notes} onChange={(event) => setForm((current) => ({ ...current, ethnicity_notes: event.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Item assinatura</label>
                <Input value={form.signature_item} onChange={(event) => setForm((current) => ({ ...current, signature_item: event.target.value }))} placeholder="blue blazer, gold earrings..." />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Expressao padrao</label>
                <Input value={form.expression_default} onChange={(event) => setForm((current) => ({ ...current, expression_default: event.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Traços fisicos</label>
                <div className="flex gap-2">
                  <Input
                    value={form.physical_traits_input}
                    onChange={(event) => setForm((current) => ({ ...current, physical_traits_input: event.target.value }))}
                    placeholder="curly dark hair"
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
                    <Plus size={14} />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.physical_traits.map((trait) => (
                    <button
                      key={trait}
                      type="button"
                      onClick={() => setForm((current) => ({
                        ...current,
                        physical_traits: current.physical_traits.filter((item) => item !== trait),
                      }))}
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}
                    >
                      {trait} x
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Notas de estilo</label>
                <Textarea value={form.style_notes} onChange={(event) => setForm((current) => ({ ...current, style_notes: event.target.value }))} className="min-h-[100px] resize-none" />
              </div>
            </div>

            <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between gap-4 mb-3">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Seed prompt</p>
                <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(form.seed_prompt)}>
                  <Copy size={14} />
                </Button>
              </div>
              <Textarea
                value={form.seed_prompt}
                onChange={(event) => setForm((current) => ({ ...current, seed_prompt: event.target.value }))}
                className="min-h-[150px] resize-none"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleGenerateSeed} disabled={isGeneratingSeed} className="gap-2" style={{ background: 'var(--primary)', color: '#fff' }}>
                {isGeneratingSeed ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {isGeneratingSeed ? 'Gerando seed...' : 'Gerar seed prompt'}
              </Button>
              <Button variant="outline" onClick={() => setForm(defaultForm)}>Limpar</Button>
              <Button variant="outline" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Salvando...' : form.id ? 'Atualizar personagem' : 'Salvar personagem'}
              </Button>
            </div>
          </div>

          <div className="rounded-3xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--text-1)' }}>
                  Meus personagens
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                  Cards prontos para editar, duplicar e reaproveitar em outros modulos.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {characters.length === 0 ? (
                <div className="rounded-2xl p-5 text-sm md:col-span-2" style={{ background: 'var(--bg-card)', color: 'var(--text-3)' }}>
                  Nenhum personagem salvo ainda.
                </div>
              ) : (
                characters.map((character) => {
                  const gallery = galleryByCharacter.get(character.id) || [];
                  return (
                    <div
                      key={character.id}
                      className="rounded-2xl overflow-hidden"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                    >
                      <div className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-semibold"
                            style={{ background: brandKit?.color_primary || '#7C3AED' }}
                          >
                            {character.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold" style={{ color: 'var(--text-1)' }}>{character.name}</p>
                            <p className="text-xs" style={{ color: 'var(--text-3)' }}>{character.archetype || 'generalist'}</p>
                          </div>
                        </div>

                        <p className="mt-4 text-sm leading-6 line-clamp-4" style={{ color: 'var(--text-2)' }}>
                          {character.seed_prompt || 'Seed prompt ainda nao gerado.'}
                        </p>

                        {gallery[0] && (
                          <img
                            src={gallery[0].public_url}
                            alt={character.name}
                            className="mt-4 w-full aspect-square object-cover rounded-2xl"
                          />
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => navigate('../image-prompts', { state: { character } })}>
                            Usar no Prompt Studio
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => navigate('../generator', { state: { character } })}>
                            Usar no Quick Post
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEdit(character)}>
                            Editar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDuplicate(character)}>
                            Duplicar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(character.id)}>
                            <Trash2 size={14} />
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
