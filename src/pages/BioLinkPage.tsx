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
import { supabase } from '@/integrations/supabase/client'
import { fromTable } from '@/integrations/supabase/db-custom';
import type { Json } from '@/integrations/supabase/types';
import { BIOLINK_THEMES, BioLinkBlock, type BioLinkBlockType, normalizeBioLinkBlocks, slugify } from '@/lib/postgenPhase3';
import { awaitSimlabCompletion, dispatchSimlabValidation, submitSimlabFeedback, type SimlabInsight, type SimlabRun, type SimlabVariant } from '@/lib/simlab';

const blockOptions: Array<{ id: BioLinkBlockType; label: string }> = [
  { id: 'link', label: 'Link CTA' },
  { id: 'site_card', label: 'Site Oficial' },
  { id: 'blog_card', label: 'Blog Posts' },
  { id: 'youtube', label: 'YouTube Embed' },
  { id: 'spotify', label: 'Spotify Embed' },
  { id: 'map', label: 'Google Maps Box' },
  { id: 'newsletter', label: 'Newsletter Form' },
  { id: 'spacer', label: 'Spacer' },
];

const createBlock = (type: BioLinkBlockType): BioLinkBlock => ({
  id: crypto.randomUUID(),
  type,
  title: type === 'newsletter' ? 'Receba atualizações' : type === 'site_card' ? 'Acesse nosso Site' : type === 'blog_card' ? 'Últimos Artigos' : 'Novo bloco',
  url: '',
  emoji: type === 'link' ? '🔗' : type === 'site_card' ? '🌐' : type === 'blog_card' ? '📰' : undefined,
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
        .from('bio_links' as any)
        .select('*')
        .eq('workspace_id', workspace.id)
        .maybeSingle() as { data: any; error: any };

      if (!mounted) return;
      if (error) {
        // If it's a "relation does not exist" error, migration is still pending
        const isPending = error.message?.includes('does not exist') || error.code === '42P01';
        if (isPending) {
          toast.info('Bio Link em configuração. Aguarde alguns instantes e atualize a página.', { duration: 6000 });
        } else {
          toast.error('Não foi possível carregar o Bio Link');
        }
        // Initialize with defaults so the UI stays usable
        const initialHandle = briefing?.instagram_handle?.replace('@', '')
          || briefing?.company_name
          || workspace.slug
          || workspace.name;
        setHandle(slugify(initialHandle || 'suamarca'));
        setProfileBio(briefing?.main_differentials || '');
        setProfileTitle(briefing?.segment || 'Link hub premium');
        setBlocks([createBlock('link')]);
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
      } as unknown as Json,
      profile: {
        avatar: brandKit?.logo_url || null,
        handle: slugify(handle),
        title: profileTitle,
        bio: profileBio,
        location: profileLocation,
      } as unknown as Json,
      links: blocks
        .filter((block) => block.type === 'link')
        .map((block) => ({ id: block.id, label: block.title, url: block.url, emoji: block.emoji })) as unknown as Json,
      blocks: blocks as unknown as Json,
      ccp_context: ({
        type: 'cerebro/biolink/v1',
        workspace_id: workspace.id,
        brand: {
          name: briefing?.company_name || workspace.name || '',
          segment: briefing?.segment || '',
          tone: briefing?.tone_of_voice || '',
        },
        content: {
          links_count: blocks.filter((b) => b.type === 'link').length,
          blocks_count: blocks.length,
          block_types: blocks.map((b) => b.type),
          primary_cta: blocks.find((b) => b.type === 'link')?.title || null,
        },
        seo: {
          title: profileTitle || slugify(handle),
          description: profileBio,
        },
        simlab: {
          verdict: simlabRun?.verdict || null,
          run_id: simlabRun?.id || null,
        },
        generated_at: new Date().toISOString(),
      }) as unknown as Json,
      seo_config: {
        title: profileTitle || slugify(handle),
        description: profileBio,
      } as unknown as Json,
    };

    const query = bioLinkId
      ? fromTable('bio_links').update(payload).eq('id', bioLinkId).select('*').single()
      : fromTable('bio_links').insert(payload).select('*').single();

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
      {/* LEFT COLUMN: GLOBAL CONFIG */}
      <div className="w-[320px] shrink-0 border-r overflow-y-auto no-scrollbar z-10 flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--text-3)' }}>Bio Link</p>
          <h1 className="mt-1 text-xl font-display font-bold" style={{ color: 'var(--text-1)' }}>Cores & Perfil</h1>
        </div>

        <div className="p-6 flex-1 space-y-6">
          <div className="space-y-2">
            <Label>Slug público</Label>
            <Input value={handle} onChange={(event) => setHandle(slugify(event.target.value))} placeholder="suamarca" />
          </div>
          <div className="space-y-2">
            <Label>Tema Visual</Label>
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
            <Input value={profileTitle} onChange={(event) => setProfileTitle(event.target.value)} placeholder="Consultoria | Conteúdo" />
          </div>
          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea value={profileBio} onChange={(event) => setProfileBio(event.target.value)} className="min-h-[88px] resize-none" placeholder="Descrição curta..." />
          </div>
          <div className="space-y-2">
            <Label>Localização</Label>
            <Input value={profileLocation} onChange={(event) => setProfileLocation(event.target.value)} placeholder="São Paulo, Brasil" />
          </div>
        </div>

        <div className="p-6 border-t mt-auto space-y-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>URL pública</p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: isPublished ? 'rgba(16,185,129,0.14)' : 'rgba(255,255,255,0.06)', color: isPublished ? '#10B981' : 'var(--text-3)' }}>
              {isPublished ? 'Live' : 'Draft'}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(publicUrl)} className="flex-1 h-8 text-xs gap-2">
              <Copy size={12} /> Copiar
            </Button>
            <Button variant="outline" onClick={() => window.open(publicUrl, '_blank')} className="flex-1 h-8 text-xs gap-2">
              <Globe size={12} /> Abrir
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button onClick={saveDraft} disabled={isSaving} variant="outline" className="gap-2 text-xs h-9">
              <Save size={14} /> Salvar
            </Button>
            <Button onClick={publish} disabled={isPublishing} className="gap-2 text-xs h-9 shadow-lg" style={{ background: 'var(--primary)', color: '#fff' }}>
              <Send size={14} /> Publicar
            </Button>
          </div>
        </div>
      </div>

      {/* CENTER COLUMN: LIVE PREVIEW + BOTTOM ISLAND */}
      <div className="flex-1 relative flex flex-col overflow-y-auto no-scrollbar" style={{ background: 'rgba(0,0,0,0.2)' }}>
        <div className="px-8 py-6 flex items-center justify-center pointer-events-none sticky top-0 z-10 w-full">
          <div className="px-4 py-2 rounded-full cursor-pointer pointer-events-auto backdrop-blur-xl border text-sm font-semibold flex items-center gap-2" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
             <Eye size={14} style={{ color: 'var(--primary)' }} /> Live Preview
          </div>
        </div>

        <div className="p-8 pb-[140px]">
          <div className="rounded-[40px] overflow-hidden border mx-auto w-full max-w-[420px] shadow-2xl transition-all" style={{ borderColor: 'rgba(255,255,255,0.1)', background: '#09090b', minHeight: '600px' }}>
            <BioLinkRenderer data={previewData} onBlockClick={setSelectedBlockId} activeBlockId={selectedBlockId} />
          </div>
        </div>

        {/* BOTTOM ISLAND DOCK */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto safe-area-bottom">
          <div className="flex items-center p-1.5 rounded-2xl backdrop-blur-2xl border shadow-2xl" style={{ background: 'rgba(15, 15, 20, 0.75)', borderColor: 'rgba(255,255,255,0.1)' }}>
            {([
              { type: 'link',       emoji: '🔗', label: 'Link' },
              { type: 'site_card',  emoji: '🌐', label: 'Site' },
              { type: 'blog_card',  emoji: '📰', label: 'Blog' },
              { type: 'youtube',    emoji: '▶️', label: 'Vídeo' },
              { type: 'spotify',    emoji: '🎵', label: 'Áudio' },
              { type: 'map',        emoji: '📍', label: 'Mapa' },
              { type: 'newsletter', emoji: '✉️', label: 'Lead' },
              { type: 'spacer',     emoji: '↕️', label: 'Espaço' },
            ] as const).map(({ type, emoji, label }) => (
              <button
                key={type}
                onClick={() => addBlock(type)}
                className="flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-[14px] mx-0.5 transition-all hover:-translate-y-2 hover:bg-white/10 group"
              >
                <div className="text-xl sm:text-2xl mb-1 group-hover:scale-110 transition-transform">{emoji}</div>
                <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 group-hover:text-white uppercase tracking-wider">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: BLOCK EDITOR */}
      {selectedBlock ? (
        <div className="w-[340px] shrink-0 border-l overflow-y-auto no-scrollbar z-10 animate-in slide-in-from-right flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <div>
              <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--primary)' }}>{selectedBlock.type}</p>
              <h2 className="mt-1 text-lg font-bold">Propriedades</h2>
            </div>
            <button
              onClick={() => {
                setBlocks((current) => current.filter((item) => item.id !== selectedBlock.id));
                setSelectedBlockId(null);
              }}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-red-500/20 text-red-500"
              title="Remover Bloco"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="p-6 space-y-5 flex-1">
            {selectedBlock.type !== 'spacer' && (
              <>
                <div className="space-y-2">
                  <Label>Título do Bloco</Label>
                  <Input value={selectedBlock.title || ''} onChange={(event) => updateBlock(selectedBlock.id, { title: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Link de Destino / ID Embed</Label>
                  <Input value={selectedBlock.url || ''} onChange={(event) => updateBlock(selectedBlock.id, { url: event.target.value })} placeholder="https://..." />
                </div>
              </>
            )}

            {(selectedBlock.type === 'link' || selectedBlock.type === 'site_card' || selectedBlock.type === 'blog_card') && (
              <div className="grid grid-cols-[72px_1fr] gap-3">
                <div className="space-y-2">
                  <Label>Ícone</Label>
                  <Input value={selectedBlock.emoji || ''} onChange={(event) => updateBlock(selectedBlock.id, { emoji: event.target.value })} className="text-center text-lg" />
                </div>
                <div className="space-y-2">
                  <Label>Subtítulo</Label>
                  <Input value={selectedBlock.note || ''} onChange={(event) => updateBlock(selectedBlock.id, { note: event.target.value })} placeholder="Ex: Assista agora" />
                </div>
              </div>
            )}

            {selectedBlock.type === 'newsletter' && (
              <>
                <div className="space-y-2">
                  <Label>Texto de Apoio</Label>
                  <Textarea value={selectedBlock.note || ''} onChange={(event) => updateBlock(selectedBlock.id, { note: event.target.value })} className="min-h-[72px] resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Placeholder</Label>
                    <Input value={selectedBlock.placeholder || ''} onChange={(event) => updateBlock(selectedBlock.id, { placeholder: event.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Texto do Botão</Label>
                    <Input value={selectedBlock.buttonLabel || ''} onChange={(event) => updateBlock(selectedBlock.id, { buttonLabel: event.target.value })} />
                  </div>
                </div>
              </>
            )}

            {selectedBlock.type === 'map' && (
              <div className="space-y-2">
                <Label>Endereço de Busca</Label>
                <Textarea value={selectedBlock.note || ''} onChange={(event) => updateBlock(selectedBlock.id, { note: event.target.value })} className="min-h-[64px] resize-none" placeholder="Av. Paulista, 1000 - SP" />
                <p className="text-[10px] text-zinc-500">Este alamat será usado na busca nativa do widget do mapa.</p>
              </div>
            )}

            {selectedBlock.type === 'spacer' && (
              <div className="space-y-2">
                <Label>Altura do Espaçador (px)</Label>
                <Input type="number" min={8} max={200} value={selectedBlock.height || 24} onChange={(event) => updateBlock(selectedBlock.id, { height: Number(event.target.value) || 24 })} />
              </div>
            )}
          </div>
          
          <div className="p-6 border-t" style={{ borderColor: 'var(--border)' }}>
             <Button className="w-full" variant="outline" onClick={() => setSelectedBlockId(null)}>Fechar Edição</Button>
          </div>
        </div>
      ) : (
        <div className="w-[340px] shrink-0 border-l flex flex-col items-center justify-center p-8 text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <div className="w-20 h-20 rounded-3xl mb-6 flex items-center justify-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <Link2 size={32} style={{ color: 'var(--text-3)' }} />
          </div>
          <h3 className="font-display font-bold text-xl mb-3 text-text1">Nenhum bloco</h3>
          <p className="text-sm text-text3 max-w-[240px] leading-relaxed">
            Clique em um bloco existente no preview para editar ou adicione um novo bloco no dock inferior.
          </p>
          
          <div className="mt-8 w-full space-y-2">
             <p className="text-xs uppercase font-bold tracking-wider text-text3 text-left">Ordem dos Blocos</p>
             {blocks.map(block => (
               <button key={block.id} onClick={() => setSelectedBlockId(block.id)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-left">
                  <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center text-sm">{block.emoji || (block.type === 'spacer' ? '↕️' : '🔗')}</div>
                  <div className="flex-1 truncate">
                    <p className="text-sm font-semibold truncate">{block.title || block.type}</p>
                  </div>
               </button>
             ))}
             {blocks.length === 0 && <p className="text-sm text-text3 italic text-left">Bio vazia.</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default BioLinkPage;
