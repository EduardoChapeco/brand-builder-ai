import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Layers, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ArtboardStage from '@/components/canvas/ArtboardStage';
import SlideFrame from '@/components/canvas/SlideFrame';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { DEFAULT_BRAND_KIT, getArtboardDimensions } from '@/lib/canvasEngine';
import { CAROUSEL_ARCS } from '@/lib/postgenPhase2';
import { getTemplate } from '@/lib/templateRegistry';

type StoryboardRecord = Tables<'carousel_storyboards'>;

type StoryboardSlide = {
  id: string;
  role: string;
  headline_draft: string;
  notes: string;
  template_suggestion: string;
};

const defaultTemplateForRole = (role: string) => {
  if (/hook|declaration|claim|question/i.test(role)) return 'viral-hook';
  if (/cta|summary|guarantee/i.test(role)) return 'clean-white';
  if (/testimonial|proof|data|insight/i.test(role)) return 'data-insight';
  return 'editorial-magazine';
};

const SortableStoryboardCard = ({
  slide,
  index,
  onChange,
  onRemove,
  isActive,
  onSelect,
}: {
  slide: StoryboardSlide;
  index: number;
  onChange: (id: string, field: keyof StoryboardSlide, value: string) => void;
  onRemove: (id: string) => void;
  isActive: boolean;
  onSelect: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: slide.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        background: isActive ? 'var(--primary-muted)' : 'var(--bg-card)',
        border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
      }}
      className="rounded-2xl p-4"
      onClick={onSelect}
      {...attributes}
      aria-hidden={false}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button {...listeners} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <GripVertical size={14} />
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>
              Slide {index + 1}
            </p>
            <p className="mt-1 font-semibold" style={{ color: 'var(--text-1)' }}>{slide.role}</p>
          </div>
        </div>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onRemove(slide.id);
          }}
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <Input value={slide.headline_draft} onChange={(event) => onChange(slide.id, 'headline_draft', event.target.value)} placeholder="Headline do slide" />
        <Textarea value={slide.notes} onChange={(event) => onChange(slide.id, 'notes', event.target.value)} className="min-h-[82px] resize-none" placeholder="Notas e instrucoes do slide" />
        <Input value={slide.template_suggestion} onChange={(event) => onChange(slide.id, 'template_suggestion', event.target.value)} placeholder="Template sugerido" />
      </div>
    </div>
  );
};

