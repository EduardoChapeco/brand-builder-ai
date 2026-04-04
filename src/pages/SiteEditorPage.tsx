import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, LayoutTemplate, Layers, Settings, Eye, Globe, ChevronLeft, 
  Smartphone, Monitor, Tablet, MousePointer2, Type, Image as ImageIcon, 
  PlusCircle, Trash2, MoveVertical, HelpCircle, Save, Zap
} from 'lucide-react';
import { SwButton, SwBadge, SwInput, SwSpinner } from '@/components/shared/SwComponents';
import { SwHelpSheet } from '@/components/shared/SwHelpSheet';
import { useWebsiteBuilder } from '@/hooks/useWebsiteBuilder';
import { cn } from '@/lib/utils';

export default function SiteEditorPage() {
  const { workspaceId, siteId } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [activeTab, setActiveTab] = useState<'structure' | 'blocks' | 'settings'>('structure');
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const {
    publication,
    sections,
    selectedSection,
    selectedSectionId,
    loading,
    saving,
    isDirty,
    setSelectedSectionId,
    addSection,
    updateSectionContent,
    removeSection,
    save,
    publish,
  } = useWebsiteBuilder(workspaceId, siteId);


  const SITE_HELP = [
    { title: 'Editor de 4 Colunas', description: 'Organize suas páginas à esquerda e edite o conteúdo ao centro.', icon: LayoutTemplate },
    { title: 'Seções Dinâmicas', description: 'Adicione blocos de Hero, CTA e Features com um clique.', icon: PlusCircle },
    { title: 'Injeção de Marca', description: 'As cores do seu Brand Kit são aplicadas automaticamente em cada seção.', icon: Layers }
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0f] flex items-center justify-center z-50">
        <div className="text-center space-y-4">
          <SwSpinner className="w-12 h-12 border-t-[#a855f7]" />
          <p className="text-stone-500 font-bold text-xs uppercase tracking-widest animate-pulse">Iniciando Canvas Canonical...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0a0a0f] flex flex-col z-50 overflow-hidden font-sans">
      {/* Topbar do Editor */}
      <header className="h-16 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between px-6 z-20">
         <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(`/workspace/${workspaceId}/sites`)}
              className="p-2 rounded-xl border border-white/5 bg-white/5 text-stone-500 hover:text-white transition-all"
            >
               <ChevronLeft size={18} />
            </button>
            <div>
               <h1 className="text-sm font-bold text-white tracking-tight">{publication?.name || 'Site Sem Nome'}</h1>
               <span className="text-[9px] text-stone-500 font-bold uppercase tracking-widest">
                 URL: /{publication?.slug || '...' }
               </span>
            </div>
            <SwBadge 
              variant="outline" 
              className={cn(
                "text-[9px]",
                publication?.status === 'published' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
              )}
            >
              {publication?.status === 'published' ? 'Publicado' : 'Rascunho'}
            </SwBadge>
         </div>

         <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
            <button onClick={() => setDevice('desktop')} className={cn("p-2 rounded-xl transition-all", device === 'desktop' ? "bg-white text-black" : "text-stone-500 hover:text-white")}><Monitor size={16} /></button>
            <button onClick={() => setDevice('tablet')} className={cn("p-2 rounded-xl transition-all", device === 'tablet' ? "bg-white text-black" : "text-stone-500 hover:text-white")}><Tablet size={16} /></button>
            <button onClick={() => setDevice('mobile')} className={cn("p-2 rounded-xl transition-all", device === 'mobile' ? "bg-white text-black" : "text-stone-500 hover:text-white")}><Smartphone size={16} /></button>
         </div>

         <div className="flex items-center gap-3">
            <button className="p-2 text-stone-500 hover:text-white transition-all" onClick={() => setIsHelpOpen(true)}><HelpCircle size={20} /></button>
            
            <SwButton 
              variant="ghost" 
              className={cn("h-10 text-stone-400 border-white/5", isDirty && "text-[#a855f7]")}
              onClick={() => save()}
              disabled={saving}
              isLoading={saving}
            >
               <Save size={16} /> 
               {isDirty ? 'Salvar Alterações' : 'Salvo'}
            </SwButton>

            <SwButton 
              variant="primary" 
              className="h-10 bg-[#a855f7] text-white px-6 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-[#a855f7]/20 hover:scale-[1.02] active:scale-95 transition-all"
              onClick={() => publish()}
              disabled={saving}
              isLoading={saving}
            >
               <Globe size={16} /> Publicar Site
            </SwButton>

         </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Coluna 1 & 2: Toolbar e Estrutura */}
        <aside className="w-80 border-r border-white/5 bg-black/20 backdrop-blur-md flex flex-col z-10 shadow-2xl">
           <div className="flex border-b border-white/5 p-1 m-4 bg-white/5 rounded-2xl">
              <button 
                onClick={() => setActiveTab('structure')} 
                className={cn("flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all", activeTab === 'structure' ? "bg-white text-black shadow-lg" : "text-stone-500 hover:text-white")}
              >
                 <Layers size={14} className="mx-auto mb-1" /> Estrutura
              </button>
              <button 
                onClick={() => setActiveTab('blocks')} 
                className={cn("flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all", activeTab === 'blocks' ? "bg-white text-black shadow-lg" : "text-stone-500 hover:text-white")}
              >
                 <Plus size={14} className="mx-auto mb-1" /> Blocos
              </button>
           </div>

           <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
              {activeTab === 'structure' ? (
                <div className="space-y-4">
                   <h3 className="text-[10px] font-bold text-stone-600 uppercase tracking-widest">Camadas da Página</h3>
                   <div className="space-y-2">
                      {sections.map((section) => (
                        <div 
                          key={section.id} 
                          onClick={() => setSelectedSectionId(section.id)}
                          className={cn(
                            "group p-4 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-between cursor-pointer hover:border-[#a855f7]/50 transition-all",
                            selectedSectionId === section.id && "border-[#a855f7] bg-[#a855f7]/5"
                          )}
                        >
                           <div className="flex items-center gap-3">
                              <MoveVertical size={14} className="text-stone-700" />
                              <div>
                                 <h4 className="text-xs font-bold text-white capitalize">{section.section_type.replace('-', ' ')}</h4>
                                 <span className="text-[9px] text-stone-500 uppercase font-black">ID: {section.id.slice(0, 8)}</span>
                              </div>
                           </div>
                           <SwBadge variant="outline" className="text-[8px] opacity-0 group-hover:opacity-100 transition-opacity">Editar</SwBadge>
                        </div>
                      ))}
                   </div>
                   <SwButton 
                     variant="ghost" 
                     className="w-full h-10 border-dashed border-white/10 text-stone-500 hover:text-white"
                     onClick={() => setActiveTab('blocks')}
                   >
                      <PlusCircle size={16} /> Nova Seção
                   </SwButton>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                   {['hero', 'features', 'testimonials', 'pricing', 'cta', 'contact', 'faq', 'footer'].map(type => (
                     <div 
                       key={type} 
                       onClick={() => addSection(type)}
                       className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-[#a855f7] transition-all text-center group cursor-pointer"
                     >
                        <div className="w-10 h-10 bg-white/5 rounded-xl border border-white/5 mx-auto mb-2 flex items-center justify-center text-stone-500 group-hover:text-[#a855f7] transition-colors">
                           <LayoutTemplate size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest group-hover:text-white transition-colors">{type}</span>
                     </div>
                   ))}
                </div>
              )}
           </div>
        </aside>

        {/* Coluna 3: Canvas */}
        <section className="flex-1 bg-stone-900/50 relative overflow-hidden flex flex-col items-center justify-center p-8 lg:p-16">
           <div 
             className={cn(
               "bg-[#0a0a0f] rounded-3xl shadow-2xl overflow-y-auto no-scrollbar transition-all duration-300 ring-1 ring-white/10",
               device === 'desktop' ? "w-full max-w-5xl h-full" : device === 'tablet' ? "w-[768px] h-full" : "w-[390px] h-[844px]"
             )}
           >
              {/* Site Content Simulation */}
              <div className="w-full">
                 {sections.length === 0 ? (
                   <div className="p-12 text-center space-y-6">
                      <div className="animate-pulse flex flex-col items-center gap-4">
                         <div className="w-20 h-1 bg-[#a855f7] rounded-full mx-auto" />
                         <h2 className="text-4xl lg:text-6xl font-black text-white tracking-tighter">O Site Está Ganhando Vida</h2>
                         <p className="text-xl text-stone-400 max-w-2xl mx-auto">Adicione blocos à esquerda para começar a construir seu site canônico.</p>
                      </div>
                   </div>
                 ) : (
                   <div className="divide-y divide-white/5">
                      {sections.map((section) => (
                        <div 
                          key={section.id} 
                          className={cn(
                            "p-12 transition-all relative group",
                            selectedSectionId === section.id && "bg-[#a855f7]/5"
                          )}
                        >
                           <div className="space-y-4">
                              <h2 className="text-3xl font-black text-white" style={{ color: 'var(--sw-primary)' }}>{section.content.headline as string || 'Sem Título'}</h2>
                              <p className="text-stone-400" style={{ fontFamily: 'var(--sw-font-body)' }}>{section.content.subheadline as string || 'Sem subtítulo.'}</p>
                           </div>
                           
                           {section.section_type === 'features' && (
                             <div className="grid grid-cols-3 gap-4 mt-8">
                                {[1,2,3].map(i => (
                                  <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/5" style={{ borderRadius: 'var(--sw-radius)' }}>
                                    <div className="w-10 h-10 bg-[var(--sw-accent)]/20 rounded-xl flex items-center justify-center text-[var(--sw-accent)] mb-4"><Zap size={18} /></div>
                                    <h4 className="text-white font-bold text-sm">Feature {i}</h4>
                                  </div>
                                ))}
                             </div>
                           )}
                           
                           {/* Overlay de edição rápida */}
                           <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                              <SwButton variant="ghost" size="sm" onClick={() => setSelectedSectionId(section.id)}>Configurar</SwButton>
                           </div>
                        </div>
                      ))}
                   </div>
                 )}
              </div>
           </div>
           
           {/* Floating Tools Bottons */}
           <div className="fixed bottom-12 bg-black/60 backdrop-blur-2xl border border-white/10 p-2 rounded-2xl flex gap-1 shadow-2xl z-30 ring-1 ring-white/10">
              <button className="p-3 text-stone-500 hover:text-white transition-all"><MousePointer2 size={18} /></button>
              <button className="p-3 text-[#a855f7] bg-[#a855f7]/10 rounded-xl transition-all"><Type size={18} /></button>
              <button className="p-3 text-stone-500 hover:text-white transition-all"><ImageIcon size={18} /></button>
              <button className="p-3 text-stone-500 hover:text-white transition-all"><Settings size={18} /></button>
           </div>
        </section>

        {/* Coluna 4: Inspeção */}
        <aside className={cn("w-80 border-l border-white/5 bg-black/20 backdrop-blur-md flex flex-col z-10 transition-all", selectedSectionId ? "mr-0" : "-mr-80")}>
           <div className="p-6 border-b border-white/5">
              <div className="flex items-center justify-between mb-4">
                 <h2 className="text-sm font-bold text-white uppercase tracking-widest">Inspetor</h2>
                 <button onClick={() => setSelectedSectionId(null)} className="text-stone-500 hover:text-white"><Plus size={18} className="rotate-45" /></button>
              </div>
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">
                Editando: {selectedSection?.section_type}
              </p>
           </div>

           {selectedSection && (
             <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                <section className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest ml-1">Título</label>
                      <SwInput 
                        value={selectedSection.content.headline as string || ''} 
                        onChange={(e) => updateSectionContent(selectedSection.id, { headline: e.target.value })}
                        className="bg-white/5 border-white/10 rounded-xl" 
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest ml-1">Subtítulo</label>
                      <SwInput 
                        value={selectedSection.content.subheadline as string || ''} 
                        onChange={(e) => updateSectionContent(selectedSection.id, { subheadline: e.target.value })}
                        className="bg-white/5 border-white/10 rounded-xl" 
                      />
                   </div>
                </section>

                <section className="space-y-4">
                   <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Ações da Seção</label>
                   <div className="space-y-2">
                     <SwButton 
                       variant="ghost" 
                       className="w-full h-10 border-white/5 text-stone-400"
                       onClick={() => setSelectedSectionId(null)}
                     >
                       Concluir Edição
                     </SwButton>
                   </div>
                </section>

                <section className="pt-8 space-y-4">
                   <SwButton 
                     variant="ghost" 
                     className="w-full border-red-500/20 text-red-500 hover:bg-red-500/10"
                     onClick={() => removeSection(selectedSection.id)}
                   >
                      <Trash2 size={16} /> Excluir Seção
                   </SwButton>
                </section>
             </div>
           )}
        </aside>
      </main>

      <SwHelpSheet 
        isOpen={isHelpOpen} 
        onClose={() => setIsHelpOpen(false)} 
        moduleName="SITE BUILDER CANVAS" 
        sections={SITE_HELP} 
      />

      {/* Overlay de Salvamento */}
      {saving && (
        <div className="fixed bottom-6 right-6 bg-[#a855f7] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-bounce z-50">
           <SwSpinner className="w-4 h-4 border-t-white" /> Sincronizando com o Banco Canônico...
        </div>
      )}
    </div>
  );
}


