import { LayoutTemplate, FileImage, Type, Settings2, AlignLeft, AlignCenter, AlignRight, Trash, X, Wand2, RefreshCw, Upload, Download, Film, ExternalLink, Save } from 'lucide-react';
import { toast } from 'sonner';
import SimlabReviewPanel from '@/components/ai/SimlabReviewPanel';
import VideoJobStatusCard from '@/components/video/VideoJobStatusCard';
import { TEMPLATE_REGISTRY, getTemplate } from '@/lib/templateRegistry';
import { BrandCharacterRecord } from '@/lib/postgenPhase2';
import { SlideConfig } from '@/lib/canvasEngine';
import type { VisMod } from '@/lib/canvasEngine';

type GeneratorInspectorProps = {
  activeTab: 'visual' | 'media' | 'text' | 'export';
  setActiveTab: (t: 'visual' | 'media' | 'text' | 'export') => void;
  simlabRun: any;
  simlabInsight: any;
  simlabVariants: any;
  simlabLoading: boolean;
  simlabError: string | null;
  refreshSimlabRun: () => void;
  selectedNode: any;
  handleStyleUpdate: (updates: any) => void;
  brand: any;
  activeSlide: SlideConfig;
  activeSlideIdx: number;
  recommendedTemplateId: string | null;
  selectedCharacter: BrandCharacterRecord | null;
  availableCharacters: BrandCharacterRecord[];
  selectedCharacterId: string;
  setSelectedCharacterId: (id: string) => void;
  VIS_MODES: Array<{ id: VisMod; label: string }>;
  updateSlideConfig: (idx: number, updates: Partial<SlideConfig>) => void;
  clonedDna: { id: string; html: string; name: string } | null;
  isGenImg: boolean;
  handleBgGenForActiveSlide: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  caption: string;
  setCaption: (vs: string) => void;
  hashtags: string[];
  removeHashtag: (tag: string) => void;
  width: number;
  height: number;
  postTitle: string;
  exportSlide: any;
  exportAllSlides: any;
  exportSlidesPDF: any;
  exportSlidesHTML: any;
  slideConfigs: SlideConfig[];
  isLaunchingRemotion: boolean;
  handleAnimateWithRemotion: () => void;
  remotionJobId: string | null;
  remotionCompositionId: string | null;
  remotionResultUrl: string | null;
  remotionStatusPayload: any;
  refreshRemotionJob: () => void;
  isSavingLibrary: boolean;
  handleSaveToLibrary: () => void;
  setWizardStep: (s: 1 | 2 | 3 | 4) => void;
};

