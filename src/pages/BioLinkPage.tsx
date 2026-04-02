import { useEffect, useMemo, useState } from 'react';
import { Copy, Eye, Globe, Link2, Plus, Save, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import SimlabReviewPanel from '@/components/simlab/SimlabReviewPanel';
import { BioLinkRenderer, type BioLinkData } from '@/components/biolink/BioLinkRenderer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { BIOLINK_THEMES, BioLinkBlock, type BioLinkBlockType, normalizeBioLinkBlocks, slugify } from '@/lib/postgenPhase3';
import { awaitSimlabCompletion, dispatchSimlabValidation, submitSimlabFeedback, type SimlabInsight, type SimlabRun, type SimlabVariant } from '@/lib/simlab';

const blockOptions: Array<{ id: BioLinkBlockType; label: string }> = [
  { id: 'link', label: 'Link CTA' },
  { id: 'youtube', label: 'YouTube Embed' },
  { id: 'spotify', label: 'Spotify Embed' },
  { id: 'map', label: 'Google Maps Box' },
  { id: 'newsletter', label: 'Newsletter Form' },
  { id: 'spacer', label: 'Spacer' },
];

const createBlock = (type: BioLinkBlockType): BioLinkBlock => ({
  id: crypto.randomUUID(),
  type,
  title: type === 'newsletter' ? 'Receba atualizações' : 'Novo bloco',
  url: '',
  emoji: type === 'link' ? '🔗' : undefined,
  note: '',
  buttonLabel: type === 'newsletter' ? 'Inscrever-se' : undefined,
  placeholder: type === 'newsletter' ? 'Seu melhor e-mail' : undefined,
  height: type === 'spacer' ? 24 : undefined,
});

const BioLinkPage = () => {
  const { workspace, brandKit, briefing } = useWorkspace();
  const [bioLinkId, setBioLinkId] = useState<string | null>(null);
  const [themeId, setThemeId] = useState(BIOLINK_THEMES[0].id);
  const [handle, setHandle] = useState('');
  const [profileTitle, setProfileTitle] = useState('Link hub');
  const [profileBio, setProfileBio] = useState('');
  const [profileLocation, setProfileLocation] = useState('');
  const [blocks, setBlocks] = useState<BioLinkBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [simlabRun, setSimlabRun] = useState<SimlabRun | null>(null);
  const [simlabInsight, setSimlabInsight] = useState<SimlabInsight | null>(null);
  const [simlabVariants, setSimlabVariants] = useState<SimlabVariant[]>([]);
  const [simlabLoading, setSimlabLoading] = useState(false);
  const [simlabError, setSimlabError] = useState<string | null>(null);

  const selectedBlock = useMemo(
    () => blocks.find((block) => block.id === selectedBlockId) || null,
    [blocks, selectedBlockId],
  );

  const previewData: BioLinkData = useMemo(() => ({
    slug: handle || 'suamarca',
    theme_id: themeId,
    theme_config: {
      primaryColor: brandKit?.color_primary || '#9353FF',
      secondaryColor: brandKit?.color_secondary || '#06B6D4',
      accentColor: brandKit?.color_accent || '#F59E0B',
    },
    profile: {
      avatar: brandKit?.logo_url || undefined,
      handle: handle || 'suamarca',
      title: profileTitle,
      bio: profileBio,
      location: profileLocation,
    },
    blocks,
  }), [blocks, brandKit?.color_accent, brandKit?.color_primary, brandKit?.color_secondary, brandKit?.logo_url, handle, profileBio, profileLocation, profileTitle, themeId]);

  useEffect(() => {
    if (!workspace?.id) return;
    let mounted = true;

    const load = async () => {
      const { data, error } = await supabase
        .from('bio_links')
        .select('*')
        .eq('workspace_id', workspace.id)
        .maybeSingle();

      if (!mounted) return;
      if (error) {
        toast.error('Nao foi possivel carregar o Bio Link');
        return;
      }

      const initialHandle = briefing?.instagram_handle?.replace('@', '')
        || briefing?.company_name
        || workspace.slug
        || workspace.name;

      if (!data) {
        setHandle(slugify(initialHandle || 'suamarca'));
        setProfileBio(briefing?.main_differentials || '');
        setProfileTitle(briefing?.segment || 'Link hub premium');
        setBlocks([createBlock('link')]);
        return;
      }

      setBioLinkId(data.id);
      setHandle(data.slug);
      setThemeId(data.theme_id || BIOLINK_THEMES[0].id);
      setProfileTitle(
        typeof data.profile === 'object' && data.profile && 'title' in data.profile
          ? String((data.profile as Record<string, unknown>).title || '')
          : '',
      );
      setProfileBio(
        typeof data.profile === 'object' && data.profile && 'bio' in data.profile
          ? String((data.profile as Record<string, unknown>).bio || '')
          : '',
      );
      setProfileLocation(
        typeof data.profile === 'object' && data.profile && 'location' in data.profile
          ? String((data.profile as Record<string, unknown>).location || '')
          : '',
      );
      setBlocks(normalizeBioLinkBlocks(data));
      setIsPublished(Boolean(data.is_published));

      if (data.latest_simlab_run_id) {
        setSimlabLoading(true);
        try {
          const status = await awaitSimlabCompletion(String(data.latest_simlab_run_id), 15000);
          setSimlabRun(status.run);
          setSimlabInsight(status.insight);
          setSimlabVariants(status.variants);
          setSimlabError(status.run.verdict === 'approved' ? null : status.insight?.executive_summary || status.run.failure_reason || null);
        } catch (error) {
          setSimlabError(error instanceof Error ? error.message : String(error));
        } finally {
          setSimlabLoading(false);
        }
      } else {
        setSimlabRun(null);
        setSimlabInsight(null);
        setSimlabVariants([]);
        setSimlabError(null);
      }
    };

    load();
    return () => { mounted = false; };
  }, [briefing?.company_name, briefing?.instagram_handle, briefing?.main_differentials, briefing?.segment, workspace?.id, workspace?.name, workspace?.slug]);

  const persistDraft = async () => {
    if (!workspace?.id || !handle.trim()) {
      toast.error('Defina um slug/handle antes de salvar');
      return null;
    }

    const payload = {
      workspace_id: workspace.id,
      slug: slugify(handle),
      theme_id: themeId,
      theme_config: {
        primaryColor: brandKit?.color_primary || '#9353FF',
        secondaryColor: brandKit?.color_secondary || '#06B6D4',
        accentColor: brandKit?.color_accent || '#F59E0B',
      },
      profile: {
        avatar: brandKit?.logo_url || null,
        handle: slugify(handle),
        title: profileTitle,
        bio: profileBio,
        location: profileLocation,
      },
      links: blocks
        .filter((block) => block.type === 'link')
        .map((block) => ({ id: block.id, label: block.title, url: block.url, emoji: block.emoji })),
      blocks,
      seo_config: {
        title: profileTitle || slugify(handle),
        description: profileBio,
      },
    };

    const query = bioLinkId
      ? supabase.from('bio_links').update(payload).eq('id', bioLinkId).select('*').single()
      : supabase.from('bio_links').insert(payload).select('*').single();

    const { data, error } = await query;
    if (error) {
      toast.error('Nao foi possivel salvar o Bio Link');
      return null;
    }

    setBioLinkId(data.id);
    setIsPublished(Boolean(data.is_published));
    return data;
  };

  const saveDraft = async () => {
    setIsSaving(true);
    await persistDraft();
    setIsSaving(false);
    toast.success('Bio Link salvo');
  };

  const publish = async () => {
    setIsPublishing(true);
    try {
      const saved = await persistDraft();
      if (!saved?.id || !workspace?.id) return;

      setSimlabLoading(true);
      setSimlabError(null);
      const dispatch = await dispatchSimlabValidation({
        workspace_id: workspace.id,
        validation_type: 'journey',
        module_type: 'bio_link',
        stimulus_type: 'biolink_page',
        objective: profileTitle || handle || 'Validar Bio Link',
        audience_hint: briefing?.target_audience || null,
        target_ref: { table: 'bio_links', id: saved.id },
        variants: [{
          key: 'biolink_candidate_v1',
          label: profileTitle || handle || 'Bio Link',
          artifact: {
            slug: saved.slug,
            theme_id: themeId,
            profile: previewData.profile,
            blocks: previewData.blocks,
            links: saved.links,
            seo_config: saved.seo_config,
          },
        }],
        request_payload: {
          published: Boolean(saved.is_published),
          profile_title: profileTitle,
        },
        context_policy: {
          require_approval: true,
          review_for_journey: true,
        },
        wait_for_completion: true,
        timeout_ms: 95000,
      });

      const validated = await awaitSimlabCompletion(dispatch.run_id, 95000);
      setSimlabRun(validated.run);
      setSimlabInsight(validated.insight);
      setSimlabVariants(validated.variants);
      setSimlabError(validated.run.verdict === 'approved' ? null : validated.insight?.executive_summary || validated.run.failure_reason || null);

      if (validated.run.verdict !== 'approved') {
        toast.error(validated.insight?.executive_summary || validated.run.failure_reason || 'SimLab bloqueou a publicacao do Bio Link.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('biolink-render-publish', {
        body: {
          workspace_id: workspace.id,
          biolink_id: saved.id,
        },
      });

      if (error) throw error;

      setHandle(data?.slug || saved.slug);
      setIsPublished(true);
      toast.success('Bio Link publicado');
    } catch (error) {
      console.error(error);
      toast.error('Nao foi possivel publicar o Bio Link');
    } finally {
      setIsPublishing(false);
      setSimlabLoading(false);
    }
  };

  const refreshSimlabRun = async () => {
    if (!simlabRun?.id) return;
    setSimlabLoading(true);
    try {
      const status = await awaitSimlabCompletion(simlabRun.id, 15000);
      setSimlabRun(status.run);
      setSimlabInsight(status.insight);
      setSimlabVariants(status.variants);
      setSimlabError(status.run.verdict === 'approved' ? null : status.insight?.executive_summary || status.run.failure_reason || null);
    } catch (error) {
      setSimlabError(error instanceof Error ? error.message : String(error));
    } finally {
      setSimlabLoading(false);
    }
  };

  const publishWithOverride = async () => {
    if (!workspace?.id || !bioLinkId || !simlabRun?.id) return;
    const reason = window.prompt('Explique o motivo do override manual para publicar este Bio Link:');
    if (!reason || reason.trim().length < 8) {
      toast.error('Informe um motivo claro para registrar o override.');
      return;
    }

    setIsPublishing(true);
    try {
      await submitSimlabFeedback({
        workspace_id: workspace.id,
        simlab_run_id: simlabRun.id,
        source_module: 'bio_link',
        source_record_type: 'manual_override',
        source_record_id: bioLinkId,
        metric_key: 'override_publish',
        metric_value: 1,
        observation_payload: {
          reason: reason.trim(),
          verdict: simlabRun.verdict,
          slug: handle,
        },
      });

      const { data, error } = await supabase.functions.invoke('biolink-render-publish', {
        body: {
          workspace_id: workspace.id,
          biolink_id: bioLinkId,
        },
      });

      if (error) throw error;
      setHandle(data?.slug || handle);
      setIsPublished(true);
      toast.success('Bio Link publicado com override auditado');
    } catch (error) {
      console.error(error);
      toast.error('Nao foi possivel publicar com override');
    } finally {
      setIsPublishing(false);
    }
  };

  const updateBlock = (blockId: string, patch: Partial<BioLinkBlock>) => {
    setBlocks((current) => current.map((block) => (block.id === blockId ? { ...block, ...patch } : block)));
  };

  const addBlock = (type: BioLinkBlockType) => {
    const block = createBlock(type);
    setBlocks((current) => [...current, block]);
    setSelectedBlockId(block.id);
  };

  const publicUrl = `${window.location.origin}/b/${slugify(handle || 'suamarca')}`;

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      <div className="w-[360px] shrink-0 border-r overflow-y-auto no-scrollbar" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--text-3)' }}>Bio Link Premium</p>
          <h1 className="mt-2 text-2xl font-display font-bold" style={{ color: 'var(--text-1)' }}>Builder público da marca</h1>
          <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-3)' }}>
            Mesmo renderer no builder e na URL pública. Draft salva no banco e publicação gera HTML persistido.
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <Label>Slug público</Label>
            <Input value={handle} onChange={(event) => setHandle(slugify(event.target.value))} placeholder="suamarca" />
          </div>

          <div className="space-y-2">
            <Label>Tema</Label>
            <Select value={themeId} onValueChange={setThemeId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BIOLINK_THEMES.map((theme) => (
                  <SelectItem key={theme.id} value={theme.id}>{theme.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Título do perfil</Label>
            <Input value={profileTitle} onChange={(event) => setProfileTitle(event.target.value)} placeholder="Consultoria | Conteúdo | Estratégia" />
          </div>
          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea value={profileBio} onChange={(event) => setProfileBio(event.target.value)} className="min-h-[88px] resize-none" placeholder="Descrição curta da proposta de valor." />
          </div>
          <div className="space-y-2">
            <Label>Localização</Label>
            <Input value={profileLocation} onChange={(event) => setProfileLocation(event.target.value)} placeholder="São Paulo, Brasil" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Blocos</Label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {([
                { type: 'link',       emoji: '🔗', label: 'Link CTA' },
                { type: 'youtube',    emoji: '▶️', label: 'YouTube' },
                { type: 'spotify',    emoji: '🎵', label: 'Spotify' },
                { type: 'map',        emoji: '📍', label: 'Mapa' },
                { type: 'newsletter', emoji: '✉️', label: 'Newsletter' },
                { type: 'spacer',     emoji: '↕️', label: 'Espaço' },
              ] as const).map(({ type, emoji, label }) => (
                <button
                  key={type}
                  onClick={() => addBlock(type)}
                  className="h-10 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    color: 'var(--text-2)',
                  }}
                >
                  <span>{emoji}</span> {label} <Plus size={12} style={{ color: 'var(--primary)', marginLeft: 'auto' }} />
                </button>
              ))}
            </div>
            
            <div className="space-y-2">
              {blocks.map((block, index) => (
                <button
                  key={block.id}
                  onClick={() => setSelectedBlockId(block.id)}
                  className="w-full rounded-2xl p-4 text-left transition-all"
                  style={{
                    background: selectedBlockId === block.id ? 'var(--primary-muted)' : 'var(--bg-card)',
                    border: `1px solid ${selectedBlockId === block.id ? 'var(--primary)' : 'var(--border)'}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>
                        Bloco {index + 1}
                      </p>
                      <p className="mt-1 font-semibold" style={{ color: 'var(--text-1)' }}>
                        {block.title || block.type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-2)' }}>
                        {block.type}
                      </span>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setBlocks((current) => current.filter((item) => item.id !== block.id));
                          if (selectedBlockId === block.id) setSelectedBlockId(null);
                        }}
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedBlock && (
            <div className="rounded-3xl p-5 space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold" style={{ color: 'var(--text-1)' }}>Editor do bloco</h2>
                <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>
                  {selectedBlock.type}
                </span>
              </div>

              {selectedBlock.type !== 'spacer' && (
                <>
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input value={selectedBlock.title || ''} onChange={(event) => updateBlock(selectedBlock.id, { title: event.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>URL ou embed</Label>
                    <Input value={selectedBlock.url || ''} onChange={(event) => updateBlock(selectedBlock.id, { url: event.target.value })} placeholder="https://..." />
                  </div>
                </>
              )}

              {selectedBlock.type === 'link' && (
                <div className="grid grid-cols-[72px_1fr] gap-3">
                  <div className="space-y-2">
                    <Label>Emoji</Label>
                    <Input value={selectedBlock.emoji || ''} onChange={(event) => updateBlock(selectedBlock.id, { emoji: event.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nota curta</Label>
                    <Input value={selectedBlock.note || ''} onChange={(event) => updateBlock(selectedBlock.id, { note: event.target.value })} placeholder="Uma frase de contexto" />
                  </div>
                </div>
              )}

              {selectedBlock.type === 'newsletter' && (
                <>
                  <div className="space-y-2">
                    <Label>Texto de apoio</Label>
                    <Textarea value={selectedBlock.note || ''} onChange={(event) => updateBlock(selectedBlock.id, { note: event.target.value })} className="min-h-[72px] resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Placeholder</Label>
                      <Input value={selectedBlock.placeholder || ''} onChange={(event) => updateBlock(selectedBlock.id, { placeholder: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Botão</Label>
                      <Input value={selectedBlock.buttonLabel || ''} onChange={(event) => updateBlock(selectedBlock.id, { buttonLabel: event.target.value })} />
                    </div>
                  </div>
                </>
              )}

              {selectedBlock.type === 'map' && (
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea value={selectedBlock.note || ''} onChange={(event) => updateBlock(selectedBlock.id, { note: event.target.value })} className="min-h-[72px] resize-none" placeholder="Atendimento presencial, showroom, estúdio..." />
                </div>
              )}

              {selectedBlock.type === 'spacer' && (
                <div className="space-y-2">
                  <Label>Altura</Label>
                  <Input type="number" min={8} max={120} value={selectedBlock.height || 24} onChange={(event) => updateBlock(selectedBlock.id, { height: Number(event.target.value) || 24 })} />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Button onClick={saveDraft} disabled={isSaving} variant="outline" className="gap-2">
              <Save size={14} /> {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button onClick={publish} disabled={isPublishing} className="gap-2" style={{ background: 'var(--primary)', color: '#fff' }}>
              <Send size={14} /> {isPublishing ? 'Publicando...' : 'Publicar'}
            </Button>
          </div>

          {simlabRun?.verdict && simlabRun.verdict !== 'approved' ? (
            <Button onClick={publishWithOverride} disabled={isPublishing} variant="outline" className="w-full gap-2">
              <Send size={14} /> Publicar com override auditado
            </Button>
          ) : null}

          <SimlabReviewPanel
            title="SimLab Journey Review"
            run={simlabRun}
            insight={simlabInsight}
            variants={simlabVariants}
            loading={simlabLoading}
            error={simlabError}
            onRefresh={simlabRun?.id ? refreshSimlabRun : null}
          />

          <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>URL pública</p>
                <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{publicUrl}</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: isPublished ? 'rgba(16,185,129,0.14)' : 'rgba(255,255,255,0.06)', color: isPublished ? '#10B981' : 'var(--text-3)' }}>
                {isPublished ? 'Publicado' : 'Draft'}
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => navigator.clipboard.writeText(publicUrl)} className="gap-2">
                <Copy size={14} /> Copiar
              </Button>
              <Button variant="outline" onClick={() => window.open(publicUrl, '_blank')} className="gap-2">
                <Globe size={14} /> Abrir
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="px-8 py-8 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <div>
            <p className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--text-3)' }}>Live Preview</p>
            <h2 className="mt-2 text-2xl font-display font-bold" style={{ color: 'var(--text-1)' }}>Preview público compartilhado</h2>
          </div>
          <div className="flex items-center gap-2">
            <Eye size={16} style={{ color: 'var(--primary)' }} />
            <Link2 size={16} style={{ color: 'var(--primary)' }} />
            <Plus size={16} style={{ color: 'var(--primary)' }} />
          </div>
        </div>

        <div className="p-8">
          <div className="rounded-[36px] overflow-hidden border mx-auto max-w-[420px] shadow-2xl" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <BioLinkRenderer data={previewData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BioLinkPage;
