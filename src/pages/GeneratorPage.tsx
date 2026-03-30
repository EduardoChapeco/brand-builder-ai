import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Wand2, Search, Upload, RefreshCw, Download, Copy, ChevronLeft, ChevronRight, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import ArtboardStage from '@/components/canvas/ArtboardStage';
import SlideFrame from '@/components/canvas/SlideFrame';
import {
  ArtboardDimension, ArtboardFormat, BrandKit, DEFAULT_BRAND_KIT, SlideData,
  ARTBOARD_DIMENSIONS, getArtboardDimensions,
} from '@/lib/canvasEngine';
import { TEMPLATE_REGISTRY, getTemplate } from '@/lib/templateRegistry';
import { exportSlide, exportAllSlides, uploadSlideToStorage } from '@/lib/exportPost';

type Tone    = 'Casual' | 'Sério' | 'Informativo' | 'Humor' | 'Urgente';
type Funnel  = 'Awareness' | 'Educativo' | 'Captar Leads' | 'Vendas' | 'Engajamento';
type VisMod  = 'editorial' | 'bold' | 'minimal' | 'dark' | 'documentary';

interface GeneratedSlide {
  index:    number;
  type:     string;
  headline: string;
  body:     string;
  cta?:     string;
}

interface GeneratedContent {
  post_title:   string;
  slides:       GeneratedSlide[];
  caption:      string;
  hashtags:     string;
  bg_prompt_hint: string;
}

interface GeneratedImageResponse {
  imageUrl?: string;
  error?: string;
}

interface StoredGenerationMeta {
  artboard_format?: ArtboardFormat;
  generated_content?: GeneratedContent | null;
  bg_image_url?: string | null;
}

interface EditablePost {
  id: string;
  title: string | null;
  format: string;
  slides_html: string[];
  slides_count: number;
  caption: string | null;
  hashtags: string | null;
  template_id: string | null;
  visual_mode: string | null;
  funnel_type: string | null;
  image_urls: string[] | null;
  generation_meta?: StoredGenerationMeta | null;
  source_topic?: string | null;
  source_url?: string | null;
}

interface RssTopic {
  title:       string;
  description: string;
  url:         string;
  source_name: string;
  published_at: string;
  source_type?: 'rss' | 'ai';
}

type EditableFieldName = 'headline' | 'body' | 'cta';

const TONES:   Tone[]   = ['Casual', 'Sério', 'Informativo', 'Humor', 'Urgente'];
const FUNNELS: Funnel[] = ['Awareness', 'Educativo', 'Captar Leads', 'Vendas', 'Engajamento'];
const VIS_MODES: { id: VisMod; label: string }[] = [
  { id: 'editorial', label: 'Editorial' },
  { id: 'bold',      label: 'Bold'      },
  { id: 'minimal',   label: 'Minimal'   },
  { id: 'dark',      label: 'Dark'      },
  { id: 'documentary', label: 'Docu'   },
];
const FORMAT_OPTIONS = Object.entries(ARTBOARD_DIMENSIONS) as Array<[ArtboardFormat, ArtboardDimension]>;

const getPersistedPostFormat = (format: ArtboardFormat, slidesCount: number): string => {
  if (slidesCount > 1) return 'carousel';
  if (format === 'story') return 'story';
  if (format === 'landscape') return 'landscape';
  return 'post';
};

const getArtboardFormatFromStoredPost = (post: EditablePost): ArtboardFormat => {
  const storedFormat = post.generation_meta?.artboard_format;
  if (storedFormat && storedFormat in ARTBOARD_DIMENSIONS) return storedFormat;
  if (post.format === 'story') return 'story';
  if (post.format === 'landscape') return 'landscape';
  return 'square';
};

const normalizeEditableFieldValue = (field: EditableFieldName, value: string): string => {
  const trimmed = value.trim();
  if (field !== 'cta') return trimmed;
  return trimmed.replace(/^[\s→]+/, '').replace(/[\s→]+$/, '');
};

