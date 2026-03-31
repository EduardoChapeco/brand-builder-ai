import { useState, useCallback, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Wand2, Download, RefreshCw, X, Save, FileImage, LayoutTemplate, Type, Settings2, Trash } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import ArtboardStage from '@/components/canvas/ArtboardStage';
import SlideFrame from '@/components/canvas/SlideFrame';
import { BrandKit, DEFAULT_BRAND_KIT, getPresentationDimensions, PresentationFormat, PresentationSlide, createPresentationSlide } from '@/lib/canvasEngine';
import { PRESENTATION_TEMPLATE_REGISTRY, getPresentationTemplate } from '@/lib/presentationTemplates';
import { exportSlide, exportAllSlides, exportSlidesPDF, exportSlidesHTML } from '@/lib/exportPost';

const FORMATS: { id: PresentationFormat; label: string; aspect: string }[] = [
  { id: '16:9', label: 'Widescreen', aspect: '16:9' },
  { id: '4:3', label: 'Clássico', aspect: '4:3' },
  { id: 'vertical', label: 'Mobile', aspect: '9:16' }
];

const SlidesPage = () => {
  const { workspace, brandKit: wsBrandKit } = useWorkspace();
  const brand: BrandKit = useMemo(() => (wsBrandKit ? { ...DEFAULT_BRAND_KIT, ...wsBrandKit } : DEFAULT_BRAND_KIT), [wsBrandKit]);
  
  // Wizards & Topic
  const [topic, setTopic] = useState('');
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [format, setFormat] = useState<PresentationFormat>('16:9');
  const [slideCount, setSlideCount] = useState(8);
  const [bgPromptHint, setBgPromptHint] = useState('');
  
  // Generating
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStep, setGenStep] = useState('');

  // Core Slides state
  const [slides, setSlides] = useState<PresentationSlide[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  // UI
  const [activeTab, setActiveTab] = useState<'visual' | 'media' | 'text' | 'export'>('visual');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenImg, setIsGenImg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { width, height } = getPresentationDimensions(format);

  const renderHtml = useCallback((s: PresentationSlide, w: number, h: number) => {
    const tpl = getPresentationTemplate(s.layoutId) || PRESENTATION_TEMPLATE_REGISTRY[0];
    return tpl.renderer(s, brand, w, h);
  }, [brand]);

  const updateSlide = (idx: number, updates: Partial<PresentationSlide>) => {
    setSlides(prev => {
      const next = [...prev];
      const updated = { ...next[idx], ...updates };
      updated.html = renderHtml(updated, width, height);
      next[idx] = updated;
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!topic) { toast.error('Digite o tema'); return; }
    setIsGenerating(true);
    setWizardStep(3);
    setGenStep('Estruturando roteiro...');

    try {
      // 1. Gera conteúdo usando a mesma API base ajustada para apresentações (ou mockamos em demo caso falhe)
      const { data, error } = await supabase.functions.invoke('generate-post-content', {
        body: { topic, funnel_type: 'Informativo', format: 'story', slides_count: slideCount, tone: 'Sério' } // we reuse logic
      });
      if (error) throw error;

      setBgPromptHint(data.bg_prompt_hint || topic);
      
      // Map to presentation templates
      const startSlides = data.slides.map((s: any, i: number) => {
         let layoutId = 'content-bullets';
         if (i === 0) layoutId = 'title-hero';
         else if (i === 1) layoutId = 'agenda';
         else if (i === slideCount - 1) layoutId = 'closing-cta';
         else if (i % 3 === 0) layoutId = 'split-image';
         else if (i % 2 === 0) layoutId = 'data-stat';

         return createPresentationSlide({
            layoutId,
            title: s.headline,
            body: s.body,
            cta: s.cta
         });
      });

      // Generate HTMLs
      const withHtml = startSlides.map(s => ({ ...s, html: renderHtml(s, width, height) }));
      setSlides(withHtml);
      setActiveIdx(0);
    } catch(e) {
      toast.warning('Erro (Demo Mod). Fallback aplicado.');
      const demo = Array.from({length: slideCount}).map((_, i) => createPresentationSlide({
         layoutId: i === 0 ? 'title-hero' : 'content-bullets',
         title: i === 0 ? topic : `Ponto ${i}`
      }));
      setSlides(demo.map(s => ({ ...s, html: renderHtml(s, width, height) })));
      setActiveIdx(0);
    } finally {
      setIsGenerating(false);
      setWizardStep(4);
    }
  };

  const activeSlide = slides[activeIdx];

  const handleUploadBg = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') updateSlide(activeIdx, { bgImageUrl: reader.result }); };
    reader.readAsDataURL(file);
  };

  if (wizardStep < 4) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full w-full" style={{ background: 'var(--bg-app)' }}>
         <div className="max-w-xl w-full p-8 rounded-[2rem]" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            {wizardStep === 1 && (
               <div className="animate-in fade-in">
                  <h2 className="text-2xl font-bold mb-2">Apresentação com IA ✨</h2>
                  <p className="text-sm opacity-70 mb-6">Crie slides profissionais em segundos.</p>
                  <textarea value={topic} onChange={e=>setTopic(e.target.value)} rows={3} placeholder="Ex: Pitch de vendas para clientes corporativos..."
                    className="w-full p-4 rounded-xl border bg-black/10 text-sm mb-4 outline-none focus:border-purple-500" style={{ borderColor: 'var(--border)' }}/>
                  <button onClick={()=>topic?setWizardStep(2):toast.error('Preencha')} className="w-full py-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700">Avançar →</button>
               </div>
            )}
            {wizardStep === 2 && (
               <div className="animate-in fade-in slide-in-from-right-8">
                  <h2 className="text-2xl font-bold mb-4">Configuração</h2>
                  
                  <p className="text-sm font-semibold mb-2">Formato</p>
                  <div className="grid grid-cols-3 gap-2 mb-6">
                     {FORMATS.map(f => (
                       <button key={f.id} onClick={()=>setFormat(f.id)} className={`py-3 rounded-lg border text-sm ${format===f.id?'border-purple-500 bg-purple-500/10':'border-white/10'}`}>
                          {f.label} 
                       </button>
                     ))}
                  </div>

                  <p className="text-sm font-semibold mb-2">Quantidade de Slides</p>
                  <div className="flex gap-2 mb-8">
                     {[5, 8, 12, 15].map(n => (
                        <button key={n} onClick={()=>setSlideCount(n)} className={`flex-1 py-2 rounded-lg border ${slideCount===n?'border-purple-500 bg-purple-500/10':'border-white/10'}`}>{n}</button>
                     ))}
                  </div>
                  
                  <div className="flex gap-3">
                     <button onClick={()=>setWizardStep(1)} className="px-6 py-3 border rounded-xl opacity-70 border-white/10">Voltar</button>
                     <button onClick={handleGenerate} className="flex-1 py-3 bg-purple-600 font-bold rounded-xl flex items-center justify-center gap-2 text-white"><Wand2 size={16}/> Gerar Slides</button>
                  </div>
               </div>
            )}
            {wizardStep === 3 && (
               <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="animate-spin text-purple-500 mb-4"><RefreshCw size={32} /></div>
                  <h2 className="text-xl font-bold">{genStep}</h2>
               </div>
            )}
         </div>
      </div>
    );
  }

  return (
    <div className="flex h-full" style={{ background: 'var(--bg-app)' }}>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleUploadBg(e.target.files[0])} />
      
      {/* LEFT: THUMBS */}
      <div className="w-[240px] border-r flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
         <div className="p-4 border-b text-[10px] font-bold tracking-widest uppercase opacity-70" style={{ borderColor: 'var(--border)' }}>Slides</div>
         <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {slides.map((s, idx) => {
               const thumbScale = 120 / width; // fixed width scale
               const calcHeight = height * thumbScale;
               return (
               <button key={s.id} onClick={()=>setActiveIdx(idx)} className="relative group rounded-xl overflow-hidden border-2 text-left transition-all"
                  style={{ borderColor: activeIdx === idx ? 'var(--primary)' : 'var(--border)', padding: 2, background: activeIdx === idx ? 'var(--primary-muted)' : 'transparent' }}>
                  <div className="w-full bg-black rounded-lg overflow-hidden relative pointer-events-none" style={{ height: calcHeight }}>
                     {s.html && <div style={{ transform: `scale(${thumbScale})`, transformOrigin: 'top left' }}><SlideFrame slideHtml={s.html} width={width} height={height} /></div>}
                  </div>
                  <span className="absolute top-2 left-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] text-white">{idx+1}</span>
                  <div className="px-2 py-1 flex justify-between">
                     <span className="text-[10px] opacity-70">Layout: {getPresentationTemplate(s.layoutId)?.name||s.layoutId}</span>
                  </div>
               </button>
            )})}
         </div>
      </div>

      {/* CENTER: CANVAS */}
      <div className="flex-1 flex flex-col bg-[#050508]">
         <div className="p-3 bg-black/40 border-b border-white/5 text-sm font-medium flex justify-between items-center">
            <span>Apresentação - Slide {activeIdx + 1}</span>
            <span className="text-xs opacity-50 font-mono">{width} x {height}</span>
         </div>
         <ArtboardStage format="square" className="flex-1">
             {activeSlide?.html && (
                <SlideFrame slideHtml={activeSlide.html} width={width} height={height} editable />
             )}
         </ArtboardStage>
      </div>

      {/* RIGHT: TABS */}
      <div className="w-[300px] border-l flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
         <div className="flex border-b text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ borderColor: 'var(--border)' }}>
             <button onClick={() => setActiveTab('visual')} className={`flex-1 py-3 border-b-2 flex flex-col items-center gap-1 ${activeTab==='visual'?'border-purple-500 text-purple-400':'border-transparent opacity-50'}`}><LayoutTemplate size={14}/>Layout</button>
             <button onClick={() => setActiveTab('media')} className={`flex-1 py-3 border-b-2 flex flex-col items-center gap-1 ${activeTab==='media'?'border-purple-500 text-purple-400':'border-transparent opacity-50'}`}><FileImage size={14}/>Mídia</button>
             <button onClick={() => setActiveTab('text')} className={`flex-1 py-3 border-b-2 flex flex-col items-center gap-1 ${activeTab==='text'?'border-purple-500 text-purple-400':'border-transparent opacity-50'}`}><Type size={14}/>Texto</button>
             <button onClick={() => setActiveTab('export')} className={`flex-1 py-3 border-b-2 flex flex-col items-center gap-1 ${activeTab==='export'?'border-purple-500 text-purple-400':'border-transparent opacity-50'}`}><Settings2 size={14}/>Expor</button>
         </div>
         
         <div className="flex-1 overflow-y-auto p-5 pb-20">
            {activeTab === 'visual' && activeSlide && (
               <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide opacity-50 mb-3">Layouts</p>
                  <div className="grid grid-cols-2 gap-2">
                     {PRESENTATION_TEMPLATE_REGISTRY.map(t => (
                        <button key={t.id} onClick={()=>updateSlide(activeIdx, { layoutId: t.id })}
                           className={`h-20 rounded-xl border-2 p-2 flex flex-col items-start gap-1 justify-end relative overflow-hidden transition-all ${activeSlide.layoutId === t.id ? 'border-purple-500 shadow-[0_0_15px_rgba(124,58,237,0.3)]' : 'border-white/10'}`}>
                           <div className="absolute inset-0 z-0" style={{ background: t.previewGradient }}/>
                           <span className="text-sm relative z-10">{t.icon}</span>
                           <span className="text-[10px] font-bold truncate w-full text-left relative z-10">{t.name}</span>
                        </button>
                     ))}
                  </div>
               </div>
            )}
            
            {activeTab === 'media' && activeSlide && (
               <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide opacity-50 mb-3">Fundo & Imagens</p>
                  <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 rounded-xl border border-dashed border-white/20 text-xs font-bold flex items-center justify-center gap-2 hover:bg-white/5 transition-colors">
                     <Upload size={14}/> Upload Imagem
                  </button>
                  {activeSlide.bgImageUrl && (
                     <div className="mt-4 relative rounded-xl overflow-hidden border border-white/10">
                        <img src={activeSlide.bgImageUrl} className="w-full object-cover aspect-video" />
                        <button onClick={()=>updateSlide(activeIdx, {bgImageUrl: undefined})} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full hover:bg-red-500 transition-colors"><X size={12} color="white" /></button>
                     </div>
                  )}
               </div>
            )}
            
            {activeTab === 'text' && activeSlide && (
               <div className="flex flex-col gap-4">
                  <div>
                     <p className="text-[11px] font-bold uppercase tracking-wide opacity-50 mb-2">Título / Headline</p>
                     <textarea value={activeSlide.title||''} onChange={e=>updateSlide(activeIdx, {title: e.target.value})} className="w-full p-3 bg-[color:var(--bg-card)] rounded-xl border border-white/10 text-sm outline-none" rows={2}/>
                  </div>
                  <div>
                     <p className="text-[11px] font-bold uppercase tracking-wide opacity-50 mb-2">Corpo / Subtítulo</p>
                     <textarea value={activeSlide.body||''} onChange={e=>updateSlide(activeIdx, {body: e.target.value})} className="w-full p-3 bg-[color:var(--bg-card)] rounded-xl border border-white/10 text-sm outline-none" rows={4}/>
                  </div>
               </div>
            )}
            
            {activeTab === 'export' && (
               <div className="flex flex-col gap-3">
                  <button onClick={async () =>{
                     const b = await exportSlide(activeSlide.html!, `slide_${activeIdx+1}`, width, height);
                     const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `slide_${activeIdx+1}.png`; a.click();
                  }} className="w-full py-3 bg-white/5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border border-white/10 hover:bg-white/10"><Download size={16}/> PNG do Slide Atual</button>
                  
                  <button onClick={()=>{ exportAllSlides(slides.map(c=>c.html!), topic||'apresentacao', width, height); }}
                     className="w-full py-3 bg-white/5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border border-white/10 hover:bg-white/10"><Download size={16}/> ZIP (Todos PNG)</button>
                  
                  <button onClick={()=>{ exportSlidesPDF(slides.map(c=>c.html!), topic||'apresentacao', width, height); }}
                     className="w-full py-3 bg-white/5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border border-white/10 hover:bg-white/10"><Download size={16}/> Baixar PDF</button>

                  <button onClick={()=>{ exportSlidesHTML(slides.map(c=>c.html!), topic||'apresentacao', width, height); }}
                     className="w-full py-3 bg-purple-600/20 text-purple-400 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border border-purple-500/30 hover:bg-purple-600/30"><Download size={16}/> Baixar HTML Navegável ✨</button>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default SlidesPage;
