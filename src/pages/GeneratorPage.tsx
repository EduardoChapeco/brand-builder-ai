import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Wand2, Search, Upload, RefreshCw, Download, Copy, ChevronLeft, ChevronRight, X, Save, Trash, AlignLeft, AlignCenter, AlignRight, FileImage, LayoutTemplate, Type, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import ArtboardStage from '@/components/canvas/ArtboardStage';
import SlideFrame from '@/components/canvas/SlideFrame';
import {
  ArtboardDimension, ArtboardFormat, BrandKit, DEFAULT_BRAND_KIT, SlideData,
  ARTBOARD_DIMENSIONS, getArtboardDimensions, SlideConfig, createSlideConfig, BgSource, VisMod
} from '@/lib/canvasEngine';
import { TEMPLATE_REGISTRY, getTemplate } from '@/lib/templateRegistry';
import { exportSlide, exportAllSlides, uploadSlideToStorage, exportSlidesPDF, exportSlidesHTML } from '@/lib/exportPost';

type Tone    = 'Casual' | 'Sério' | 'Informativo' | 'Humor' | 'Urgente';
type Funnel  = 'Awareness' | 'Educativo' | 'Captar Leads' | 'Vendas' | 'Engajamento';

interface GeneratedSlide {
  index:    number;
  type:     string;
  headline: string;
  body:     string;
  cta?:     string;
  bg_prompt_hint?: string;
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
  slide_configs?: SlideConfig[];
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

const GeneratorPage = () => {
  const location = useLocation();
  const { workspace, brandKit: wsBrandKit } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hydratedPostIdRef = useRef<string | null>(null);
  const brand: BrandKit = useMemo(() => (
    wsBrandKit ? { ...DEFAULT_BRAND_KIT, ...wsBrandKit } : DEFAULT_BRAND_KIT
  ), [wsBrandKit]);

  // General Post State
  const [topic, setTopic] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [format, setFormat] = useState<ArtboardFormat>('square');
  const [bgPromptHint, setBgPromptHint] = useState('');
  const [selectedSourceUrl, setSelectedSourceUrl] = useState<string | undefined>();
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [clonedDna, setClonedDna] = useState<{ id: string; html: string; name: string; brand_dna?: Record<string, unknown> } | null>(null);

  // Wizard / Config State
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [slideCount, setSlideCount] = useState(5);
  const [tone, setTone] = useState<Tone>('Informativo');
  const [funnel, setFunnel] = useState<Funnel>('Awareness');
  const [globalImageMethod, setGlobalImageMethod] = useState<BgSource>('ai');
  const [globalVisMode, setGlobalVisMode] = useState<VisMod>('dark');
  const [globalTemplate, setGlobalTemplate] = useState('minimal-dark');

  // Generation Loading State
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStep, setGenStep] = useState('');