const extractSlideFields = (slideHtml: string): Partial<Record<EditableFieldName, string>> => {
  if (!slideHtml.trim()) return {};

  const parser = new DOMParser();
  const doc = parser.parseFromString(slideHtml, 'text/html');
  const result: Partial<Record<EditableFieldName, string>> = {};

  (['headline', 'body', 'cta'] as EditableFieldName[]).forEach(field => {
    const values = Array.from(doc.querySelectorAll<HTMLElement>(`[data-postgen-field="${field}"]`))
      .map(node => normalizeEditableFieldValue(field, node.innerHTML))
      .filter(Boolean);

    if (values.length > 0) {
      result[field] = field === 'body' ? values.join('\n') : values[0];
    }
  });

  return result;
};

const applySlideHtmlToContent = (
  content: GeneratedContent,
  slidesHtml: string[],
): GeneratedContent => ({
  ...content,
  slides: content.slides.map((slide, index) => {
    const editableFields = extractSlideFields(slidesHtml[index] || '');
    return {
      ...slide,
      headline: editableFields.headline || slide.headline,
      body: editableFields.body || slide.body,
      cta: editableFields.cta ?? slide.cta,
    };
  }),
});

const GeneratorPage = () => {
  const location = useLocation();
  const { workspace, brandKit: wsBrandKit } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hydratedPostIdRef = useRef<string | null>(null);
  const brand: BrandKit = useMemo(() => (
    wsBrandKit ? {
      color_primary:    wsBrandKit.color_primary,
      color_secondary:  wsBrandKit.color_secondary,
      color_accent:     wsBrandKit.color_accent,
      color_bg_dark:    wsBrandKit.color_bg_dark,
      color_bg_light:   wsBrandKit.color_bg_light,
      color_text_dark:  wsBrandKit.color_text_dark,
      color_text_light: wsBrandKit.color_text_light,
      font_headline:    wsBrandKit.font_headline,
      font_body:        wsBrandKit.font_body,
      font_accent:      wsBrandKit.font_accent,
      logo_url:         wsBrandKit.logo_url,
      watermark_text:   wsBrandKit.watermark_text,
    } : DEFAULT_BRAND_KIT
  ), [wsBrandKit]);

  // Config state
  const [format,       setFormat]       = useState<ArtboardFormat>('square');
  const [slideCount,   setSlideCount]   = useState(5);
  const [tone,         setTone]         = useState<Tone>('Informativo');
  const [funnel,       setFunnel]       = useState<Funnel>('Awareness');
  const [selectedTpl,  setSelectedTpl]  = useState('minimal-dark');
  const [visMode,      setVisMode]      = useState<VisMod>('dark');
  const [topic,        setTopic]        = useState('');
  const [postTitle,    setPostTitle]    = useState('');
  const [selectedSourceUrl, setSelectedSourceUrl] = useState<string | undefined>();
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [clonedDna, setClonedDna] = useState<{ id: string; html: string; name: string; brand_dna?: any } | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStep,      setGenStep]      = useState('');
  const [generated,    setGenerated]    = useState<GeneratedContent | null>(null);
  const [slides,       setSlides]       = useState<string[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  // RSS state
  const [isFetchingRss, setIsFetchingRss] = useState(false);
  const [rssTopics,    setRssTopics]    = useState<RssTopic[]>([]);
  const [showRssPanel, setShowRssPanel] = useState(false);

  // BG image state
  const [bgImageUrl,   setBgImageUrl]   = useState<string | undefined>();
  const [isGenImg,     setIsGenImg]     = useState(false);
  const [isSavingLibrary, setIsSavingLibrary] = useState(false);

  // Caption / hashtag
  const [caption,      setCaption]      = useState('');
  const [hashtags,     setHashtags]     = useState<string[]>([]);

  const { width, height } = getArtboardDimensions(format);

  // Render slides from generated content
  const renderSlides = useCallback((content: GeneratedContent, bgUrl?: string, templateId = selectedTpl, customDna = clonedDna) => {
    const renderSlideData = (data: SlideData) => {
      // 1. Dna Clone dynamic renderer
      if (templateId === 'dna-clone' && customDna) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(customDna.html, 'text/html');

        // Inject brand kit as CSS variables
        const styleEl = doc.createElement('style');
        styleEl.innerHTML = `
          :root {
            --color-primary: ${brand.color_primary};
            --color-secondary: ${brand.color_secondary};
            --color-accent: ${brand.color_accent};
            --color-bg: ${brand.color_bg_dark};
            --color-text: ${brand.color_text_dark};
            --font-headline: '${brand.font_headline}', sans-serif;
            --font-body: '${brand.font_body}', sans-serif;
            --radius: ${customDna?.brand_dna?.radius || '12px'};
            --shadow: ${customDna?.brand_dna?.shadow || '0 8px 32px rgba(0,0,0,0.1)'};
          }
        `;
        doc.head.appendChild(styleEl);

        // Fill generic fields defined in the prompt
        const h = doc.querySelector('[data-postgen-field="headline"]');
        if (h) h.innerHTML = data.headline;
        
        const b = doc.querySelector('[data-postgen-field="body"]');
        if (b) b.innerHTML = (data.body || '').replace(/\n/g, '<br>');
        
        const c = doc.querySelector('[data-postgen-field="cta"]');
        if (c) {
          if (data.cta) { c.innerHTML = data.cta; } else { c.remove(); }
        }

        // Try to place the bg image on the generic .artboard wrapper
        if (data.bgImageUrl) {
          const art = doc.querySelector('.artboard') as HTMLElement;
          if (art) {
            art.style.backgroundImage = `linear-gradient(rgba(0,0,0,${data.bgOpacity || 0.4}), rgba(0,0,0,${data.bgOpacity || 0.4})), url('${data.bgImageUrl}')`;
            art.style.backgroundSize = 'cover';
            art.style.backgroundPosition = 'center';
          }
        }
        return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
      }
      
      // 2. Standard template renderer
      const tpl = getTemplate(templateId);
      if (!tpl) return '';
      return tpl.renderer(data, brand);
    };

    const rendered = content.slides.map(s => {
      const slideData: SlideData = {
        headline:    s.headline,
        body:        s.body,
        cta:         s.cta,
        bgImageUrl:  bgUrl,
        bgOpacity:   0.40,
        slideNumber: s.index + 1,
        totalSlides: content.slides.length,
        format,
      };
      return renderSlideData(slideData);
    });
    setSlides(rendered);
    setCurrentSlide(0);
  }, [selectedTpl, clonedDna, brand, format]);

  useEffect(() => {
    const state = location.state as { post?: EditablePost; dnaTemplate?: { id: string; html_template: string; source_name: string | null } } | null;
    
    // Load incoming DNA cloned template
    if (state?.dnaTemplate) {
      if (state.dnaTemplate.id !== clonedDna?.id) {
        setClonedDna({
          id: state.dnaTemplate.id,
          html: state.dnaTemplate.html_template,
          name: state.dnaTemplate.source_name || 'Template Clonado',
          brand_dna: (state.dnaTemplate as any).brand_dna,
        });
        setSelectedTpl('dna-clone');
        // Clean history so we don't trigger again on refresh
        window.history.replaceState({}, document.title);
      }
      return;
    }

    // Load post to edit
    const post = state?.post;
    if (!post || hydratedPostIdRef.current === post.id) return;

    hydratedPostIdRef.current = post.id;
    setEditingPostId(post.id);
    setPostTitle(post.title || '');
    setTopic(post.source_topic || '');
    setSelectedSourceUrl(post.source_url || undefined);
    setCaption(post.caption || '');
    setHashtags((post.hashtags || '').split(/\s+/).filter(tag => tag.startsWith('#')));
    setSelectedTpl(post.template_id || 'minimal-dark');
    setVisMode((post.visual_mode as VisMod) || 'dark');
    setFormat(getArtboardFormatFromStoredPost(post));
    setSlideCount(post.slides_count || 1);
    setBgImageUrl(post.image_urls?.[0] || post.generation_meta?.bg_image_url || undefined);
    setSlides(post.slides_html || []);
    setCurrentSlide(0);
    setGenerated(post.generation_meta?.generated_content
      ? applySlideHtmlToContent(post.generation_meta.generated_content, post.slides_html || [])
      : null);
    toast.success('Post carregado para edição');
  }, [location.state, clonedDna?.id]);

  // Generate content
  const handleGenerate = async () => {
    if (!topic.trim() && !generated) {
      toast.error('Descreva o tópico primeiro');
      return;
    }
    setIsGenerating(true);
    setGenStep('📋 Analisando briefing...');
    try {
      await new Promise(r => setTimeout(r, 600));
      setGenStep('🤖 Consultando IA...');

      const { data, error } = await supabase.functions.invoke<GeneratedContent>('generate-post-content', {
        body: {
          workspace_id: workspace?.id,
          topic: topic.trim(),
          funnel_type: funnel,
          tone,
          format,
          slides_count: format === 'square' ? slideCount : 1,
          source_url: selectedSourceUrl,
        },
      });

      if (error) throw error;
      if (!data) throw new Error('Resposta vazia da funcao');

      setGenStep('✅ Aplicando template...');
      setGenerated(data);
      setPostTitle(data.post_title || topic.trim());
      setCaption(data.caption || '');
      setHashtags((data.hashtags || '').split(/[\s,]+/).filter((h: string) => h.startsWith('#')));
      renderSlides(data, bgImageUrl);
      await new Promise(r => setTimeout(r, 400));
    } catch (error: unknown) {
      // Fallback: demo render with the topic text directly
      const demoContent: GeneratedContent = {
        post_title: topic,
        slides: Array.from({ length: format === 'square' ? slideCount : 1 }, (_, i) => ({
          index: i, type: i === 0 ? 'hook' : 'content',
          headline: i === 0 ? topic.slice(0, 40) : `Ponto ${i}: ${topic.slice(0, 25)}`,
          body: i === 0
            ? 'Configure suas chaves de IA em Configurações para gerar textos completos.'
            : 'Cada slide terá um conteúdo diferente após configurar as chaves de API.',
          cta: i === (slideCount - 1) ? 'Siga para mais →' : undefined,
        })),
        caption: `${topic}\n\nComente sua opinião abaixo!`,
        hashtags: '#ia #marketing #socialmedia #conteudo #postgen',
        bg_prompt_hint: topic,
      };
      setGenerated(demoContent);
      setPostTitle(demoContent.post_title || topic.trim());
      setCaption(demoContent.caption);
      setHashtags(demoContent.hashtags.split(' '));
      renderSlides(demoContent, bgImageUrl);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Failed to send')) {
        toast.warning('Usando modo demo — configure chaves de API em Configurações');
      } else {
        toast.warning('Modo demo ativo: ' + (errorMessage || 'Erro na IA'));
      }
    } finally {
      setIsGenerating(false);
      setGenStep('');
    }
  };

  // Re-render when template changes
  const handleTemplateChange = (id: string) => {
    setSelectedTpl(id);
    if (generated) {
      renderSlides(generated, bgImageUrl, id);
    }
  };

  // Fetch RSS topics
  const handleFetchRss = async () => {
    setIsFetchingRss(true);
    setShowRssPanel(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-rss-topics', {
        body: { workspace_id: workspace?.id, funnel_type: funnel, tone },
      });
      if (error) throw error;
      setRssTopics(data?.topics || []);
    } catch {
      toast.error('Erro ao buscar feeds RSS. Configure feeds em Configurações.');
      setRssTopics([]);
    } finally {
      setIsFetchingRss(false);
    }
  };

  const handleUploadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        toast.error('Formato de imagem invalido');
        return;
      }
      setBgImageUrl(reader.result);
      if (generated) renderSlides(generated, reader.result);
      toast.success('Imagem de fundo atualizada');
    };
    reader.onerror = () => toast.error('Nao foi possivel carregar a imagem');
    reader.readAsDataURL(file);
  };

  const handleSaveToLibrary = async () => {
    if (!workspace?.id || !slides.length) {
      toast.error('Gere ou carregue um post antes de salvar');
      return;
    }

    setIsSavingLibrary(true);
    try {
      const payload = {
        workspace_id: workspace.id,
        title: postTitle || topic.trim() || 'Post sem titulo',
        format: getPersistedPostFormat(format, slides.length),
        slides_html: slides,
        slides_count: slides.length,
        caption,
        hashtags: hashtags.join(' '),
        template_id: selectedTpl,
        visual_mode: visMode,
        funnel_type: funnel,
        source_topic: topic.trim() || null,
        source_url: selectedSourceUrl || null,
        generation_meta: {
          artboard_format: format,
          bg_image_url: bgImageUrl || null,
          generated_content: generated,
        },
        status: 'ready',
      };

      const saveQuery = editingPostId
        // @ts-expect-error generation_meta JSON type mismatch
        ? supabase.from('posts_v2').update(payload).eq('id', editingPostId).select().single()
        // @ts-expect-error generation_meta JSON type mismatch
        : supabase.from('posts_v2').insert(payload).select().single();

      const { data: savedPost, error } = await saveQuery;
      if (error || !savedPost) throw error || new Error('Falha ao salvar o post');

      const uploadedUrls: string[] = [];
      for (let index = 0; index < slides.length; index += 1) {
        try {
          const blob = await exportSlide(slides[index], `slide-${index + 1}`, width, height);
          const uploadedUrl = await uploadSlideToStorage(blob, workspace.id, savedPost.id, index + 1, supabase);
          if (uploadedUrl) uploadedUrls.push(uploadedUrl);
        } catch (uploadError) {
          console.error('Slide upload failed', uploadError);
        }
      }

      if (uploadedUrls.length > 0) {
        await supabase.from('posts_v2').update({ image_urls: uploadedUrls }).eq('id', savedPost.id);
      }

      setEditingPostId(savedPost.id);
      if (uploadedUrls.length === slides.length) {
        toast.success(editingPostId ? 'Post atualizado na biblioteca!' : 'Post salvo na biblioteca!');
      } else if (uploadedUrls.length > 0) {
        toast.success('Post salvo, mas algumas imagens nao foram enviadas');
      } else {
        toast.warning('Post salvo sem imagens no storage. Verifique o bucket "postgen".');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar na biblioteca');
    } finally {
      setIsSavingLibrary(false);
    }
  };

  // Download
  const handleDownloadCurrent = async () => {
    if (!slides[currentSlide]) { toast.error('Gere um post primeiro'); return; }
    toast.info('Exportando...');
    const blob = await exportSlide(slides[currentSlide], `slide-${currentSlide + 1}`, width, height);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${postTitle || generated?.post_title || 'post'}_slide_${currentSlide + 1}.png`;
    a.click();
  };

  const handleDownloadAll = async () => {
    if (!slides.length) { toast.error('Gere um post primeiro'); return; }
    await exportAllSlides(slides, postTitle || generated?.post_title || 'post', width, height);
  };

  const removeHashtag = (tag: string) => setHashtags(prev => prev.filter(h => h !== tag));

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={event => {
          const file = event.target.files?.[0];
          if (file) handleUploadImage(file);
          event.target.value = '';
        }}
      />

      {/* ─── LEFT PANEL ─── */}
      <div className="panel-left" style={{ width: 300, minWidth: 300 }}>

        {/* Format */}
        <div className="panel-section">
          <p className="panel-section-title">Formato</p>
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {FORMAT_OPTIONS.map(([fmt, dim]) => (
              <button key={fmt} onClick={() => setFormat(fmt)} className={`format-btn ${format === fmt ? 'active' : ''}`}>
                <span className="text-xs">{dim.label}</span>
                <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{dim.aspectLabel}</span>
              </button>
            ))}
          </div>
          {format === 'square' && (
            <div>
              <p className="text-xs mb-1.5" style={{ color: 'var(--text-3)' }}>Slides no carrossel</p>
              <div className="flex gap-1.5">
                {[1, 3, 5, 7, 8].map(n => (
                  <button key={n} onClick={() => setSlideCount(n)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: slideCount === n ? 'var(--primary-muted)' : 'var(--bg-card)',
                      border: `1px solid ${slideCount === n ? 'var(--primary)' : 'var(--border)'}`,
                      color: slideCount === n ? 'var(--primary)' : 'var(--text-2)',
                    }}
                  >{n}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tone */}
        <div className="panel-section">
          <p className="panel-section-title">Tom</p>
          <div className="flex flex-wrap gap-1.5">
            {TONES.map(t => (
              <button key={t} onClick={() => setTone(t)} className={`chip ${tone === t ? 'active' : ''}`}>{t}</button>
            ))}
          </div>
        </div>

        {/* Funnel */}
        <div className="panel-section">
          <p className="panel-section-title">Objetivo</p>
          <div className="flex flex-wrap gap-1.5">
            {FUNNELS.map(f => (
              <button key={f} onClick={() => setFunnel(f)} className={`chip ${funnel === f ? 'active' : ''}`}>{f}</button>
            ))}
          </div>
        </div>

        {/* Topic */}
        <div className="panel-section">
          <p className="panel-section-title">Tópico</p>

          {/* RSS button */}
          <button
            onClick={handleFetchRss}
            disabled={isFetchingRss}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium mb-3 transition-all"
            style={{ border: '1px solid var(--primary)', color: 'var(--primary)', background: 'var(--primary-muted)' }}
          >
            {isFetchingRss ? (
              <><RefreshCw size={14} className="animate-spin" /> Buscando feeds...</>
            ) : (
              <><Search size={14} /> Buscar Tendências + RSS</>
            )}
          </button>

          {/* RSS Topics panel */}
          {showRssPanel && (
            <div className="mb-3 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>
                  {rssTopics.length ? `${rssTopics.length} artigos encontrados` : 'Nenhum feed configurado'}
                </span>
                <button onClick={() => setShowRssPanel(false)}><X size={14} style={{ color: 'var(--text-3)' }} /></button>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {rssTopics.length === 0 && !isFetchingRss && (
                  <p className="p-3 text-xs" style={{ color: 'var(--text-3)' }}>Adicione feeds RSS em Configurações →</p>
                )}
                {rssTopics.map((t, i) => (
                  <button key={i} onClick={() => { setTopic(t.title); setSelectedSourceUrl(t.url || undefined); setShowRssPanel(false); }}
                    className="w-full text-left px-3 py-2.5 text-xs hover:bg-white/5 transition-colors"
                    style={{ borderBottom: i < rssTopics.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                        style={{
                          background: t.source_type === 'ai' ? '#7C3AED20' : '#0EA5E920',
                          color: t.source_type === 'ai' ? '#A78BFA' : '#0EA5E9',
                        }}
                      >
                        {t.source_type === 'ai' ? 'IA' : 'RSS'}
                      </span>
                      <span style={{ color: 'var(--text-3)', fontSize: 10 }}>{t.source_name}</span>
                    </div>
                    <p className="font-medium leading-tight" style={{ color: 'var(--text-1)' }}>{t.title}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="relative mb-1">
            <span className="absolute left-0 right-0 text-center text-xs" style={{ color: 'var(--text-3)', top: -8 }}>— ou digite —</span>
          </div>
          <textarea
            value={topic}
            onChange={e => {
              setTopic(e.target.value);
              setSelectedSourceUrl(undefined);
            }}
            onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') handleGenerate(); }}
            placeholder="Sobre o que você quer falar? ↵ Ctrl+Enter para gerar"
            rows={3}
            className="w-full px-3 py-3 rounded-xl text-sm resize-none outline-none transition-colors mb-3"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-1)',
              lineHeight: 1.6,
            }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-60"
            style={{
              background: 'var(--primary)',
              color: 'white',
              boxShadow: isGenerating ? 'none' : '0 8px 24px rgba(124,58,237,0.3)',
            }}
          >
            {isGenerating ? (
              <><RefreshCw size={15} className="animate-spin" /><span className="step-active">{genStep}</span></>
            ) : (
              <><Wand2 size={15} /> Gerar Conteúdo</>
            )}
          </button>
        </div>

        {/* BG Image (only after generation) */}
        {generated && (
          <div className="panel-section">
            <p className="panel-section-title">Imagem de Fundo</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-all"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                <Upload size={14} /> Upload
              </button>
              <button
                disabled={isGenImg}
                onClick={async () => {
                  setIsGenImg(true);
                  try {
                    const { data, error } = await supabase.functions.invoke<GeneratedImageResponse>('generate-background-image', {
                      body: {
                        workspace_id: workspace?.id,
                        prompt: generated.bg_prompt_hint,
                        visual_mode: visMode,
                        format,
                      },
                    });
                    if (error) throw error;
                    if (!data?.imageUrl) throw new Error(data?.error || 'Imagem nao retornada');
                    setBgImageUrl(data.imageUrl);
                    renderSlides(generated, data.imageUrl);
                  } catch (error) {
                    const message = error instanceof Error ? error.message : 'Erro ao gerar imagem';
                    toast.error(message);
                  }
                  finally { setIsGenImg(false); }
                }}
                className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-all disabled:opacity-60"
                style={{ background: 'var(--primary-muted)', border: '1px solid var(--primary)', color: 'var(--primary)' }}
              >
                {isGenImg ? <RefreshCw size={14} className="animate-spin" /> : '✨'}
                {isGenImg ? 'Gerando...' : 'Gerar IA'}
              </button>
            </div>
            {bgImageUrl && (
              <div className="relative rounded-lg overflow-hidden" style={{ height: 60, background: 'var(--bg-card)' }}>
                <img src={bgImageUrl} alt="bg" className="w-full h-full object-cover" />
                <button onClick={() => { setBgImageUrl(undefined); if (generated) renderSlides(generated, undefined); }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.7)', color: 'white' }}>
                  <X size={10} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── CANVAS CENTER ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2.5 shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>
              {postTitle || generated?.post_title || 'Novo Post'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-3)' }}>
            {width}×{height}px
          </div>
        </div>

        {/* Artboard */}
        <ArtboardStage format={format} className="flex-1">
          {slides[currentSlide] ? (
            <SlideFrame
              slideHtml={slides[currentSlide]}
              width={width}
              height={height}
              editable
              onHtmlChange={nextHtml => {
                setSlides(currentSlides => currentSlides.map((slide, index) => (
                  index === currentSlide ? nextHtml : slide
                )));
                setGenerated(currentGenerated => {
                  if (!currentGenerated) return currentGenerated;
                  const editableFields = extractSlideFields(nextHtml);
                  return {
                    ...currentGenerated,
                    slides: currentGenerated.slides.map((slide, index) => (
                      index === currentSlide
                        ? {
                            ...slide,
                            headline: editableFields.headline || slide.headline,
                            body: editableFields.body || slide.body,
                            cta: editableFields.cta ?? slide.cta,
                          }
                        : slide
                    )),
                  };
                });
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4"
              style={{ background: 'var(--bg-card)' }}>
              <div className="text-4xl opacity-20" style={{ color: 'var(--primary)' }}>✦</div>
              <p className="text-sm text-center max-w-xs" style={{ color: 'var(--text-3)' }}>
                Configure o formato e o tópico, depois clique em<br />
                <strong style={{ color: 'var(--primary)' }}>Gerar Conteúdo</strong>
              </p>
            </div>
          )}
        </ArtboardStage>

        {/* Carousel nav */}
        {slides.length > 1 && (
          <div className="flex items-center justify-center gap-3 py-3 shrink-0"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <button onClick={() => setCurrentSlide(s => Math.max(0, s - 1))}
              disabled={currentSlide === 0}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
              <ChevronLeft size={16} />
            </button>
            <div className="flex gap-1.5">
              {slides.map((_, i) => (
                <button key={i} onClick={() => setCurrentSlide(i)}
                  className="rounded-full transition-all"
                  style={{
                    width: i === currentSlide ? 20 : 7,
                    height: 7,
                    background: i === currentSlide ? 'var(--primary)' : 'var(--border-strong)',
                  }} />
              ))}
            </div>
            <button onClick={() => setCurrentSlide(s => Math.min(slides.length - 1, s + 1))}
              disabled={currentSlide === slides.length - 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ─── RIGHT PANEL ─── */}
      <div className="panel-right" style={{ width: 264 }}>

        {/* Visual Mode */}
        <div className="panel-section">
          <p className="panel-section-title">Modo Visual</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {VIS_MODES.map(vm => (
              <button key={vm.id} onClick={() => setVisMode(vm.id)}
                className={`chip text-xs ${visMode === vm.id ? 'active' : ''}`}>{vm.label}</button>
            ))}
          </div>

          {/* Template grid */}
          <p className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>Template</p>
          <div className="grid grid-cols-2 gap-2">
            {clonedDna && (
              <button
                onClick={() => handleTemplateChange('dna-clone')}
                title={clonedDna.name}
                className={`template-thumbnail ${selectedTpl === 'dna-clone' ? 'active' : ''}`}
                style={{ height: 64, border: selectedTpl === 'dna-clone' ? '2px solid var(--primary)' : '2px dashed var(--border)' }}
              >
                <div className="w-full h-full flex flex-col items-center justify-center p-2" style={{ background: 'var(--bg-card)' }}>
                  <span className="text-[9px] font-bold text-center leading-tight mb-1" style={{ color: 'var(--text-1)' }}>
                    ✨ DNA CLONADO
                  </span>
                  <span className="text-[8px] truncate tracking-wide w-full text-center" style={{ color: 'var(--primary)' }}>
                    {clonedDna.name.toUpperCase()}
                  </span>
                </div>
              </button>
            )}
            {TEMPLATE_REGISTRY.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => handleTemplateChange(tpl.id)}
                title={tpl.name}
                className={`template-thumbnail ${selectedTpl === tpl.id ? 'active' : ''}`}
                style={{ height: 64 }}
              >
                <div
                  className="w-full h-full flex items-end pb-1.5 px-1.5"
                  style={{ background: tpl.previewGradient }}
                >
                  <span className="text-[10px] font-semibold truncate w-full text-left"
                    style={{ color: tpl.previewAccent, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                    {tpl.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Mini slides */}
        {slides.length > 1 && (
          <div className="panel-section">
            <p className="panel-section-title">Slides ({slides.length})</p>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
              {slides.map((html, i) => {
                // Scale the full artboard down to fit the 60px tall thumbnail
                const thumbHeight = 60;
                const thumbWidth = Math.round((width / height) * thumbHeight);
                const thumbScale = thumbHeight / height;
                return (
                  <button key={i} onClick={() => setCurrentSlide(i)}
                    className="relative rounded-lg overflow-hidden shrink-0 transition-all"
                    style={{
                      height: thumbHeight,
                      width: thumbWidth,
                      border: `2px solid ${i === currentSlide ? 'var(--primary)' : 'var(--border)'}`,
                      alignSelf: 'stretch',
                    }}>
                    {/* Scaled-down iframe — acts like a static image thumbnail */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width,
                      height,
                      transform: `scale(${thumbScale})`,
                      transformOrigin: 'top left',
                      pointerEvents: 'none',
                    }}>
                      <SlideFrame slideHtml={html} width={width} height={height} />
                    </div>
                    <span className="absolute top-1 left-1 text-[9px] font-bold px-1 py-0.5 rounded"
                      style={{ background: i === currentSlide ? 'var(--primary)' : 'rgba(0,0,0,0.5)', color: 'white' }}>
                      {i + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}


        {/* Caption */}
        {generated && (
          <div className="panel-section">
            <p className="panel-section-title">Legenda</p>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              rows={5}
              className="w-full px-3 py-2.5 rounded-xl text-xs resize-none outline-none mb-2"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-1)', lineHeight: 1.6 }}
            />
            <button onClick={() => { navigator.clipboard.writeText(caption); toast.success('Legenda copiada!'); }}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium mb-3 transition-all"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
              <Copy size={12} /> Copiar Legenda
            </button>
            <div className="flex flex-wrap gap-1">
              {hashtags.slice(0, 12).map(tag => (
                <button key={tag} onClick={() => removeHashtag(tag)}
                  className="text-[10px] px-1.5 py-0.5 rounded-full transition-all hover:opacity-60"
                  style={{ background: 'var(--primary-muted)', color: 'var(--primary)', border: '1px solid var(--border)' }}>
                  {tag} ×
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Download */}
        <div className="panel-section">
          <p className="panel-section-title">Exportar</p>
          <div className="space-y-2">
            <button onClick={handleDownloadCurrent}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'var(--primary)', color: 'white', boxShadow: '0 4px 16px rgba(124,58,237,0.25)' }}>
              <Download size={14} /> Baixar PNG
            </button>
            {slides.length > 1 && (
              <button onClick={handleDownloadAll}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                <Download size={14} /> Baixar Todos (.zip)
              </button>
            )}
            <button
              onClick={handleSaveToLibrary}
              disabled={isSavingLibrary}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-60"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
            >
              {isSavingLibrary ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              {isSavingLibrary ? 'Salvando...' : editingPostId ? 'Atualizar Biblioteca' : 'Salvar na Biblioteca'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneratorPage;
