import { useState, useCallback, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { Wand2, Search, Upload, RefreshCw, Download, Copy, ChevronLeft, ChevronRight, X, Save, Trash, AlignLeft, AlignCenter, AlignRight, FileImage, LayoutTemplate, Type, Settings2, Film, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import SimlabReviewPanel from '@/components/simlab/SimlabReviewPanel';
import SlideFrame from '@/components/canvas/SlideFrame';
import VideoJobStatusCard from '@/components/video/VideoJobStatusCard';
import {
  ArtboardDimension, ArtboardFormat, BrandKit, DEFAULT_BRAND_KIT, SlideData,
  ARTBOARD_DIMENSIONS, getArtboardDimensions, SlideConfig, createSlideConfig, BgSource, VisMod
} from '@/lib/canvasEngine';
import { TEMPLATE_REGISTRY, getTemplate } from '@/lib/templateRegistry';
import { exportSlide, exportAllSlides, uploadSlideToStorage, exportSlidesPDF, exportSlidesHTML } from '@/lib/exportPost';
import { BrandCharacterRecord, CAROUSEL_ARCS, MediaAssetRecord } from '@/lib/postgenPhase2';
import { awaitSimlabCompletion, dispatchSimlabValidation, type SimlabInsight, type SimlabRun, type SimlabVariant } from '@/lib/simlab';
import { useVideoJobStatus } from '@/hooks/useVideoJobStatus';
import { extractRemotionResultUrl, launchRemotionComposition } from '@/lib/remotion-entrypoints';

// Performance Audit: Implement Lazy Loading
const ArtboardStage = lazy(() => import('@/components/canvas/ArtboardStage'));

import type { Tone, Funnel, RssTopic } from '@/components/postgen/GeneratorTypes';
const GeneratorWizard = lazy(() => import('@/components/postgen/GeneratorWizard'));
const GeneratorSidebar = lazy(() => import('@/components/postgen/GeneratorSidebar'));
const GeneratorInspector = lazy(() => import('@/components/postgen/GeneratorInspector'));
const GeneratorStage = lazy(() => import('@/components/postgen/GeneratorStage'));

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
  recommended_template_id?: string | null;
  storyboard_arc?: string | null;
  media_asset_id?: string | null;
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
  storyboard_id?: string | null;
  character_id?: string | null;
  prompt_used?: string | null;
}

interface StoryboardSlidePlan {
  role?: string;
  headline_draft?: string;
  notes?: string;
  template_suggestion?: string;
}

interface GeneratorLocationState {
  post?: EditablePost;
  dnaTemplate?: { id: string; html_template: string; source_name: string | null; brand_dna?: Record<string, unknown> };
  topic?: string;
  sourceUrl?: string;
  recommendedTemplate?: string;
  funnel?: Funnel;
  character?: BrandCharacterRecord | null;
  mediaAsset?: MediaAssetRecord | null;
  storyboard?: {
    id: string;
    arc_type?: string | null;
    slides_plan?: StoryboardSlidePlan[];
  } | null;
  arcType?: string;
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
  const { workspace, briefing, brandKit: wsBrandKit } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hydratedPostIdRef = useRef<string | null>(null);
  const consumedPreloadRef = useRef<string | null>(null);
  // Adapta o BrandKit JSONB do banco (app.types.BrandKit) para o
  // formato plano esperado pelo canvasEngine (canvasEngine.BrandKit).
  // O banco armazena { colors: {primary, secondary...}, fonts: {heading...} }
  // O motor de template espera { color_primary, font_headline... }
  const brand: BrandKit = useMemo(() => {
    if (!wsBrandKit) return DEFAULT_BRAND_KIT;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bk = wsBrandKit as unknown as Record<string, any>;
    const colors = bk.colors || {};
    const fonts  = bk.fonts  || {};
    const logos  = bk.logos  || {};
    return {
      ...DEFAULT_BRAND_KIT,
      color_primary:    colors.primary    || DEFAULT_BRAND_KIT.color_primary,
      color_secondary:  colors.secondary  || DEFAULT_BRAND_KIT.color_secondary,
      color_accent:     colors.accent     || DEFAULT_BRAND_KIT.color_accent,
      color_bg_dark:    colors.background || DEFAULT_BRAND_KIT.color_bg_dark,
      color_bg_light:   colors.bg_light   || DEFAULT_BRAND_KIT.color_bg_light,
      color_text_dark:  colors.text       || DEFAULT_BRAND_KIT.color_text_dark,
      color_text_light: colors.text_light || DEFAULT_BRAND_KIT.color_text_light,
      font_headline:    fonts.heading     || DEFAULT_BRAND_KIT.font_headline,
      font_body:        fonts.body        || DEFAULT_BRAND_KIT.font_body,
      font_accent:      fonts.display     || DEFAULT_BRAND_KIT.font_accent,
      logo_url:         logos.main_url    || null,
      watermark_text:   null,
    };
  }, [wsBrandKit]);

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
  const [recommendedTemplateId, setRecommendedTemplateId] = useState<string | null>(null);
  const [activeStoryboardId, setActiveStoryboardId] = useState<string | null>(null);
  const [activeStoryboardArc, setActiveStoryboardArc] = useState<string | null>(null);
  const [preloadedMediaAsset, setPreloadedMediaAsset] = useState<MediaAssetRecord | null>(null);
  const [promptUsed, setPromptUsed] = useState<string | null>(null);
  const [availableCharacters, setAvailableCharacters] = useState<BrandCharacterRecord[]>([]);
  const [preloadedCharacter, setPreloadedCharacter] = useState<BrandCharacterRecord | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('none');

  // Wizard / Config State
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [slideCount, setSlideCount] = useState(5);
  const [tone, setTone] = useState<Tone>('Informativo');
  const [funnel, setFunnel] = useState<Funnel>('Awareness');
  const [globalImageMethod, setGlobalImageMethod] = useState<BgSource>('ai');
  const [globalVisMode, setGlobalVisMode] = useState<VisMod>('dark');
  const [globalTemplate, setGlobalTemplate] = useState('auto');

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
  const [simlabRun, setSimlabRun] = useState<SimlabRun | null>(null);
  const [simlabInsight, setSimlabInsight] = useState<SimlabInsight | null>(null);
  const [simlabVariants, setSimlabVariants] = useState<SimlabVariant[]>([]);
  const [simlabLoading, setSimlabLoading] = useState(false);
  const [simlabError, setSimlabError] = useState<string | null>(null);
  const [isLaunchingRemotion, setIsLaunchingRemotion] = useState(false);
  const [remotionJobId, setRemotionJobId] = useState<string | null>(null);
  const [remotionCompositionId, setRemotionCompositionId] = useState<string | null>(null);
  const remotionStatusRef = useRef<string | null>(null);

  const { width, height } = getArtboardDimensions(format);
  const { payload: remotionStatusPayload, refresh: refreshRemotionJob } = useVideoJobStatus(remotionJobId);
  const remotionResultUrl = useMemo(
    () => extractRemotionResultUrl(remotionStatusPayload?.job?.job || null),
    [remotionStatusPayload],
  );
  const selectedCharacter = useMemo(
    () => availableCharacters.find(character => character.id === selectedCharacterId) || preloadedCharacter,
    [availableCharacters, preloadedCharacter, selectedCharacterId],
  );
  const activeArcLabel = useMemo(
    () => CAROUSEL_ARCS.find(arc => arc.id === activeStoryboardArc)?.name || activeStoryboardArc,
    [activeStoryboardArc],
  );

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

  useEffect(() => {
    if (!workspace?.id) return;

    let isMounted = true;
    const loadCharacters = async () => {
      const { data } = await supabase
        .from('brand_characters')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!isMounted) return;
      setAvailableCharacters((data || []) as BrandCharacterRecord[]);
    };

    loadCharacters();
    return () => { isMounted = false; };
  }, [workspace?.id]);

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
    const state = location.state as GeneratorLocationState | null;
    
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
    setRecommendedTemplateId(post.generation_meta?.recommended_template_id || null);
    setActiveStoryboardId(post.storyboard_id || null);
    setActiveStoryboardArc(post.generation_meta?.storyboard_arc || null);
    setSelectedCharacterId(post.character_id || 'none');
    setPromptUsed(post.prompt_used || null);
    
    // Hydrating configs vs fallback old approach
    if (post.generation_meta?.slide_configs) {
      setSlideConfigs(post.generation_meta.slide_configs.map((cfg, index, all) => ({
        ...cfg,
        html: renderSlideConfig(cfg, index, all.length),
      })));
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
        cfg.html = html;
        return cfg;
      });
      setSlideConfigs(configs);
      setActiveSlideIdx(0);
    }
    
    toast.success('Post carregado para edição');
  }, [location.state, clonedDna?.id, renderSlideConfig]);

  useEffect(() => {
    const state = location.state as GeneratorLocationState | null;
    if (!state || state.post || state.dnaTemplate) return;

    const signature = JSON.stringify({
      topic: state.topic || '',
      sourceUrl: state.sourceUrl || '',
      recommendedTemplate: state.recommendedTemplate || '',
      funnel: state.funnel || '',
      storyboardId: state.storyboard?.id || '',
      characterId: state.character?.id || '',
      mediaAssetId: state.mediaAsset?.id || '',
      arcType: state.arcType || '',
    });

    if (consumedPreloadRef.current === signature) return;
    consumedPreloadRef.current = signature;

    if (state.topic) {
      setTopic(state.topic);
      setPostTitle(current => current || state.topic || '');
    }

    if (state.sourceUrl) {
      setSelectedSourceUrl(state.sourceUrl);
    }

    if (state.recommendedTemplate) {
      setRecommendedTemplateId(state.recommendedTemplate);
      setGlobalTemplate(state.recommendedTemplate);
    }

    if (state.funnel) {
      setFunnel(state.funnel);
    }

    if (state.character) {
      setPreloadedCharacter(state.character);
      setSelectedCharacterId(state.character.id);
    }

    if (state.mediaAsset) {
      setPreloadedMediaAsset(state.mediaAsset);
      setGlobalImageMethod('upload');
      setPromptUsed(
        typeof state.mediaAsset.metadata === 'object' && state.mediaAsset.metadata && 'prompt' in state.mediaAsset.metadata
          ? String((state.mediaAsset.metadata as Record<string, unknown>).prompt || '')
          : null,
      );
    }

    if (state.storyboard?.id) {
      setActiveStoryboardId(state.storyboard.id);
      setActiveStoryboardArc(state.storyboard.arc_type || state.arcType || null);
    } else if (state.arcType) {
      setActiveStoryboardArc(state.arcType);
    }

    if (Array.isArray(state.storyboard?.slides_plan) && state.storyboard?.slides_plan.length) {
      const nextConfigs = state.storyboard.slides_plan.map((slide, index, all) => {
        const cfg = createSlideConfig({
          templateId: slide.template_suggestion || state.recommendedTemplate || 'data-insight',
          bgImageUrl: state.mediaAsset?.public_url || undefined,
          bgSource: state.mediaAsset?.public_url ? 'upload' : 'none',
          visualMode: 'dark',
          headline: slide.headline_draft || slide.role || `Slide ${index + 1}`,
          body: slide.notes || '',
          cta: /cta|summary|guarantee/i.test(slide.role || '') ? 'Continuar' : undefined,
          bgPromptHint: slide.notes || state.topic || '',
        });
        cfg.html = renderSlideConfig(cfg, index, all.length);
        return cfg;
      });

      setSlideConfigs(nextConfigs);
      setSlideCount(nextConfigs.length);
      setFormat('square');
      setActiveSlideIdx(0);
      setWizardStep(4);
      toast.success('Storyboard carregado no motor de design');
    }

    window.history.replaceState({}, document.title);
  }, [location.state, renderSlideConfig]);

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

  useEffect(() => {
    const job = remotionStatusPayload?.job?.job;
    if (!job || !remotionJobId) return;

    const marker = `${remotionJobId}:${job.status}`;
    if (remotionStatusRef.current === marker) return;
    remotionStatusRef.current = marker;

    if (job.status === 'completed') {
      toast.success('Render Remotion concluido.');
    }

    if (job.status === 'failed') {
      toast.error(job.error_message || 'O render Remotion falhou no runtime.');
    }
  }, [remotionJobId, remotionStatusPayload]);

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
    let completed = false;
    setSimlabRun(null);
    setSimlabInsight(null);
    setSimlabVariants([]);
    setSimlabError(null);
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
          arc_type: activeStoryboardArc,
          storyboard_plan: slideConfigs.length > 0 && activeStoryboardId ? slideConfigs.map(c => ({
             role: c.headline,
             notes: c.body,
             template_suggestion: c.templateId
          })) : undefined
        },
      });

      if (error) throw error;
      if (!data) throw new Error('Resposta vazia da funcao');

      setGenStep('Processando slides...');
      setBgPromptHint(data.slides?.[0]?.bg_prompt_hint || data.bg_prompt_hint || topic);
      if (!preloadedMediaAsset?.public_url) {
        setPromptUsed(data.bg_prompt_hint || data.slides?.[0]?.bg_prompt_hint || topic);
      }
      setPostTitle(data.post_title || topic);
      setCaption(data.caption || '');
      setHashtags((data.hashtags || '').split(/[\s,]+/).filter((h: string) => h.startsWith('#')));

      let configs: SlideConfig[] = data.slides.map((s, idx) => {
        let appliedTemplate = globalTemplate;
        if (appliedTemplate === 'auto') {
           if (data.slides.length === 1) {
              appliedTemplate = recommendedTemplateId || 'clean-white';
           } else {
              if (idx === 0) appliedTemplate = 'viral-hook';
              else if (idx === data.slides.length - 1) appliedTemplate = 'minimal-dark';
              else appliedTemplate = 'data-insight'; 
           }
        }
        
        return createSlideConfig({
          templateId: appliedTemplate,
          bgSource: globalImageMethod,
          visualMode: globalVisMode,
          headline: s.headline,
          body: s.body,
          cta: s.cta,
          bgPromptHint: s.bg_prompt_hint || data.bg_prompt_hint || `${topic} slide ${idx+1}`
        });
      });

      if (preloadedMediaAsset?.public_url) {
        configs = configs.map(cfg => ({
          ...cfg,
          bgImageUrl: preloadedMediaAsset.public_url,
          bgSource: 'upload',
        }));
      }

      // Generate Background if selected AI method globally
      if (globalImageMethod === 'ai' && !editingPostId && !preloadedMediaAsset?.public_url) {
        setGenStep('Multi-Agente Visualizando (Imagens)...');
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

      if (workspace?.id) {
        setGenStep('Validando com SimLab...');
        setSimlabLoading(true);

        const dispatch = await dispatchSimlabValidation({
          workspace_id: workspace.id,
          validation_type: 'content',
          module_type: 'content_post',
          stimulus_type: configs.length > 1 ? 'social_carousel' : 'social_post',
          objective: topic.trim(),
          // target_audience está no JSONB briefing.audience.description
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          audience_hint: (briefing as any)?.audience?.description || null,
          variants: [{
            key: 'primary_candidate',
            label: data.post_title || topic,
            artifact: {
              post_title: data.post_title || topic,
              caption: data.caption || '',
              hashtags: data.hashtags || '',
              slides: data.slides,
              slides_html: configs.map((cfg) => cfg.html || ''),
              funnel_type: funnel,
              tone,
              format,
            },
          }],
          request_payload: {
            source_url: selectedSourceUrl || null,
            storyboard_id: activeStoryboardId || null,
            character_id: selectedCharacterId !== 'none' ? selectedCharacterId : null,
          },
          context_policy: {
            require_approval: true,
          },
          wait_for_completion: true,
          timeout_ms: 95000,
        });

        const validated = await awaitSimlabCompletion(dispatch.run_id, 95000);
        setSimlabRun(validated.run);
        setSimlabInsight(validated.insight);
        setSimlabVariants(validated.variants);

        if (validated.run.verdict !== 'approved') {
          setSimlabError(validated.insight?.executive_summary || validated.run.failure_reason || 'SimLab recomendou revisao antes de promover o post.');
        }
      }
      
      setSlideConfigs(configs);
      setActiveSlideIdx(0);
      
      await new Promise(r => setTimeout(r, 400));
      completed = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro na IA';
      toast.error('Falha real na geracao: ' + message);
      return;
      
      const configs = Array.from({length: slideCount}).map((_, i) => createSlideConfig({
         templateId: globalTemplate,
         headline: i === 0 ? topic.slice(0, 40) : `Ponto ${i}: ${topic.slice(0, 25)}`,
         body: i === 0 ? 'Configure suas chaves de IA em Configurações para gerar textos compeltos.' : 'Cada slide terá um conteúdo diferente.',
         cta: i === (slideCount - 1) ? 'Siga para mais' : undefined,
         bgSource: preloadedMediaAsset?.public_url ? 'upload' : globalImageMethod,
         bgImageUrl: preloadedMediaAsset?.public_url || undefined,
         bgPromptHint: `${topic} parte ${i+1}`
      }));
      const rendered = configs.map((c, i) => ({ ...c, html: renderSlideConfig(c, i, configs.length) }));
      setSlideConfigs(rendered);
      setCaption(`${topic}\n\nComente sua opinião!`);
      setActiveSlideIdx(0);
    } finally {
      setIsGenerating(false);
      setSimlabLoading(false);
      setGenStep('');
      setWizardStep(completed ? 4 : 2);
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao buscar noticias';
      toast.error('Erro ao buscar News: ' + message);
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
      if (data?.imageUrl) {
        updateSlideConfig(activeSlideIdx, { bgImageUrl: data.imageUrl, bgSource: 'ai' });
        setPromptUsed(bgPromptHint || topic);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao gerar imagem';
      toast.error('Erro: ' + message);
    } 
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
        storyboard_id: activeStoryboardId || null,
        character_id: selectedCharacterId !== 'none' ? selectedCharacterId : null,
        prompt_used: promptUsed || null,
        generation_meta: {
          artboard_format: format,
          slide_configs: slideConfigs,
          recommended_template_id: recommendedTemplateId,
          storyboard_arc: activeStoryboardArc,
          media_asset_id: preloadedMediaAsset?.id || null,
        },
        status: simlabRun?.verdict === 'approved' ? 'ready' : 'draft',
      };

      const saveQuery = editingPostId
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (supabase as any).from('posts_v2').update(payload).eq('id', editingPostId).select().single()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        : (supabase as any).from('posts_v2').insert(payload).select().single();

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

      if (simlabRun?.id) {
        await supabase.from('posts_v2').update({
          latest_simlab_run_id: simlabRun.id,
          simlab_status: simlabRun.status,
          simlab_validated_at: simlabRun.completed_at || new Date().toISOString(),
        }).eq('id', savedPost.id);
      }

      if (activeStoryboardId) {
        await supabase.from('carousel_storyboards').update({ post_id: savedPost.id }).eq('id', activeStoryboardId);
      }

      setEditingPostId(savedPost.id);
      toast.success(editingPostId ? 'Post atualizado!' : 'Post salvo!');
    } catch (error) { toast.error('Erro ao salvar.'); } 
    finally { setIsSavingLibrary(false); }
  };

  const handleAnimateWithRemotion = async () => {
    if (!workspace?.id || slideConfigs.length === 0) {
      toast.error('Gere o post antes de animar com Remotion.');
      return;
    }

    setIsLaunchingRemotion(true);

    try {
      if (simlabRun && simlabRun.verdict !== 'approved') {
        toast.warning('SimLab ainda nao aprovou este post. O render vai seguir como draft.');
      }

      const title = postTitle || topic.trim() || (slideConfigs.length > 1 ? 'Animated Carousel' : 'Animated Post');
      const launch = await launchRemotionComposition({
        workspaceId: workspace.id,
        title,
        promptOriginal: `Animate social content for ${title}`,
        compositionKind: slideConfigs.length > 1 ? 'animated_carousel' : 'animated_post',
        sourceModule: 'generator_page',
        canvasWidth: width,
        canvasHeight: height,
        sourceRef: {
          post_id: editingPostId || null,
          storyboard_id: activeStoryboardId || null,
          simlab_run_id: simlabRun?.id || null,
        },
        metadata: {
          caption,
          hashtags,
          format,
          funnel,
          tone,
          source_topic: topic || null,
          source_url: selectedSourceUrl || null,
          recommended_template_id: recommendedTemplateId,
          storyboard_arc: activeStoryboardArc,
          brand,
          simlab_verdict: simlabRun?.verdict || null,
        },
        scenes: slideConfigs.map((cfg, index) => ({
          id: `generator-slide-${index + 1}`,
          kind: slideConfigs.length > 1 ? 'carousel_slide' : 'post_slide',
          durationFrames: index === 0 ? 120 : index === slideConfigs.length - 1 ? 105 : 90,
          payload: {
            index,
            slide_number: index + 1,
            total_slides: slideConfigs.length,
            headline: cfg.headline,
            body: cfg.body,
            cta: cfg.cta || null,
            template_id: cfg.templateId,
            visual_mode: cfg.visualMode,
            background_image_url: cfg.bgImageUrl || null,
            background_source: cfg.bgSource,
            html: cfg.html || '',
          },
        })),
      });

      setRemotionCompositionId(launch.compositionId);
      setRemotionJobId(launch.jobId);
      remotionStatusRef.current = null;

      if (launch.status === 'failed') {
        toast.error(launch.dispatchError || 'O runtime recusou o render Remotion.');
      } else {
        toast.success('Render Remotion enviado para a fila real de video_jobs.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLaunchingRemotion(false);
    }
  };

  const removeHashtag = (tag: string) => setHashtags(prev => prev.filter(h => h !== tag));

  const refreshSimlabRun = async () => {
    if (!simlabRun?.id) return;
    setSimlabLoading(true);
    try {
      const status = await awaitSimlabCompletion(simlabRun.id, 15000);
      setSimlabRun(status.run);
      setSimlabInsight(status.insight);
      setSimlabVariants(status.variants);
      setSimlabError(status.run.failure_reason || null);
    } catch (error) {
      setSimlabError(error instanceof Error ? error.message : String(error));
    } finally {
      setSimlabLoading(false);
    }
  };

  if (wizardStep < 4) {
    return (
      <GeneratorWizard
        wizardStep={wizardStep}
        setWizardStep={setWizardStep}
        topic={topic}
        setTopic={setTopic}
        setSelectedSourceUrl={setSelectedSourceUrl}
        isFetchingRss={isFetchingRss}
        handleFetchRss={handleFetchRss}
        showRssPanel={showRssPanel}
        setShowRssPanel={setShowRssPanel}
        rssTopics={rssTopics}
        format={format}
        setFormat={setFormat}
        FORMAT_OPTIONS={FORMAT_OPTIONS}
        slideCount={slideCount}
        setSlideCount={setSlideCount}
        globalImageMethod={globalImageMethod}
        setGlobalImageMethod={setGlobalImageMethod}
        globalTemplate={globalTemplate}
        setGlobalTemplate={setGlobalTemplate}
        clonedDna={clonedDna}
        recommendedTemplateId={recommendedTemplateId}
        selectedCharacterId={selectedCharacterId}
        setSelectedCharacterId={setSelectedCharacterId}
        availableCharacters={availableCharacters}
        selectedCharacter={selectedCharacter}
        preloadedMediaAsset={preloadedMediaAsset}
        handleGenerate={handleGenerate}
        genStep={genStep}
      />
    );
  }

  const activeSlide = slideConfigs[activeSlideIdx];

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => { if (e.target.files) handleUploadBgActiveSlide(e.target.files[0]) }} />
      
      <GeneratorSidebar
        slideConfigs={slideConfigs}
        setSlideConfigs={setSlideConfigs}
        activeSlideIdx={activeSlideIdx}
        setActiveSlideIdx={setActiveSlideIdx}
        width={width}
        height={height}
        createSlideConfig={createSlideConfig}
        renderSlideConfig={renderSlideConfig}
      />

      <GeneratorStage
        postTitle={postTitle}
        activeArcLabel={activeArcLabel}
        selectedCharacter={selectedCharacter}
        width={width}
        height={height}
        activeSlideIdx={activeSlideIdx}
        slideConfigs={slideConfigs}
        setActiveSlideIdx={setActiveSlideIdx}
        format={format}
        setSlideConfigs={setSlideConfigs}
        extractSlideFields={extractSlideFields}
      />

      <GeneratorInspector
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        simlabRun={simlabRun}
        simlabInsight={simlabInsight}
        simlabVariants={simlabVariants}
        simlabLoading={simlabLoading}
        simlabError={simlabError}
        refreshSimlabRun={refreshSimlabRun}
        selectedNode={selectedNode}
        handleStyleUpdate={handleStyleUpdate}
        brand={brand}
        activeSlide={activeSlide}
        activeSlideIdx={activeSlideIdx}
        recommendedTemplateId={recommendedTemplateId}
        selectedCharacter={selectedCharacter}
        availableCharacters={availableCharacters}
        selectedCharacterId={selectedCharacterId}
        setSelectedCharacterId={setSelectedCharacterId}
        VIS_MODES={VIS_MODES}
        updateSlideConfig={updateSlideConfig}
        clonedDna={clonedDna}
        isGenImg={isGenImg}
        handleBgGenForActiveSlide={handleBgGenForActiveSlide}
        fileInputRef={fileInputRef}
        caption={caption}
        setCaption={setCaption}
        hashtags={hashtags}
        removeHashtag={removeHashtag}
        width={width}
        height={height}
        postTitle={postTitle}
        exportSlide={exportSlide}
        exportAllSlides={exportAllSlides}
        exportSlidesPDF={exportSlidesPDF}
        exportSlidesHTML={exportSlidesHTML}
        slideConfigs={slideConfigs}
        isLaunchingRemotion={isLaunchingRemotion}
        handleAnimateWithRemotion={handleAnimateWithRemotion}
        remotionJobId={remotionJobId}
        remotionCompositionId={remotionCompositionId}
        remotionResultUrl={remotionResultUrl}
        remotionStatusPayload={remotionStatusPayload}
        refreshRemotionJob={refreshRemotionJob}
        isSavingLibrary={isSavingLibrary}
        handleSaveToLibrary={handleSaveToLibrary}
        setWizardStep={setWizardStep}
      />
    </div>
  );
};

export default GeneratorPage;