export default function GeneratorInspector({
  activeTab, setActiveTab, simlabRun, simlabInsight, simlabVariants, simlabLoading, simlabError, refreshSimlabRun,
  selectedNode, handleStyleUpdate, brand, activeSlide, activeSlideIdx, recommendedTemplateId,
  selectedCharacter, availableCharacters, selectedCharacterId, setSelectedCharacterId, VIS_MODES,
  updateSlideConfig, clonedDna, isGenImg, handleBgGenForActiveSlide, fileInputRef,
  caption, setCaption, hashtags, removeHashtag, width, height, postTitle, exportSlide, exportAllSlides,
  exportSlidesPDF, exportSlidesHTML, slideConfigs, isLaunchingRemotion, handleAnimateWithRemotion,
  remotionJobId, remotionCompositionId, remotionResultUrl, remotionStatusPayload, refreshRemotionJob,
  isSavingLibrary, handleSaveToLibrary, setWizardStep
}: GeneratorInspectorProps) {
  return (
    <div className="panel-right flex flex-col h-full" style={{ width: 280, minWidth: 280, borderLeft: '1px solid var(--border)' }}>
        <div className="border-b p-4 shrink-0" style={{ borderColor: 'var(--border)' }}>
            <SimlabReviewPanel
              title="SimLab Gate"
              run={simlabRun}
              insight={simlabInsight}
              variants={simlabVariants}
              loading={simlabLoading}
              error={simlabError}
              onRefresh={simlabRun?.id ? refreshSimlabRun : undefined}
            />
        </div>
        <div className="flex border-b text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ borderColor: 'var(--border)' }}>
            <button onClick={() => setActiveTab('visual')} className={`flex-1 py-3.5 flex flex-col items-center gap-1.5 border-b-2 transition-colors ${activeTab==='visual'?'border-purple-500 text-purple-400':'border-transparent text-[color:var(--text-3)] hover:bg-white/5'}`}><LayoutTemplate size={14}/>Visual</button>
            <button onClick={() => setActiveTab('media')} className={`flex-1 py-3.5 flex flex-col items-center gap-1.5 border-b-2 transition-colors ${activeTab==='media'?'border-purple-500 text-purple-400':'border-transparent text-[color:var(--text-3)] hover:bg-white/5'}`}><FileImage size={14}/>Mídia</button>
            <button onClick={() => setActiveTab('text')} className={`flex-1 py-3.5 flex flex-col items-center gap-1.5 border-b-2 transition-colors ${activeTab==='text'?'border-purple-500 text-purple-400':'border-transparent text-[color:var(--text-3)] hover:bg-white/5'}`}><Type size={14}/>Texto</button>
            <button onClick={() => setActiveTab('export')} className={`flex-1 py-3.5 flex flex-col items-center gap-1.5 border-b-2 transition-colors ${activeTab==='export'?'border-purple-500 text-purple-400':'border-transparent text-[color:var(--text-3)] hover:bg-white/5'}`}><Settings2 size={14}/>Export</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
            
            {selectedNode && (
                <div className="p-3 rounded-xl mb-4 shrink-0" style={{ background: 'var(--primary-muted)', border: '1px solid var(--primary)' }}>
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
                          {[
                            { label: 'Primária', val: brand?.color_primary },
                            { label: 'Secundária', val: brand?.color_secondary },
                            { label: 'Acento', val: brand?.color_accent },
                            { label: 'Clara', val: brand?.color_text_light },
                            { label: 'Escura', val: brand?.color_text_dark }
                          ].map(c => c.val && (
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

            {activeTab === 'visual' && activeSlide && (
                <>
                  {(recommendedTemplateId || selectedCharacter) && (
                    <div className="flex flex-wrap gap-2">
                      {recommendedTemplateId && (
                        <span className="px-3 py-1 rounded-full text-[11px] font-semibold" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>
                          Recomendado: {getTemplate(recommendedTemplateId)?.name || recommendedTemplateId}
                        </span>
                      )}
                      {selectedCharacter && (
                        <span className="px-3 py-1 rounded-full text-[11px] font-semibold" style={{ background: 'rgba(6,182,212,0.14)', color: '#06B6D4' }}>
                          Character: {selectedCharacter.name}
                        </span>
                      )}
                    </div>
                  )}
                  {availableCharacters.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide opacity-50 mb-3">Brand Character</p>
                      <select value={selectedCharacterId} onChange={e => setSelectedCharacterId(e.target.value)} className="w-full p-2.5 rounded-lg border text-sm outline-none" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                          <option value="none">Nenhum personagem</option>
                          {availableCharacters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}
                      </select>
                    </div>
                  )}
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
                                <span className="text-[9px] font-bold leading-tight mb-1">DNA CLONADO</span>
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
                        <button onClick={() => fileInputRef.current?.click()} className="w-full py-3.5 text-xs font-bold bg-[color:var(--bg-card)] border border-[color:var(--border)] rounded-xl flex justify-center items-center gap-2 hover:bg-white/5 transition-colors">
                          <Upload size={14} /> Fazer Upload
                        </button>
                    </div>
                  </div>
                </>
            )}

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

                    <button
                      disabled={!slideConfigs.length || isLaunchingRemotion}
                      onClick={handleAnimateWithRemotion}
                      className="w-full py-3.5 bg-[color:var(--bg-card)] border border-[color:var(--border)] text-sm font-semibold rounded-xl hover:bg-white/5 flex gap-2 justify-center items-center shadow-sm disabled:opacity-60"
                    >
                      {isLaunchingRemotion ? <RefreshCw className="animate-spin" size={16}/> : <Film size={16}/>}
                      Animar com Remotion
                    </button>

                    <div className="my-2 border-t border-[color:var(--border)]" />

                    {(remotionJobId || remotionCompositionId) && (
                      <div className="space-y-3">
                          {remotionCompositionId ? (
                            <p className="text-[11px] leading-5 text-[color:var(--text-3)]">
                                Composition ativa: <span className="font-mono text-[color:var(--text-2)]">{remotionCompositionId}</span>
                            </p>
                          ) : null}

                          {remotionResultUrl ? (
                            <a
                                href={remotionResultUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full py-3.5 bg-[color:var(--bg-card)] border border-[color:var(--border)] text-sm font-semibold rounded-xl hover:bg-white/5 flex gap-2 justify-center items-center shadow-sm"
                            >
                                <ExternalLink size={16}/> Abrir Render Concluido
                            </a>
                          ) : null}

                          <VideoJobStatusCard
                            title="Remotion Status"
                            job={remotionStatusPayload?.job?.job || null}
                            onRefresh={remotionJobId ? refreshRemotionJob : undefined}
                          />
                      </div>
                    )}

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
  );
}
