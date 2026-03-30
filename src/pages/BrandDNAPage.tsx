import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dna, Globe, Loader2, Plus, Search, Sparkles,
  ExternalLink, Eye, Copy, CheckCircle, XCircle, Clock,
  Palette, Type, MessageSquare, LayoutTemplate,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import SlideFrame from '@/components/canvas/SlideFrame';

// ─── Types ───────────────────────────────────────────────────

interface LayoutDna {
  grid_type?: string;
  content_hierarchy?: string[];
  visual_weight?: string;
  padding_style?: string;
  alignment?: string;
  aspect_ratio_preference?: string;
}

interface BrandDna {
  color_palette?: { primary?: string; secondary?: string; accent?: string; background?: string; text?: string };
  typography_style?: string;
  visual_aesthetic?: string;
  texture_style?: string;
  color_mood?: string;
}

interface CopyDna {
  tone_primary?: string;
  hook_patterns?: string[];
  headline_style?: string;
  cta_style?: string;
  copywriting_framework?: string;
  emoji_usage?: string;
  content_pillars?: string[];
}

interface BrandTemplate {
  id: string;
  workspace_id: string;
  source_url: string;
  source_name: string | null;
  source_platform: string | null;
  layout_dna: LayoutDna | null;
  brand_dna: BrandDna | null;
  copy_dna: CopyDna | null;
  html_template: string | null;
  screenshot_url: string | null;
  style_tags: string[] | null;
  category: string | null;
  status: string | null;
  error_message: string | null;
  is_public: boolean;
  use_count: number;
  created_at: string;
  analyzed_at: string | null;
}

// ─── STATUS BADGE ─────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string | null }) => {
  const configs: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
    ready:     { icon: <CheckCircle size={11} />, label: 'Pronto',    color: '#10B981', bg: '#10B98115' },
    analyzing: { icon: <Loader2 size={11} className="animate-spin" />, label: 'Analisando', color: '#F59E0B', bg: '#F59E0B15' },
    pending:   { icon: <Clock size={11} />,       label: 'Aguardando', color: '#64748B', bg: '#64748B15' },
    failed:    { icon: <XCircle size={11} />,     label: 'Falhou',    color: '#EF4444', bg: '#EF444415' },
  };
  const cfg = configs[status || 'pending'] || configs.pending;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.icon}{cfg.label}
    </span>
  );
};

// ─── DNA SECTION CARD ─────────────────────────────────────────

const DnaSection = ({ icon, title, items }: { icon: React.ReactNode; title: string; items: [string, string][] }) => (
  <div className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
    <div className="flex items-center gap-2 mb-2.5">
      <span style={{ color: 'var(--primary)' }}>{icon}</span>
      <span className="text-xs font-semibold" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-display)' }}>{title}</span>
    </div>
    <div className="space-y-1.5">
      {items.filter(([, v]) => v && v !== 'undefined').map(([label, value]) => (
        <div key={label} className="flex items-start justify-between gap-2">
          <span className="text-[10px]" style={{ color: 'var(--text-3)', flexShrink: 0 }}>{label}</span>
          <span className="text-[10px] font-medium text-right" style={{ color: 'var(--text-1)' }}>{value}</span>
        </div>
      ))}
    </div>
  </div>
);

// ─── PLATFORM DETECTOR ────────────────────────────────────────

const detectPlatform = (url: string): string => {
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('linkedin.com')) return 'linkedin';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  return 'web';
};

const platformLabel: Record<string, string> = {
  instagram: '📸 Instagram', linkedin: '💼 LinkedIn', tiktok: '🎵 TikTok',
  twitter: '🐦 Twitter/X', web: '🌐 Web',
};

// ─── MAIN PAGE ────────────────────────────────────────────────