  // Slides State (Core)
  const [slideConfigs, setSlideConfigs] = useState<SlideConfig[]>([]);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);

  // Inspector State
  interface SelectedNode { nodeId: string; tag: string; text: string; styles: Record<string, string>; }
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);

  // RSS state
  const [isFetchingRss, setIsFetchingRss] = useState(false);
  const [rssTopics, setRssTopics] = useState<RssTopic[]>([]);
  const [showRssPanel, setShowRssPanel] = useState(false);

  // Editor Tabs
  const [activeTab, setActiveTab] = useState<'visual' | 'media' | 'text' | 'export'>('visual');

  // Misc
  const [isSavingLibrary, setIsSavingLibrary] = useState(false);
  const [isGenImg, setIsGenImg] = useState(false);

  const { width, height } = getArtboardDimensions(format);

  // Render slides from config
  const renderSlideConfig = useCallback((cfg: SlideConfig, index: number, total: number) => {
    const slideData: SlideData = {
      headline: cfg.headline,
      body: cfg.body,
      cta: cfg.cta,
      bgImageUrl: cfg.bgImageUrl,
      bgOpacity: 0.40,
      slideNumber: index + 1,
      totalSlides: total,
      format,
    };

    if (cfg.templateId === 'dna-clone' && clonedDna) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(clonedDna.html, 'text/html');
      const styleEl = doc.createElement('style');
      styleEl.innerHTML = `
        :root {
          --color-primary: ${brand.color_primary};
          --color-secondary: ${brand.color_secondary};
          --color-accent: ${brand.color_accent};
          --color-bg: ${cfg.visualMode === 'dark' || cfg.visualMode === 'bold' ? brand.color_bg_dark : brand.color_bg_light};
          --color-text: ${cfg.visualMode === 'dark' || cfg.visualMode === 'bold' ? brand.color_text_dark : brand.color_text_light};
          --font-headline: '${brand.font_headline}', sans-serif;
          --font-body: '${brand.font_body}', sans-serif;
          --radius: ${clonedDna?.brand_dna?.radius || '12px'};
          --shadow: ${clonedDna?.brand_dna?.shadow || '0 8px 32px rgba(0,0,0,0.1)'};
        }
      `;
      doc.head.appendChild(styleEl);

      const h = doc.querySelector('[data-postgen-field="headline"]');
      if (h) h.innerHTML = slideData.headline;
      
      const b = doc.querySelector('[data-postgen-field="body"]');
      if (b) b.innerHTML = (slideData.body || '').replace(/\n/g, '<br>');
      
      const c = doc.querySelector('[data-postgen-field="cta"]');
      if (c) {
        if (slideData.cta) { c.innerHTML = slideData.cta; } else { c.remove(); }
      }

      if (slideData.bgImageUrl) {
        const art = doc.querySelector('.artboard') as HTMLElement;
        if (art) {
          art.style.backgroundImage = `linear-gradient(rgba(0,0,0,${slideData.bgOpacity || 0.4}), rgba(0,0,0,${slideData.bgOpacity || 0.4})), url('${slideData.bgImageUrl}')`;
          art.style.backgroundSize = 'cover';
          art.style.backgroundPosition = 'center';
        }
      }
      return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
    }
    
    // Standard template
    const tpl = getTemplate(cfg.templateId);
    if (!tpl) return '';
    return tpl.renderer(slideData, brand);
  }, [brand, format, clonedDna]);

  // Update a single slide configuration
  const updateSlideConfig = useCallback((index: number, updates: Partial<SlideConfig>) => {
    setSlideConfigs(prev => {
      const next = [...prev];
      const updated = { ...next[index], ...updates };
      updated.html = renderSlideConfig(updated, index, next.length);
      next[index] = updated;
      return next;
    });
  }, [renderSlideConfig]);

  // Hydration Effect
  useEffect(() => {
    const state = location.state as { post?: EditablePost; dnaTemplate?: { id: string; html_template: string; source_name: string | null; brand_dna?: Record<string, unknown> } } | null;
    
    if (state?.dnaTemplate) {
      if (state.dnaTemplate.id !== clonedDna?.id) {
        setClonedDna({
          id: state.dnaTemplate.id,
          html: state.dnaTemplate.html_template,
          name: state.dnaTemplate.source_name || 'Template Clonado',
          brand_dna: state.dnaTemplate.brand_dna,
        });
        setGlobalTemplate('dna-clone');
        window.history.replaceState({}, document.title);
      }
      return;
    }

    const post = state?.post;
    if (!post || hydratedPostIdRef.current === post.id) return;

    hydratedPostIdRef.current = post.id;
    setEditingPostId(post.id);
    setPostTitle(post.title || '');
    setTopic(post.source_topic || '');
    setSelectedSourceUrl(post.source_url || undefined);
    setCaption(post.caption || '');
    setHashtags((post.hashtags || '').split(/\s+/).filter(tag => tag.startsWith('#')));
    
    // Hydrating configs vs fallback old approach
    if (post.generation_meta?.slide_configs) {
      setSlideConfigs(post.generation_meta.slide_configs.map(cfg => ({...cfg, html: renderSlideConfig(cfg, slideConfigs.indexOf(cfg), post.generation_meta!.slide_configs!.length)})));
      setActiveSlideIdx(0);
    } else {
      // Legacy hydration
      const configs = (post.slides_html || []).map((html, i) => {
        const fields = extractSlideFields(html);
        const cfg = createSlideConfig({
          templateId: post.template_id || 'minimal-dark',
          bgImageUrl: post.image_urls?.[i] || post.generation_meta?.bg_image_url || undefined,
          bgSource: post.image_urls?.[i] ? 'upload' : 'none',
          visualMode: (post.visual_mode as VisMod) || 'dark',
          headline: fields.headline || '',
          body: fields.body || '',
          cta: fields.cta || ''
        });
        cfg.html = html; // keep the raw html initially
        return cfg;
      });
      setSlideConfigs(configs);
      setActiveSlideIdx(0);
    }
    
    toast.success('Post carregado para edição');
  }, [location.state, clonedDna?.id, renderSlideConfig]);

  // Inspector Selection Events
  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      if (e.data?.type === 'POSTGEN_NODE_SELECT') {
        setSelectedNode(e.data);
      } else if (e.data?.type === 'POSTGEN_NODE_DESELECT') {
        setSelectedNode(null);
      }
    };
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, []);

  const handleStyleUpdate = (updates: Record<string, string>) => {
    if (!selectedNode) return;
    setSelectedNode(prev => prev ? { ...prev, styles: { ...prev.styles, ...updates } } : null);
    
    const iframes = document.querySelectorAll('iframe[title="slide-preview"]');
    iframes.forEach(iframe => {
       const cw = (iframe as HTMLIFrameElement).contentWindow;
       if (cw) {
          cw.postMessage({
             type: 'POSTGEN_INSPECTOR_UPDATE',
             nodeId: selectedNode.nodeId,
             updates
          }, '*');
       }
    });
  };

  // Generate Flow
  const handleGenerate = async () => {
    if (!topic.trim()) { toast.error('Descreva o tópico primeiro'); return; }
    setIsGenerating(true);
    setWizardStep(3);
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
          slides_count: slideCount,
          source_url: selectedSourceUrl,
        },
      });

      if (error) throw error;
      if (!data) throw new Error('Resposta vazia da funcao');

      setGenStep('✅ Processando slides...');
      setBgPromptHint(data.slides?.[0]?.bg_prompt_hint || data.bg_prompt_hint || topic);
      setPostTitle(data.post_title || topic);
      setCaption(data.caption || '');
      setHashtags((data.hashtags || '').split(/[\s,]+/).filter((h: string) => h.startsWith('#')));

      let configs: SlideConfig[] = data.slides.map((s, idx) => createSlideConfig({
        templateId: globalTemplate,
        bgSource: globalImageMethod,
        visualMode: globalVisMode,
        headline: s.headline,
        body: s.body,
        cta: s.cta,
        bgPromptHint: s.bg_prompt_hint || data.bg_prompt_hint || `${topic} slide ${idx+1}`
      }));

      // Generate Background if selected AI method globally
      if (globalImageMethod === 'ai' && !editingPostId) {
        setGenStep('✨ Multi-Agente Visualizando (Imagens)...');
        for (let i = 0; i < configs.length; i++) {
          setGenStep(`🖌️ Desenhando slide ${i + 1}/${configs.length}...`);
          try {
            const { data: imgData } = await supabase.functions.invoke('generate-background-image', {
              body: { 
                workspace_id: workspace?.id, 
                prompt: configs[i].bgPromptHint || topic, 
                visual_mode: globalVisMode, 
                format 
              }
            });
            if (imgData?.imageUrl) {
              configs[i].bgImageUrl = imgData.imageUrl;
            }
          } catch(e) { console.error(`BG AI Failed desc for slide ${i}:`, e); }
        }
      }

      configs = configs.map((cfg, i) => ({ ...cfg, html: renderSlideConfig(cfg, i, configs.length) }));
      
      setSlideConfigs(configs);
      setActiveSlideIdx(0);
      
      await new Promise(r => setTimeout(r, 400));
    } catch (e: any) {
      toast.warning('Erro (Modo Demo Ativo): ' + (e.message || 'Erro na IA'));
      
      const configs = Array.from({length: slideCount}).map((_, i) => createSlideConfig({
         templateId: globalTemplate,
         headline: i === 0 ? topic.slice(0, 40) : `Ponto ${i}: ${topic.slice(0, 25)}`,
         body: i === 0 ? 'Configure suas chaves de IA em Configurações para gerar textos compeltos.' : 'Cada slide terá um conteúdo diferente.',
         cta: i === (slideCount - 1) ? 'Siga para mais' : undefined,
         bgSource: globalImageMethod,
         bgPromptHint: `${topic} parte ${i+1}`
      }));
      const rendered = configs.map((c, i) => ({ ...c, html: renderSlideConfig(c, i, configs.length) }));
      setSlideConfigs(rendered);
      setCaption(`${topic}\n\nComente sua opinião!`);
      setActiveSlideIdx(0);
    } finally {
      setIsGenerating(false);
      setGenStep('');
      setWizardStep(4);
    }
  };

  const handleFetchRss = async () => {
    setIsFetchingRss(true);
    setShowRssPanel(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-rss-topics', {
        body: { workspace_id: workspace?.id, funnel_type: funnel, tone },
      });
      if (error) throw error;
      const fetchedTopics = data?.topics || [];
      if (fetchedTopics.length === 0 && data?.message) {
        toast.warning(data.message);
      } else if (fetchedTopics.length > 0) {
        toast.success(`Foram encontradas ${fetchedTopics.length} sugestões (Feeds + IA Scout).`);
      }
      setRssTopics(fetchedTopics);
    } catch (err: any) {
      toast.error('Erro ao buscar News: ' + err.message);
      setRssTopics([]);
    } finally {
      setIsFetchingRss(false);
    }
  };

  const handleBgGenForActiveSlide = async () => {
    const activeSlide = slideConfigs[activeSlideIdx];
    if (!activeSlide) return;
    setIsGenImg(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-background-image', {
        body: {
          workspace_id: workspace?.id,
          prompt: bgPromptHint || topic,
          visual_mode: activeSlide.visualMode,
          format,
        },
      });
      if (error) throw error;
      if (data?.imageUrl) updateSlideConfig(activeSlideIdx, { bgImageUrl: data.imageUrl, bgSource: 'ai' });
    } catch(e: any) { toast.error('Erro: ' + e.message); } 
    finally { setIsGenImg(false); }
  };

  const handleUploadBgActiveSlide = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
         updateSlideConfig(activeSlideIdx, { bgImageUrl: reader.result, bgSource: 'upload' });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveToLibrary = async () => {
    if (!workspace?.id || !slideConfigs.length) return;
    setIsSavingLibrary(true);
    try {
      const payload = {
        workspace_id: workspace.id,
        title: postTitle || topic.trim() || 'Post sem titulo',
        format: getPersistedPostFormat(format, slideConfigs.length),
        slides_html: slideConfigs.map(c => c.html || ''),
        slides_count: slideConfigs.length,
        caption,
        hashtags: hashtags.join(' '),
        template_id: 'mixed-configs',
        visual_mode: 'mixed',
        funnel_type: funnel,
        source_topic: topic.trim() || null,
        source_url: selectedSourceUrl || null,
        generation_meta: {
          artboard_format: format,
          slide_configs: slideConfigs,
        },
        status: 'ready',
      };

      const saveQuery = editingPostId
        // @ts-expect-error type
        ? supabase.from('posts_v2').update(payload).eq('id', editingPostId).select().single()
        // @ts-expect-error type
        : supabase.from('posts_v2').insert(payload).select().single();

      const { data: savedPost, error } = await saveQuery;
      if (error || !savedPost) throw error || new Error('Falha ao salvar');

      const uploadedUrls: string[] = [];
      for (let index = 0; index < slideConfigs.length; index += 1) {
        try {
          if (slideConfigs[index].html) {
             const blob = await exportSlide(slideConfigs[index].html!, `slide-${index + 1}`, width, height);
             const uploadedUrl = await uploadSlideToStorage(blob, workspace.id, savedPost.id, index + 1, supabase);
             if (uploadedUrl) uploadedUrls.push(uploadedUrl);
          }
        } catch (uploadError) { console.error('Slide upload failed', uploadError); }
      }

      if (uploadedUrls.length > 0) {
        await supabase.from('posts_v2').update({ image_urls: uploadedUrls }).eq('id', savedPost.id);
      }

      setEditingPostId(savedPost.id);
      toast.success(editingPostId ? 'Post atualizado!' : 'Post salvo!');
    } catch (error) { toast.error('Erro ao salvar.'); } 
    finally { setIsSavingLibrary(false); }
  };

  const removeHashtag = (tag: string) => setHashtags(prev => prev.filter(h => h !== tag));

  if (wizardStep < 4) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full w-full overflow-y-auto" style={{ background: 'var(--bg-app)' }}>
        <div className="max-w-xl w-full p-8 rounded-[2rem] relative" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
          <div className="flex items-center gap-3 mb-8">
            {[1, 2, 3].map(step => (
              <div key={step} className="flex-1 h-1.5 rounded-full transition-all duration-500" style={{ background: wizardStep >= step ? 'var(--primary)' : 'var(--bg-elevated)' }} />
            ))}
          </div>

          {wizardStep === 1 && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <h2 className="text-2xl font-display font-bold mb-2" style={{ color: 'var(--text-1)' }}>Sobre o que vamos falar hoje?</h2>
               <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>Escolha um assunto, ou selecione uma sugestao para a IA redigir.</p>

               <button onClick={handleFetchRss} disabled={isFetchingRss}
                 className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-medium mb-4 transition-all"
                 style={{ border: '1px solid var(--primary)', color: 'var(--primary)', background: 'var(--primary-muted)' }}>
                 {isFetchingRss ? <><RefreshCw size={16} className="animate-spin" /> Buscando Noticias...</> : <><Search size={16} /> Ver Tendências & RSS (IA Scout)</>}
               </button>

               {showRssPanel && (
                 <div className="mb-4 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                   <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                     <span className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>{rssTopics.length} sugestões</span>
                     <button onClick={() => setShowRssPanel(false)}><X size={16} style={{ color: 'var(--text-3)' }} /></button>
                   </div>
                   <div className="max-h-60 overflow-y-auto">
                     {rssTopics.map((t, i) => (
                       <button key={i} onClick={() => { setTopic(t.title); setSelectedSourceUrl(t.url || undefined); setShowRssPanel(false); }}
                         className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors"
                         style={{ borderBottom: i < rssTopics.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                         <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-1)' }}>{t.title}</p>
                         <p className="text-xs" style={{ color: 'var(--text-3)' }}>{t.source_name}</p>
                       </button>
                     ))}
                   </div>
                 </div>
               )}

               <textarea value={topic} onChange={e => { setTopic(e.target.value); setSelectedSourceUrl(undefined); }}
                 placeholder="Digite seu proprio tema... ↵" rows={4}
                 className="w-full px-4 py-4 rounded-2xl text-sm resize-none outline-none transition-colors mb-6 shadow-sm"
                 style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
               />
               <button onClick={() => { if(!topic) toast.error('Defina um tópico'); else setWizardStep(2); }}
                 className="w-full py-4 rounded-2xl font-bold transition-all hover:scale-[1.02]"
                 style={{ background: 'var(--primary)', color: 'white', boxShadow: '0 8px 32px rgba(124,58,237,0.3)' }}>Avançar para Configurações →</button>
             </div>
          )}

          {wizardStep === 2 && (
             <div className="animate-in fade-in slide-in-from-right-8 duration-500 flex flex-col gap-6">
                <div>
                  <h2 className="text-2xl font-display font-bold mb-2">Ajustes & Onboarding</h2>
                  <p className="text-sm opacity-70">Configure a base antes de gerar. Depois você edita slide por slide.</p>
                </div>

                <div>
                   <p className="text-sm font-semibold mb-2">Formato Base</p>
                   <div className="grid grid-cols-2 gap-2">
                     {FORMAT_OPTIONS.map(([fmt, dim]) => (
                        <button key={fmt} onClick={() => setFormat(fmt)}
                          className="py-2.5 px-3 rounded-lg border text-sm transition-all"
                          style={{ borderColor: format===fmt?'var(--primary)':'var(--border)', background: format===fmt?'var(--primary-muted)':'transparent' }}
                        ><span className="font-medium">{dim.label}</span> <span className="opacity-50 text-xs">{dim.aspectLabel}</span></button>
                     ))}
                   </div>
                   {format === 'square' && (
                      <div className="mt-3">
                         <p className="text-xs mb-1.5 opacity-70">Quantidade de Slides</p>
                         <div className="flex gap-2">
                            {[1, 3, 5, 7, 8].map(n => (
                               <button key={n} onClick={() => setSlideCount(n)} className="flex-1 py-1.5 rounded text-sm border transiton-all"
                                style={{ background: slideCount === n ? 'var(--primary-muted)' : 'var(--bg-card)', borderColor: slideCount === n ? 'var(--primary)' : 'var(--border)' }}>{n}</button>
                            ))}
                         </div>
                      </div>
                   )}
                </div>
                
                <div className="p-4 rounded-xl border border-white/10 bg-black/10">
                   <p className="text-sm font-semibold mb-3">Imagens de Fundo Inicial</p>
                   <div className="flex gap-2">
                      <button onClick={() => setGlobalImageMethod('ai')} className={`flex-1 py-2 rounded-lg border text-xs flex items-center justify-center gap-1 transition-all ${globalImageMethod==='ai'?'border-purple-500 bg-purple-500/10 text-purple-400':'border-white/10'}`}>✨ IA (Recomendado)</button>
                      <button onClick={() => setGlobalImageMethod('upload')} className={`flex-1 py-2 rounded-lg border text-xs flex items-center justify-center gap-1 transition-all ${globalImageMethod==='upload'?'border-purple-500 bg-purple-500/10 text-purple-400':'border-white/10'}`}>⬆ Upload (Mais Tarde)</button>
                      <button onClick={() => setGlobalImageMethod('none')} className={`flex-1 py-2 rounded-lg border text-xs flex items-center justify-center gap-1 transition-all ${globalImageMethod==='none'?'border-purple-500 bg-purple-500/10 text-purple-400':'border-white/10'}`}>Nenhuma</button>
                   </div>
                   <p className="text-[10px] mt-2 opacity-50 text-center">Obs: você poderá customizar individualmente por slide depois.</p>
                </div>

                <div>
                   <p className="text-sm font-semibold mb-2">Design Master (Para Todos)</p>
                   <select value={globalTemplate} onChange={e => setGlobalTemplate(e.target.value)} className="w-full p-2.5 rounded-lg border text-sm outline-none" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                      {clonedDna && <option value="dna-clone">✨ DNA CLONADO ({clonedDna.name})</option>}
                      {TEMPLATE_REGISTRY.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                   </select>
                </div>

                <div className="flex gap-3 mt-2">
                   <button onClick={()=>setWizardStep(1)} className="px-6 py-3 rounded-xl border text-sm font-bold opacity-70 hover:opacity-100" style={{ borderColor: 'var(--border)' }}>Voltar</button>
                   <button onClick={handleGenerate} className="flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all hover:scale-[1.02]" style={{ background: 'var(--primary)', color: 'white', boxShadow: '0 8px 32px rgba(124,58,237,0.4)' }}><Wand2 size={18}/> Criar Post AI</button>
                </div>
             </div>
          )}

          {wizardStep === 3 && (
             <div className="animate-in fade-in zoom-in duration-500 py-12 flex flex-col items-center justify-center text-center">
                 <div className="relative mb-8">
                   <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: 'var(--primary)' }} />
                   <div className="w-20 h-20 rounded-full flex items-center justify-center animate-spin" style={{ background: 'var(--primary-muted)', border: '2px solid var(--primary)' }}>
                     <Wand2 size={32} style={{ color: 'var(--primary)' }} />
                   </div>
                 </div>
                 <h2 className="text-2xl font-display font-bold mb-3" style={{ color: 'var(--text-1)' }}>Extraindo Genialidade...</h2>
                 <p className="text-sm" style={{ color: 'var(--text-2)' }}>{genStep}</p>
             </div>
          )}
        </div>
      </div>
    );
  }

  const activeSlide = slideConfigs[activeSlideIdx];

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleUploadBgActiveSlide(e.target.files[0])} />
      
      {/* ─── COLUNA 1: THUMBNAILS (Esquerda) ─── */}
      <div className="panel-left" style={{ width: 220, minWidth: 220, borderRight: '1px solid var(--border)' }}>
         <div className="panel-section mb-0 flex-1 flex flex-col h-full">
            <p className="text-[10px] uppercase font-bold tracking-widest opacity-60 mb-3">Visão Geral (Slides)</p>
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
               {slideConfigs.map((cfg, idx) => {
                 // scale the preview to fit nicely
                 const thumbHeight = 80;
                 const thumbScale = thumbHeight / height;
                 return (
                 <button key={cfg.id} onClick={() => setActiveSlideIdx(idx)} className="relative group text-left w-full rounded-xl overflow-hidden transition-all"
                         style={{ border: `2px solid ${activeSlideIdx === idx ? 'var(--primary)' : 'var(--border)'}`, padding: '2px', background: activeSlideIdx === idx ? 'var(--primary-muted)' : 'transparent' }}>
                    <div className="w-full aspect-[4/5] bg-black rounded-lg overflow-hidden flex items-center justify-center relative pointer-events-none">
                        {cfg.html && (
                           <div style={{ position: 'absolute', transform: `scale(${thumbScale})`, transformOrigin: 'center', pointerEvents: 'none' }}>
                              <SlideFrame slideHtml={cfg.html} width={width} height={height} />
                           </div>
                        )}
                    </div>
                    <span className="absolute top-2 left-2 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded-sm font-bold">{idx + 1}</span>
                    <div className="pt-2 pb-1 px-1 flex justify-between items-center opacity-70 group-hover:opacity-100">
                       <span className="text-[10px] truncate">{getTemplate(cfg.templateId)?.name || 'Customizado'}</span>
                    </div>
                    {/* Excluir Slide */}
                    {slideConfigs.length > 1 && activeSlideIdx === idx && (
                       <div onClick={(e) => { e.stopPropagation(); setSlideConfigs(prev => { const n = [...prev]; n.splice(idx, 1); return n; }); setActiveSlideIdx(Math.max(0, idx - 1)); }}
                          className="absolute bottom-2 right-2 bg-red-500/20 text-red-400 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash size={12} />
                       </div>
                    )}
                 </button>
               )})}

               <button onClick={() => {
                  const newCfg = createSlideConfig({ templateId: activeSlide?.templateId || 'minimal-dark', visualMode: activeSlide?.visualMode || 'dark', headline: 'Novo Tópico' });
                  const updated = [...slideConfigs, newCfg];
                  const fixed = updated.map((c, i) => ({ ...c, html: renderSlideConfig(c, i, updated.length) }));
                  setSlideConfigs(fixed);
                  setActiveSlideIdx(fixed.length - 1);
               }} className="w-full py-3 rounded-xl border-2 border-dashed transition-colors text-[11px] font-bold mt-2"
                  style={{ borderColor: 'var(--border-strong)', color: 'var(--text-3)' }}
               >+ ADICIONAR SLIDE</button>
            </div>
         </div>
      </div>

      {/* ─── COLUNA 2: CANVAS (Centro) ─── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#06060A]">
         <div className="flex items-center justify-between px-5 py-3 shrink-0 bg-black/40 border-b border-white/5">
            <div className="flex items-center gap-3">
               <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }} title={postTitle}>{postTitle.length > 50 ? postTitle.slice(0, 50) + '...' : postTitle}</span>
            </div>
            <div className="flex gap-4 items-center">
               <span className="text-xs opacity-50 font-mono tracking-widest">{width} × {height}</span>
               <div className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold text-white/70">SLIDE {activeSlideIdx + 1} / {slideConfigs.length}</div>
            </div>
         </div>

         <ArtboardStage format={format} className="flex-1">
             {activeSlide?.html ? (
                 <SlideFrame 
                    slideHtml={activeSlide.html} width={width} height={height} editable={true}
                    onHtmlChange={(nx) => {
                       const nextCfgs = [...slideConfigs];
                       nextCfgs[activeSlideIdx].html = nx;
                       // Extract text changes to keep state synced for right panel
                       const fields = extractSlideFields(nx);
                       if (fields.headline) nextCfgs[activeSlideIdx].headline = fields.headline;
                       if (fields.body !== undefined) nextCfgs[activeSlideIdx].body = fields.body;
                       if (fields.cta !== undefined) nextCfgs[activeSlideIdx].cta = fields.cta;
                       setSlideConfigs(nextCfgs);
                    }}
                 />
             ) : (
                <div className="w-full h-full flex items-center justify-center opacity-20"><Wand2 size={48} /></div>
             )}
         </ArtboardStage>

         {/* Bottom nav for presentation mode fallback or easy switching */}
         <div className="h-14 border-t border-white/5 bg-black/40 flex items-center justify-center gap-4">
             <button onClick={() => setActiveSlideIdx(Math.max(0, activeSlideIdx - 1))} disabled={activeSlideIdx === 0}
               className="p-2 rounded-lg bg-white/5 disabled:opacity-20 hover:bg-white/10 transition-colors"><ChevronLeft size={16}/></button>
             <div className="flex gap-1.5">
               {slideConfigs.map((_, i) => (
                 <button key={i} onClick={() => setActiveSlideIdx(i)}
                   className="rounded-full transition-all"
                   style={{ width: i === activeSlideIdx ? 24 : 8, height: 8, background: i === activeSlideIdx ? 'var(--primary)' : 'rgba(255,255,255,0.2)' }} />
               ))}
             </div>
             <button onClick={() => setActiveSlideIdx(Math.min(slideConfigs.length - 1, activeSlideIdx + 1))} disabled={activeSlideIdx === slideConfigs.length - 1}
               className="p-2 rounded-lg bg-white/5 disabled:opacity-20 hover:bg-white/10 transition-colors"><ChevronRight size={16}/></button>
         </div>
      </div>

      {/* ─── COLUNA 3: PAINEL DE PROPRIEDADES (Direita) ─── */}
      <div className="panel-right" style={{ width: 280, minWidth: 280 }}>
          {/* TABS HEADER */}
          <div className="flex border-b text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ borderColor: 'var(--border)' }}>
             <button onClick={() => setActiveTab('visual')} className={`flex-1 py-3.5 flex flex-col items-center gap-1.5 border-b-2 transition-colors ${activeTab==='visual'?'border-purple-500 text-purple-400':'border-transparent text-[color:var(--text-3)] hover:bg-white/5'}`}><LayoutTemplate size={14}/>Visual</button>
             <button onClick={() => setActiveTab('media')} className={`flex-1 py-3.5 flex flex-col items-center gap-1.5 border-b-2 transition-colors ${activeTab==='media'?'border-purple-500 text-purple-400':'border-transparent text-[color:var(--text-3)] hover:bg-white/5'}`}><FileImage size={14}/>Mídia</button>
             <button onClick={() => setActiveTab('text')} className={`flex-1 py-3.5 flex flex-col items-center gap-1.5 border-b-2 transition-colors ${activeTab==='text'?'border-purple-500 text-purple-400':'border-transparent text-[color:var(--text-3)] hover:bg-white/5'}`}><Type size={14}/>Texto</button>
             <button onClick={() => setActiveTab('export')} className={`flex-1 py-3.5 flex flex-col items-center gap-1.5 border-b-2 transition-colors ${activeTab==='export'?'border-purple-500 text-purple-400':'border-transparent text-[color:var(--text-3)] hover:bg-white/5'}`}><Settings2 size={14}/>Export</button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
              
              {/* INSPECTOR GLOBAL (Aparece se tiver nodo selecionado, independente da aba) */}
              {selectedNode && (
                 <div className="p-3 rounded-xl mb-4" style={{ background: 'var(--primary-muted)', border: '1px solid var(--primary)' }}>
                    <div className="flex justify-between items-center mb-3">
                       <p className="font-bold text-xs" style={{ color: 'var(--primary)' }}>Inspetor (DND)</p>
                       <span className="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase" style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--primary)', border: '1px solid currentColor' }}>{selectedNode.tag}</span>
                    </div>
                    
                    <div className="flex flex-col gap-3 text-xs">
                       <div>
                          <p className="opacity-70 mb-1.5">Tamanho e Alinhamento</p>
                          <div className="flex gap-2">
                             <input type="number" className="w-16 px-2 py-1.5 rounded text-center outline-none bg-black/30 border border-white/10" 
                                value={parseInt(selectedNode.styles.fontSize) || 16} onChange={e => handleStyleUpdate({ fontSize: e.target.value + 'px' })} />
                             <div className="flex gap-1 border border-white/10 rounded overflow-hidden">
                                <button onClick={() => handleStyleUpdate({ textAlign: 'left' })} className="px-2 py-1.5 transition-colors focus:bg-purple-600 outline-none"><AlignLeft size={13}/></button>
                                <button onClick={() => handleStyleUpdate({ textAlign: 'center' })} className="px-2 py-1.5 transition-colors focus:bg-purple-600 outline-none border-l border-r border-white/10"><AlignCenter size={13}/></button>
                                <button onClick={() => handleStyleUpdate({ textAlign: 'right' })} className="px-2 py-1.5 transition-colors focus:bg-purple-600 outline-none"><AlignRight size={13}/></button>
                             </div>
                          </div>
                       </div>
                       <div>
                         <p className="opacity-70 mb-1.5">Cores</p>
                         <div className="flex flex-wrap gap-1.5">
                            {[{ label: 'Primária', val: brand.color_primary }, { label: 'Secundária', val: brand.color_secondary }, { label: 'Acento', val: brand.color_accent }, { label: 'Clara', val: brand.color_text_light }, { label: 'Escura', val: brand.color_text_dark }].map(c => c.val && (
                              <button key={c.label} onClick={() => handleStyleUpdate({ color: c.val })} className="w-6 h-6 rounded-full border border-black/20 hover:scale-110" style={{ background: c.val }} title={c.label} />
                            ))}
                         </div>
                       </div>
                       <button onClick={() => handleStyleUpdate({ display: 'none' })} className="mt-2 w-full py-2 rounded-lg font-bold flex items-center justify-center gap-1 bg-red-500/10 text-red-500 hover:bg-red-500/20">
                          <Trash size={12} /> Excluir Tela
                       </button>
                    </div>
                 </div>
              )}

              {/* ABA VISUAL */}
              {activeTab === 'visual' && activeSlide && (
                 <>
                   <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide opacity-50 mb-3">Modo Visual (Slide Atual)</p>
                      <div className="flex flex-wrap gap-1.5">
                          {VIS_MODES.map(vm => (
                              <button key={vm.id} onClick={() => updateSlideConfig(activeSlideIdx, { visualMode: vm.id })}
                                 className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors ${activeSlide.visualMode === vm.id ? 'bg-purple-600 text-white border-purple-600' : 'bg-[color:var(--bg-card)] border-[color:var(--border)] text-[color:var(--text-3)] hover:text-white'}`}>
                                 {vm.label}
                              </button>
                          ))}
                      </div>
                   </div>
                   <hr className="border-[color:var(--border)]" />
                   <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide opacity-50 mb-3">Template (Slide Atual)</p>
                      <div className="grid grid-cols-2 gap-2.5">
                         {clonedDna && (
                            <button onClick={() => updateSlideConfig(activeSlideIdx, { templateId: 'dna-clone' })} title={clonedDna.name}
                               className={`h-[72px] rounded-lg overflow-hidden relative border-2 transition-all ${activeSlide.templateId === 'dna-clone' ? 'border-purple-500 scale-105' : 'border-dashed border-white/20'}`}>
                               <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-2">
                                 <span className="text-[9px] font-bold leading-tight mb-1">✨ DNA CLONADO</span>
                                 <span className="text-[8px] truncate tracking-wide w-full" style={{ color: 'var(--primary)' }}>{clonedDna.name.toUpperCase()}</span>
                               </div>
                            </button>
                         )}
                         {TEMPLATE_REGISTRY.map(tpl => (
                             <button key={tpl.id} onClick={() => updateSlideConfig(activeSlideIdx, { templateId: tpl.id })}
                               className={`h-[72px] rounded-lg overflow-hidden relative border-2 transition-all ${activeSlide.templateId === tpl.id ? 'border-purple-500 scale-105 shadow-[0_0_15px_rgba(124,58,237,0.4)]' : 'border-transparent'}`}>
                               <div className="absolute inset-0" style={{ background: tpl.previewGradient }}/>
                               <span className="absolute bottom-1.5 left-2 text-[9px] font-bold z-10 w-full text-left" style={{ color: tpl.previewAccent, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{tpl.name}</span>
                             </button>
                         ))}
                      </div>
                   </div>
                 </>
              )}

              {/* ABA MÍDIA */}
              {activeTab === 'media' && activeSlide && (
                 <>
                   <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide opacity-50 mb-3">Fundo (Slide Atual)</p>
                      {activeSlide.bgImageUrl ? (
                         <div className="relative aspect-video rounded-xl overflow-hidden mb-4 border border-white/10 shadow-lg">
                            <img src={activeSlide.bgImageUrl} className="w-full h-full object-cover"/>
                            <button onClick={()=>updateSlideConfig(activeSlideIdx, { bgImageUrl: undefined })} className="absolute top-2 right-2 bg-black/80 p-1.5 rounded-full hover:bg-red-500 hover:text-white transition-colors backdrop-blur"><X size={12}/></button>
                         </div>
                      ) : (
                         <div className="aspect-video rounded-xl border border-dashed border-white/20 mb-4 flex items-center justify-center bg-black/10 text-xs opacity-50">Sem Fundo</div>
                      )}
                      
                      <div className="flex flex-col gap-2">
                         <button disabled={isGenImg} onClick={handleBgGenForActiveSlide} className="w-full py-3.5 text-xs font-bold rounded-xl flex justify-center items-center gap-2 transition-colors disabled:opacity-50" style={{ background: 'var(--primary-muted)', color: 'var(--primary)', border: '1px solid var(--primary)' }}>
                            {isGenImg ? <RefreshCw className="animate-spin" size={14}/> : <Wand2 size={14} />}
                            {isGenImg ? 'Gerando IA...' : 'Gerar Imagem com IA'}
                         </button>
                         <button onClick={()=>fileInputRef.current?.click()} className="w-full py-3.5 text-xs font-bold bg-[color:var(--bg-card)] border border-[color:var(--border)] rounded-xl flex justify-center items-center gap-2 hover:bg-white/5 transition-colors">
                            <Upload size={14} /> Fazer Upload
                         </button>
                      </div>
                   </div>
                 </>
              )}

              {/* ABA TEXTO */}
              {activeTab === 'text' && activeSlide && (
                 <>
                    <div>
                       <p className="text-[11px] font-bold uppercase tracking-wide opacity-50 mb-2">Headline</p>
                       <textarea value={activeSlide.headline} onChange={e => updateSlideConfig(activeSlideIdx, { headline: e.target.value })} 
                          rows={2} className="w-full px-3 py-2.5 text-[13px] bg-[color:var(--bg-card)] rounded-xl border border-[color:var(--border)] outline-none focus:border-purple-500 transition-colors shadow-inner" />
                    </div>
                    <div>
                       <p className="text-[11px] font-bold uppercase tracking-wide opacity-50 mb-2">Corpo</p>
                       <textarea value={activeSlide.body || ''} onChange={e => updateSlideConfig(activeSlideIdx, { body: e.target.value })} 
                          rows={4} className="w-full px-3 py-2.5 text-[13px] bg-[color:var(--bg-card)] rounded-xl border border-[color:var(--border)] outline-none focus:border-purple-500 transition-colors shadow-inner" />
                    </div>
                    <div>
                       <p className="text-[11px] font-bold uppercase tracking-wide opacity-50 mb-2">CTA (Opcional)</p>
                       <input value={activeSlide.cta || ''} onChange={e => updateSlideConfig(activeSlideIdx, { cta: e.target.value })} 
                          className="w-full px-3 py-2.5 text-[13px] bg-[color:var(--bg-card)] rounded-xl border border-[color:var(--border)] outline-none focus:border-purple-500 transition-colors shadow-inner" />
                    </div>
                    <hr className="border-[color:var(--border)] my-1" />
                    <div>
                       <p className="text-[11px] font-bold uppercase tracking-wide opacity-50 mb-2 text-purple-400">Legenda p/ Instagram (Post Todo)</p>
                       <textarea value={caption} onChange={e => setCaption(e.target.value)} 
                          rows={5} className="w-full px-3 py-2.5 text-[13px] bg-purple-500/5 rounded-xl border border-purple-500/30 outline-none focus:border-purple-500 transition-colors" />
                       <div className="flex flex-wrap gap-1 mt-2">
                         {hashtags.map(tag => (
                           <button key={tag} onClick={() => removeHashtag(tag)}
                             className="text-[9px] px-1.5 py-0.5 rounded-full transition-all hover:bg-red-500/20"
                             style={{ background: 'var(--primary-muted)', color: 'var(--primary)', border: '1px solid var(--border)' }}>
                             {tag} ×
                           </button>
                         ))}
                       </div>
                    </div>
                 </>
              )}

              {/* ABA EXPORTAR */}
              {activeTab === 'export' && (
                 <div className="flex flex-col gap-3">
                    <button onClick={async () =>{
                       if(!activeSlide?.html) return;
                       toast.info('Exportando slide...', { id: 'exp' });
                       const b = await exportSlide(activeSlide.html, `slide_${activeSlideIdx+1}`, width, height);
                       const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${postTitle||'post'}_slide_${activeSlideIdx+1}.png`; a.click();
                       toast.success('Pronto!', { id: 'exp' });
                    }} className="w-full py-3.5 bg-[color:var(--bg-card)] border border-[color:var(--border)] text-sm font-semibold rounded-xl hover:bg-white/5 flex gap-2 justify-center items-center shadow-sm">
                       <Download size={16}/> PNG (Slide Atual)
                    </button>

                    <button onClick={()=>{ exportAllSlides(slideConfigs.map(c=>c.html!), postTitle||'post', width, height); }} 
                       className="w-full py-3.5 bg-[color:var(--bg-card)] border border-[color:var(--border)] text-sm font-semibold rounded-xl hover:bg-white/5 flex gap-2 justify-center items-center shadow-sm">
                       <Download size={16}/> Todos Slides (ZIP)
                    </button>

                    <button onClick={()=>{ exportSlidesPDF(slideConfigs.map(c=>c.html!), postTitle||'post', width, height); }} 
                       className="w-full py-3.5 bg-[color:var(--bg-card)] border border-[color:var(--border)] text-sm font-semibold rounded-xl hover:bg-white/5 flex gap-2 justify-center items-center shadow-sm">
                       <Download size={16}/> Baixar PDF
                    </button>
                    
                    <button onClick={()=>{ exportSlidesHTML(slideConfigs.map(c=>c.html!), postTitle||'post', width, height); }} 
                       className="w-full py-3.5 bg-[color:var(--bg-card)] border border-[color:var(--border)] text-sm font-semibold rounded-xl hover:bg-white/5 flex gap-2 justify-center items-center shadow-sm">
                       <Download size={16}/> Baixar Animado (HTML)
                    </button>

                    <div className="my-2 border-t border-[color:var(--border)]" />

                    <button disabled={isSavingLibrary} onClick={handleSaveToLibrary} className="w-full py-4 text-sm rounded-xl font-bold flex justify-center items-center gap-2 transition-all hover:scale-[1.02]"
                       style={{ background: 'var(--primary)', color: 'white', boxShadow: '0 8px 32px rgba(124,58,237,0.3)' }}>
                       {isSavingLibrary ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16}/>}
                       Salvar na Biblioteca
                    </button>
                    
                    <button onClick={() => setWizardStep(1)} className="text-[11px] font-bold uppercase tracking-wide w-full text-center text-[color:var(--text-3)] hover:text-white mt-4 underline decoration-white/20 underline-offset-4">
                       Fazer Outro Post
                    </button>
                 </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default GeneratorPage;