const CarouselBuilder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspace, brandKit } = useWorkspace();
  const brand = useMemo(() => ({ ...DEFAULT_BRAND_KIT, ...brandKit }), [brandKit]);
  const dimensions = getArtboardDimensions('square');
  const preload = location.state as { topic?: string; funnel?: string; recommendedTemplate?: string; arcType?: string } | null;

  const [phase, setPhase] = useState<1 | 2>(1);
  const [topic, setTopic] = useState(preload?.topic || '');
  const [slidesCount, setSlidesCount] = useState(6);
  const [selectedArc, setSelectedArc] = useState(preload?.arcType || CAROUSEL_ARCS[0].id);
  const [slidesPlan, setSlidesPlan] = useState<StoryboardSlide[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [storyboardId, setStoryboardId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const activeSlide = slidesPlan[activeSlideIndex] || null;

  const previewHtml = useMemo(() => {
    if (!activeSlide) return '';
    const template = getTemplate(activeSlide.template_suggestion) || getTemplate(preload?.recommendedTemplate || 'data-insight');
    if (!template) return '';
    return template.renderer({
      headline: activeSlide.headline_draft || activeSlide.role,
      body: activeSlide.notes || 'Edite o storyboard para detalhar o argumento deste slide.',
      cta: /cta|summary|guarantee/i.test(activeSlide.role) ? 'Continue a leitura' : undefined,
      slideNumber: activeSlideIndex + 1,
      totalSlides: slidesPlan.length,
      format: 'square',
    }, brand);
  }, [activeSlide, activeSlideIndex, brand, preload?.recommendedTemplate, slidesPlan.length]);

  const persistStoryboard = async (nextSlides: StoryboardSlide[], nextArc = selectedArc) => {
    if (!workspace?.id) return null;

    const payload = {
      workspace_id: workspace.id,
      arc_type: nextArc,
      slides_plan: nextSlides,
    };

    const query = storyboardId
      ? supabase.from('carousel_storyboards').update(payload).eq('id', storyboardId).select().single()
      : supabase.from('carousel_storyboards').insert(payload).select().single();

    const { data, error } = await query;
    if (error) {
      console.error(error);
      toast.error('Nao foi possivel persistir o storyboard');
      return null;
    }

    const record = data as StoryboardRecord;
    setStoryboardId(record.id);
    return record;
  };

  const handleGenerateStoryboard = async () => {
    if (!workspace?.id || !topic.trim()) {
      toast.error('Defina o topico do carrossel');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-carousel-arc', {
        body: {
          workspace_id: workspace.id,
          topic: topic.trim(),
          funnel_type: preload?.funnel || CAROUSEL_ARCS.find((arc) => arc.id === selectedArc)?.ideal_funnel || 'Educativo',
          slides_count: slidesCount,
        },
      });
      if (error) throw error;

      const responseSlides = Array.isArray(data?.slides_plan) ? data.slides_plan : [];
      const normalizedSlides = responseSlides.map((slide: Record<string, unknown>, index: number) => ({
        id: crypto.randomUUID(),
        role: typeof slide.role === 'string' ? slide.role : `slide_${index + 1}`,
        headline_draft: typeof slide.headline_draft === 'string' ? slide.headline_draft : topic,
        notes: typeof slide.notes === 'string' ? slide.notes : '',
        template_suggestion: typeof slide.template_suggestion === 'string'
          ? slide.template_suggestion
          : preload?.recommendedTemplate || defaultTemplateForRole(typeof slide.role === 'string' ? slide.role : ''),
      }));

      setSlidesPlan(normalizedSlides);
      setSelectedArc(typeof data?.arc_type === 'string' ? data.arc_type : selectedArc);
      setActiveSlideIndex(0);
      setPhase(2);
      await persistStoryboard(normalizedSlides, typeof data?.arc_type === 'string' ? data.arc_type : selectedArc);
      toast.success('Storyboard gerado');
    } catch (error) {
      console.error(error);
      toast.error('Nao foi possivel gerar o storyboard');
    } finally {
      setIsGenerating(false);
    }
  };

  const updateSlide = (id: string, field: keyof StoryboardSlide, value: string) => {
    setSlidesPlan((current) => current.map((slide) => (slide.id === id ? { ...slide, [field]: value } : slide)));
  };

  const removeSlide = (id: string) => {
    setSlidesPlan((current) => current.filter((slide) => slide.id !== id));
    setActiveSlideIndex(0);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSlidesPlan((current) => {
      const oldIndex = current.findIndex((item) => item.id === active.id);
      const newIndex = current.findIndex((item) => item.id === over.id);
      return arrayMove(current, oldIndex, newIndex);
    });
  };

  const handleContinueToDesign = async () => {
    const record = await persistStoryboard(slidesPlan);
    if (!record) return;

    navigate('../generator', {
      state: {
        topic,
        recommendedTemplate: preload?.recommendedTemplate || slidesPlan[0]?.template_suggestion || 'viral-hook',
        storyboard: {
          id: record.id,
          arc_type: record.arc_type,
          slides_plan: slidesPlan,
        },
      },
    });
  };

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-8 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <p className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--text-3)' }}>
            Storyboard Engine
          </p>
          <h1 className="mt-2 text-3xl font-display font-bold" style={{ color: 'var(--text-1)' }}>
            Carousel Builder 2.0
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: 'var(--text-2)' }}>
            Fase 1 define o arco narrativo. Fase 2 organiza o storyboard. A fase final reaproveita o Quick Post
            como engine de design, mantendo um unico write path em posts_v2.
          </p>
        </div>

        {phase === 1 && (
          <div className="p-8 flex justify-center">
            <div className="w-full max-w-5xl rounded-3xl p-8" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="max-w-2xl">
                <h2 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-1)' }}>
                  Escolha o arco narrativo do carrossel
                </h2>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-3)' }}>
                  Cada arco define papel de slide, cadencia emocional e template sugerido.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {CAROUSEL_ARCS.map((arc) => (
                  <button
                    key={arc.id}
                    onClick={() => setSelectedArc(arc.id)}
                    className="rounded-3xl p-5 text-left transition-all"
                    style={{
                      background: selectedArc === arc.id ? 'var(--primary-muted)' : 'var(--bg-card)',
                      border: `1px solid ${selectedArc === arc.id ? 'var(--primary)' : 'var(--border)'}`,
                    }}
                  >
                    <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>{arc.ideal_funnel}</p>
                    <h3 className="mt-2 font-display text-xl font-semibold" style={{ color: 'var(--text-1)' }}>{arc.name}</h3>
                    <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-2)' }}>{arc.description}</p>
                    <p className="mt-4 text-xs" style={{ color: 'var(--text-3)' }}>{arc.slide_roles.length} roles base</p>
                  </button>
                ))}
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-4 items-end">
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Topico</label>
                  <Input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Ex: 5 sinais de que sua marca perdeu clareza" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Slides</label>
                  <Input type="number" min={3} max={10} value={slidesCount} onChange={(event) => setSlidesCount(Math.max(3, Math.min(10, Number(event.target.value) || 6)))} />
                </div>
                <Button onClick={handleGenerateStoryboard} disabled={isGenerating} className="gap-2 h-10" style={{ background: 'var(--primary)', color: '#fff' }}>
                  {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {isGenerating ? 'Gerando...' : 'Gerar storyboard com IA'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {phase === 2 && (
          <div className="p-8 grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
            <div className="rounded-3xl p-5 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>Fase 2</p>
                  <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--text-1)' }}>Storyboard</h2>
                </div>
                <Button variant="outline" onClick={() => setPhase(1)}>Voltar</Button>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={slidesPlan.map((slide) => slide.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {slidesPlan.map((slide, index) => (
                      <SortableStoryboardCard
                        key={slide.id}
                        slide={slide}
                        index={index}
                        isActive={activeSlideIndex === index}
                        onSelect={() => setActiveSlideIndex(index)}
                        onChange={updateSlide}
                        onRemove={removeSlide}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSlidesPlan((current) => ([
                    ...current,
                    {
                      id: crypto.randomUUID(),
                      role: 'extra_slide',
                      headline_draft: '',
                      notes: '',
                      template_suggestion: 'data-insight',
                    },
                  ]))}
                >
                  <Plus size={14} className="mr-2" /> Adicionar slide
                </Button>
                <Button onClick={handleContinueToDesign} style={{ background: 'var(--primary)', color: '#fff' }}>
                  Continuar para design
                </Button>
              </div>
            </div>

            <div className="rounded-3xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="px-6 py-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>Preview do slide ativo</p>
                  <h2 className="mt-1 font-display text-xl font-semibold" style={{ color: 'var(--text-1)' }}>
                    {activeSlide?.headline_draft || activeSlide?.role || 'Sem slide ativo'}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>
                    {selectedArc}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(6,182,212,0.14)', color: '#06B6D4' }}>
                    {activeSlide?.template_suggestion || 'template'}
                  </span>
                </div>
              </div>

              <div className="h-[70vh]">
                <ArtboardStage format="square" className="h-full">
                  {previewHtml ? (
                    <SlideFrame slideHtml={previewHtml} width={dimensions.width} height={dimensions.height} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-50">
                      <Layers size={32} />
                    </div>
                  )}
                </ArtboardStage>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CarouselBuilder;
