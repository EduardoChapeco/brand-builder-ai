import { Search, RefreshCw, X, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { ArtboardFormat, ArtboardDimension, BgSource, VisMod } from '@/lib/canvasEngine';
import { TEMPLATE_REGISTRY, getTemplate } from '@/lib/templateRegistry';
import { BrandCharacterRecord, MediaAssetRecord } from '@/lib/postgenPhase2';
import type { Tone, Funnel, RssTopic } from './GeneratorTypes';

type GeneratorWizardProps = {
  wizardStep: 1 | 2 | 3 | 4;
  setWizardStep: (s: 1 | 2 | 3 | 4) => void;
  topic: string;
  setTopic: (t: string) => void;
  setSelectedSourceUrl: (url: string | undefined) => void;
  isFetchingRss: boolean;
  handleFetchRss: () => void;
  showRssPanel: boolean;
  setShowRssPanel: (show: boolean) => void;
  rssTopics: RssTopic[];
  format: ArtboardFormat;
  setFormat: (fmt: ArtboardFormat) => void;
  FORMAT_OPTIONS: Array<[ArtboardFormat, ArtboardDimension]>;
  slideCount: number;
  setSlideCount: (n: number) => void;
  globalImageMethod: BgSource;
  setGlobalImageMethod: (m: BgSource) => void;
  globalTemplate: string;
  setGlobalTemplate: (t: string) => void;
  clonedDna: { id: string; html: string; name: string } | null;
  recommendedTemplateId: string | null;
  selectedCharacterId: string;
  setSelectedCharacterId: (id: string) => void;
  availableCharacters: BrandCharacterRecord[];
  selectedCharacter: BrandCharacterRecord | null;
  preloadedMediaAsset: MediaAssetRecord | null;
  handleGenerate: () => void;
  genStep: string;
};

export default function GeneratorWizard({
  wizardStep, setWizardStep, topic, setTopic, setSelectedSourceUrl,
  isFetchingRss, handleFetchRss, showRssPanel, setShowRssPanel, rssTopics,
  format, setFormat, FORMAT_OPTIONS,
  slideCount, setSlideCount,
  globalImageMethod, setGlobalImageMethod,
  globalTemplate, setGlobalTemplate, clonedDna, recommendedTemplateId,
  selectedCharacterId, setSelectedCharacterId, availableCharacters, selectedCharacter,
  preloadedMediaAsset, handleGenerate, genStep
}: GeneratorWizardProps) {
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
                       <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-3)' }}>
                         <span>{t.source_name}</span>
                         {t.source_type && (
                           <span className="px-1.5 py-0.5 rounded-full" style={{ background: t.source_type === 'ai' ? 'var(--primary-muted)' : 'rgba(6,182,212,0.14)', color: t.source_type === 'ai' ? 'var(--primary)' : '#06B6D4' }}>
                             {t.source_type.toUpperCase()}
                           </span>
                         )}
                         {typeof t.trend_score === 'number' && (
                           <span className="px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.14)', color: '#F59E0B' }}>
                             Trend {t.trend_score}
                           </span>
                         )}
                       </div>
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
                    <button onClick={() => setGlobalImageMethod('ai')} className={`flex-1 py-2 rounded-lg border text-xs flex items-center justify-center gap-1 transition-all ${globalImageMethod==='ai'?'border-purple-500 bg-purple-500/10 text-purple-400':'border-white/10'}`}>IA (Recomendado)</button>
                    <button onClick={() => setGlobalImageMethod('upload')} className={`flex-1 py-2 rounded-lg border text-xs flex items-center justify-center gap-1 transition-all ${globalImageMethod==='upload'?'border-purple-500 bg-purple-500/10 text-purple-400':'border-white/10'}`}>⬆ Upload (Mais Tarde)</button>
                    <button onClick={() => setGlobalImageMethod('none')} className={`flex-1 py-2 rounded-lg border text-xs flex items-center justify-center gap-1 transition-all ${globalImageMethod==='none'?'border-purple-500 bg-purple-500/10 text-purple-400':'border-white/10'}`}>Nenhuma</button>
                 </div>
                 <p className="text-[10px] mt-2 opacity-50 text-center">Obs: você poderá customizar individualmente por slide depois.</p>
              </div>

              <div>
                 <p className="text-sm font-semibold mb-2">Design Master (Para Todos)</p>
                 <select value={globalTemplate} onChange={e => setGlobalTemplate(e.target.value)} className="w-full p-2.5 rounded-lg border text-sm outline-none" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <option value="auto">🪄 Modo Automático (Mix Inteligente IA)</option>
                    {clonedDna && <option value="dna-clone">DNA CLONADO ({clonedDna.name})</option>}
                    {TEMPLATE_REGISTRY.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                 </select>
                 {recommendedTemplateId && (
                   <p className="text-[11px] mt-2" style={{ color: 'var(--text-3)' }}>
                     Template recomendado: <span style={{ color: 'var(--primary)' }}>{getTemplate(recommendedTemplateId)?.name || recommendedTemplateId}</span>
                   </p>
                 )}
              </div>

              <div>
                 <p className="text-sm font-semibold mb-2">Brand Character (Opcional)</p>
                 <select value={selectedCharacterId} onChange={e => setSelectedCharacterId(e.target.value)} className="w-full p-2.5 rounded-lg border text-sm outline-none" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <option value="none">Nenhum personagem</option>
                    {availableCharacters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}
                 </select>
                 {selectedCharacter && (
                   <p className="text-[11px] mt-2" style={{ color: 'var(--text-3)' }}>
                     Persona ativa: <span style={{ color: 'var(--primary)' }}>{selectedCharacter.name}</span>
                   </p>
                 )}
              </div>

              {preloadedMediaAsset && (
                <div className="p-4 rounded-xl border border-white/10 bg-black/10">
                  <p className="text-sm font-semibold mb-2">Asset conectado</p>
                  <div className="flex items-center gap-3">
                    <img src={preloadedMediaAsset.public_url} alt="Media asset" className="w-14 h-14 rounded-xl object-cover" />
                    <div>
                      <p className="text-sm" style={{ color: 'var(--text-1)' }}>{preloadedMediaAsset.module}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>Este asset sera usado como base visual do post.</p>
                    </div>
                  </div>
                </div>
              )}

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
