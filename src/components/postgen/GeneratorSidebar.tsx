import { Trash } from 'lucide-react';
import SlideFrame from '@/components/canvas/SlideFrame';
import { getTemplate } from '@/lib/templateRegistry';
import { SlideConfig } from '@/lib/canvasEngine';

type GeneratorSidebarProps = {
  slideConfigs: SlideConfig[];
  setSlideConfigs: (val: SlideConfig[] | ((prev: SlideConfig[]) => SlideConfig[])) => void;
  activeSlideIdx: number;
  setActiveSlideIdx: (idx: number) => void;
  width: number;
  height: number;
  createSlideConfig: any;
  renderSlideConfig: (cfg: SlideConfig, index: number, total: number) => string;
};

export default function GeneratorSidebar({
  slideConfigs, setSlideConfigs, activeSlideIdx, setActiveSlideIdx,
  width, height, createSlideConfig, renderSlideConfig
}: GeneratorSidebarProps) {
  return (
    <div className="panel-left flex flex-col h-full" style={{ width: 220, minWidth: 220, borderRight: '1px solid var(--border)' }}>
      <div className="panel-section mb-0 flex-1 flex flex-col h-full overflow-hidden p-4">
        <p className="text-[10px] uppercase font-bold tracking-widest opacity-60 mb-3 shrink-0">Visão Geral (Slides)</p>
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
           {slideConfigs.map((cfg, idx) => {
             const thumbContainerWidth = 200;
             const thumbScale = thumbContainerWidth / width;
             return (
             <button key={cfg.id || idx} onClick={() => setActiveSlideIdx(idx)} className="relative group text-left w-full rounded-xl overflow-hidden transition-all shrink-0"
                     style={{ border: `2px solid ${activeSlideIdx === idx ? 'var(--primary)' : 'var(--border)'}`, padding: '2px', background: activeSlideIdx === idx ? 'var(--primary-muted)' : 'transparent' }}>
                <div className="w-full bg-black rounded-lg overflow-hidden relative pointer-events-none" style={{ aspectRatio: `${width}/${height}` }}>
                    {cfg.html && (
                       <div style={{ position: 'absolute', transform: `scale(${thumbScale})`, transformOrigin: 'top left', pointerEvents: 'none', width: `${width}px`, height: `${height}px`, top: 0, left: 0 }}>
                          <SlideFrame slideHtml={cfg.html} width={width} height={height} />
                       </div>
                    )}
                </div>
                <span className="absolute top-2 left-2 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded-sm font-bold">{idx + 1}</span>
                <div className="pt-2 pb-1 px-1 flex justify-between items-center opacity-70 group-hover:opacity-100">
                   <span className="text-[10px] truncate">{getTemplate(cfg.templateId)?.name || 'Customizado'}</span>
                </div>
                {slideConfigs.length > 1 && activeSlideIdx === idx && (
                   <div onClick={(e) => { e.stopPropagation(); setSlideConfigs(prev => { const n = [...prev]; n.splice(idx, 1); return n; }); setActiveSlideIdx(Math.max(0, idx - 1)); }}
                      className="absolute bottom-2 right-2 bg-red-500/20 text-red-400 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash size={12} />
                   </div>
                )}
             </button>
           )})}

           <button onClick={() => {
              const activeSlide = slideConfigs[activeSlideIdx];
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
  );
}