const BrandDNAPage = () => {
  const { workspace } = useWorkspace();
  const [templates, setTemplates] = useState<BrandTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCloning, setIsCloning] = useState(false);
  const [url, setUrl] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ready' | 'analyzing'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<BrandTemplate | null>(null);

  // ─ Fetch templates (public = all workspaces can see them) ─
  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('brand_templates')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setTemplates((data || []) as BrandTemplate[]);
    } catch {
      toast.error('Erro ao carregar templates de DNA');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // ─ Poll for analyzing templates ─
  useEffect(() => {
    const hasAnalyzing = templates.some(t => t.status === 'analyzing' || t.status === 'pending');
    if (!hasAnalyzing) return;
    const interval = setInterval(fetchTemplates, 4000);
    return () => clearInterval(interval);
  }, [templates, fetchTemplates]);

  // ─ Clone DNA ─────────────────────────────────────────────
  const handleClone = async () => {
    if (!url.trim()) { toast.error('Cole uma URL para analisar'); return; }
    if (!workspace?.id) { toast.error('Workspace não encontrado'); return; }

    setIsCloning(true);
    try {
      const { data, error } = await supabase.functions.invoke('clone-brand-template', {
        body: {
          workspace_id: workspace.id,
          url: url.trim(),
          source_name: sourceName.trim() || undefined,
          source_platform: detectPlatform(url.trim()),
        },
      });

      if (error) throw error;

      toast.success('Análise de DNA iniciada! Aguarde alguns segundos...');
      setUrl('');
      setSourceName('');
      await fetchTemplates();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao iniciar análise';
      toast.error(msg);
    } finally {
      setIsCloning(false);
    }
  };

  const filteredTemplates = templates.filter(t => {
    if (filterStatus === 'all') return true;
    return t.status === filterStatus;
  });

  const readyCount = templates.filter(t => t.status === 'ready').length;
  const myCount = templates.filter(t => t.workspace_id === workspace?.id).length;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-app)' }}>

      {/* ─ Header ─ */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}>
            <Dna size={16} color="white" />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-1)' }}>
              Brand DNA Cloner
            </h1>
            <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>
              {readyCount} templates prontos · {myCount} criados por você · compartilhados globalmente
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'ready', 'analyzing'] as const).map(f => (
            <button key={f} onClick={() => setFilterStatus(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: filterStatus === f ? 'var(--primary-muted)' : 'var(--bg-card)',
                color: filterStatus === f ? 'var(--primary)' : 'var(--text-3)',
                border: `1px solid ${filterStatus === f ? 'var(--primary)' : 'var(--border)'}`,
              }}>
              {f === 'all' ? 'Todos' : f === 'ready' ? 'Prontos' : 'Analisando'}
            </button>
          ))}
        </div>
      </div>

      {/* ─ URL Input Form ─ */}
      <div className="px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>
          Analisar Nova Marca
        </p>
        <div className="flex gap-3 items-start">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleClone(); }}
                placeholder="https://instagram.com/p/... ou URL do perfil, site, LinkedIn..."
                className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <input
              value={sourceName}
              onChange={e => setSourceName(e.target.value)}
              placeholder="Nome da marca (opcional)"
              className="px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-1)', width: 200 }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <button
            onClick={handleClone}
            disabled={isCloning || !url.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: 'var(--primary)', color: 'white', boxShadow: '0 4px 16px rgba(124,58,237,0.3)', whiteSpace: 'nowrap' }}>
            {isCloning ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {isCloning ? 'Analisando...' : 'Clonar DNA'}
          </button>
        </div>
        <p className="mt-2 text-[10px]" style={{ color: 'var(--text-3)' }}>
          🧬 A IA visita a URL, captura screenshot, analisa layout · identidade visual · paleta de cores · metodologia de copy e gera um template HTML reutilizável. Templates são públicos para todos os workspaces.
        </p>
      </div>

      {/* ─ Templates Grid ─ */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl animate-pulse" style={{ background: 'var(--bg-card)', height: 240 }} />
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <Dna size={32} style={{ color: 'var(--text-3)' }} />
            </div>
            <div>
              <p className="font-semibold mb-1" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-display)' }}>
                Nenhum DNA clonado ainda
              </p>
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                Cole uma URL acima para começar a análise
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filteredTemplates.map((tpl, index) => (
              <motion.div
                key={tpl.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="group rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.01]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                onClick={() => tpl.status === 'ready' && setSelectedTemplate(tpl)}>

                {/* Preview area */}
                <div className="relative" style={{ height: 160, background: 'var(--bg-elevated)' }}>
                  {tpl.status === 'ready' && tpl.html_template ? (
                    <div style={{
                      position: 'absolute', top: 0, left: 0,
                      width: 540, height: 540,
                      transform: `scale(${160 / 540})`,
                      transformOrigin: 'top left',
                      pointerEvents: 'none',
                    }}>
                      <SlideFrame slideHtml={tpl.html_template} width={540} height={540} />
                    </div>
                  ) : tpl.screenshot_url ? (
                    <img src={tpl.screenshot_url} alt={tpl.source_name || 'Preview'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {tpl.status === 'analyzing' ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--primary)' }} />
                          <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>Analisando DNA...</span>
                        </div>
                      ) : tpl.status === 'failed' ? (
                        <XCircle size={28} style={{ color: 'var(--error)' }} />
                      ) : (
                        <Dna size={28} style={{ color: 'var(--text-3)' }} />
                      )}
                    </div>
                  )}

                  {/* Hover overlay */}
                  {tpl.status === 'ready' && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(0,0,0,0.6)' }}>
                      <div className="flex gap-2">
                        <div className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ background: 'var(--primary)', color: 'white' }}>
                          <Eye size={12} className="inline mr-1" />Ver DNA
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Platform badge */}
                  <div className="absolute top-2 left-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(0,0,0,0.7)', color: 'white', backdropFilter: 'blur(4px)' }}>
                      {platformLabel[tpl.source_platform || 'web']}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="absolute top-2 right-2">
                    <StatusBadge status={tpl.status} />
                  </div>
                </div>

                {/* Card body */}
                <div className="p-3">
                  <p className="text-sm font-semibold truncate mb-1" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-display)' }}>
                    {tpl.source_name || tpl.source_url}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(tpl.style_tags || []).slice(0, 3).map(tag => (
                      <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full"
                        style={{ background: 'var(--primary-muted)', color: 'var(--primary)', border: '1px solid var(--border)' }}>
                        {tag}
                      </span>
                    ))}
                    {tpl.is_public && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full ml-auto"
                        style={{ background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
                        global
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ─ Detail Modal ─ */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-1)' }}>
          {selectedTemplate && (
            <>
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'var(--font-display)', color: 'var(--text-1)' }}>
                  <div className="flex items-center gap-3">
                    <Dna size={18} style={{ color: 'var(--primary)' }} />
                    {selectedTemplate.source_name || selectedTemplate.source_url}
                    <a href={selectedTemplate.source_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={14} style={{ color: 'var(--text-3)' }} />
                    </a>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-6">
                {/* Left: Template preview */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                    Template Gerado
                  </p>
                  {selectedTemplate.html_template && (
                    <div className="relative rounded-xl overflow-hidden" style={{ height: 300, background: 'var(--bg-elevated)' }}>
                      <div style={{
                        position: 'absolute', top: 0, left: 0,
                        width: 540, height: 540,
                        transform: `scale(${300 / 540})`,
                        transformOrigin: 'top left',
                        pointerEvents: 'none',
                      }}>
                        <SlideFrame slideHtml={selectedTemplate.html_template} width={540} height={540} />
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (!selectedTemplate.html_template) return;
                      navigator.clipboard.writeText(selectedTemplate.html_template);
                      toast.success('HTML do template copiado!');
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--primary)', color: 'white' }}>
                    <Copy size={14} /> Copiar HTML do Template
                  </button>

                  {/* Color palette */}
                  {selectedTemplate.brand_dna?.color_palette && (
                    <div className="flex gap-2 mt-2">
                      {Object.entries(selectedTemplate.brand_dna.color_palette).map(([name, hex]) =>
                        hex ? (
                          <div key={name} className="flex flex-col items-center gap-1">
                            <div className="w-8 h-8 rounded-lg border" style={{ background: hex, borderColor: 'var(--border)' }} />
                            <span className="text-[8px]" style={{ color: 'var(--text-3)' }}>{hex}</span>
                          </div>
                        ) : null
                      )}
                    </div>
                  )}
                </div>

                {/* Right: DNA Analysis */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                    DNA Identificado
                  </p>

                  {/* Layout DNA */}
                  {selectedTemplate.layout_dna && (
                    <DnaSection
                      icon={<LayoutTemplate size={13} />}
                      title="Layout & Grid"
                      items={[
                        ['Tipo de grid', selectedTemplate.layout_dna.grid_type || ''],
                        ['Peso visual', selectedTemplate.layout_dna.visual_weight || ''],
                        ['Padding', selectedTemplate.layout_dna.padding_style || ''],
                        ['Alinhamento', selectedTemplate.layout_dna.alignment || ''],
                        ['Proporção', selectedTemplate.layout_dna.aspect_ratio_preference || ''],
                      ]}
                    />
                  )}

                  {/* Brand DNA */}
                  {selectedTemplate.brand_dna && (
                    <DnaSection
                      icon={<Palette size={13} />}
                      title="Identidade Visual"
                      items={[
                        ['Estética', selectedTemplate.brand_dna.visual_aesthetic || ''],
                        ['Tipografia', selectedTemplate.brand_dna.typography_style || ''],
                        ['Textura', selectedTemplate.brand_dna.texture_style || ''],
                        ['Mood de cor', selectedTemplate.brand_dna.color_mood || ''],
                      ]}
                    />
                  )}

                  {/* Copy DNA */}
                  {selectedTemplate.copy_dna && (
                    <DnaSection
                      icon={<MessageSquare size={13} />}
                      title="Copywriting & Tom"
                      items={[
                        ['Tom', selectedTemplate.copy_dna.tone_primary || ''],
                        ['Framework', selectedTemplate.copy_dna.copywriting_framework || ''],
                        ['Estilo de headline', selectedTemplate.copy_dna.headline_style || ''],
                        ['CTA', selectedTemplate.copy_dna.cta_style || ''],
                        ['Emojis', selectedTemplate.copy_dna.emoji_usage || ''],
                        ['Hooks', (selectedTemplate.copy_dna.hook_patterns || []).join(', ') || ''],
                      ]}
                    />
                  )}

                  {/* Content Pillars */}
                  {selectedTemplate.copy_dna?.content_pillars?.length ? (
                    <div className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Type size={13} style={{ color: 'var(--primary)' }} />
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>Pilares de Conteúdo</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTemplate.copy_dna.content_pillars.map(p => (
                          <span key={p} className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: 'var(--primary-muted)', color: 'var(--primary)', border: '1px solid var(--border)' }}>
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BrandDNAPage;
