import { Suspense } from 'react';
import { ChevronLeft, ChevronRight, Wand2 } from 'lucide-react';
import ArtboardStage from '@/components/canvas/ArtboardStage';
import SlideFrame from '@/components/canvas/SlideFrame';
import { BrandCharacterRecord } from '@/lib/postgenPhase2';
import { SlideConfig } from '@/lib/canvasEngine';
import type { ArtboardFormat } from '@/lib/canvasEngine';

type GeneratorStageProps = {
  postTitle: string;
  activeArcLabel: string | null;
  selectedCharacter: BrandCharacterRecord | null;
  width: number;
  height: number;
  activeSlideIdx: number;
  slideConfigs: SlideConfig[];
  setActiveSlideIdx: (idx: number) => void;
  format: ArtboardFormat;
  setSlideConfigs: (val: SlideConfig[]) => void;
  extractSlideFields: (html: string) => { headline?: string; body?: string; cta?: string };
};

export default function GeneratorStage({
  postTitle, activeArcLabel, selectedCharacter, width, height,
  activeSlideIdx, slideConfigs, setActiveSlideIdx, format, setSlideConfigs, extractSlideFields
}: GeneratorStageProps) {
  const activeSlide = slideConfigs[activeSlideIdx];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#06060A]">
      <div className="flex items-center justify-between px-5 py-3 shrink-0 bg-black/40 border-b border-white/5">
        <div className="flex items-center gap-3">
           <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }} title={postTitle}>{postTitle.length > 50 ? postTitle.slice(0, 50) + '...' : postTitle}</span>
           {activeArcLabel && (
             <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>
               {activeArcLabel}
             </span>
           )}
           {selectedCharacter && (
             <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: 'rgba(6,182,212,0.14)', color: '#06B6D4' }}>
               {selectedCharacter.name}
             </span>
           )}
        </div>
        <div className="flex gap-4 items-center">
           <span className="text-xs opacity-50 font-mono tracking-widest">{width} × {height}</span>
           <div className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold text-white/70">SLIDE {activeSlideIdx + 1} / {slideConfigs.length}</div>
        </div>
      </div>

      <Suspense fallback={<div className="flex-1 flex flex-col items-center justify-center animate-pulse"><Wand2 size={40} className="opacity-20 mb-4"/><p className="text-sm opacity-50">Carregando Visual Engine...</p></div>}>
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
      </Suspense>

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
  );
}
