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
import WebsiteSectionRenderer from '@/components/website/WebsiteSectionRenderer';
import WebsiteSectionInspector from '@/components/website/WebsiteSectionInspector';
import type { WebsiteSectionRecord } from '@/lib/websites/types';
import type { PublicationSection } from '@/types/app.types';

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

  const mapSectionToRecord = (s: PublicationSection): WebsiteSectionRecord => ({
    id: s.id,
    section_type: s.section_type,
    content: s.content,
    bg_type: (s.styles?.bg_type as any) || 'color',
    bg_value: (s.styles?.bg_value as any) || null,
    padding_top: (s.styles?.padding_top as any) || 'md',
    padding_bottom: (s.styles?.padding_bottom as any) || 'md',
    scroll_animation: (s.styles?.scroll_animation as any) || 'none',
    is_visible: s.is_active,
    version: 1
  });

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[var(--surface-app)] flex items-center justify-center z-50">
        <div className="text-center space-y-4">
          <SwSpinner className="w-12 h-12 border-t-[#a855f7]" />
          <p className="text-stone-500 font-bold text-xs uppercase tracking-widest animate-pulse">Iniciando Canvas Canonical...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[var(--surface-app)] flex flex-col z-50 overflow-hidden font-sans">
      {/* Topbar do Editor */}
      <header className="h-16 border-b border-[var(--border)] bg-[var(--surface-app)]/40 backdrop-blur-xl flex items-center justify-between px-6 z-20">
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
            <button 
              className="p-2 text-stone-500 hover:text-white transition-all flex items-center gap-2" 
              onClick={() => {
                if (publication?.slug) window.open(`${window.location.origin}/s/${publication.slug}`, '_blank');
              }}
            >
              <Eye size={18} />
              <span className="text-[10px] uppercase font-bold tracking-widest hidden lg:block">Pre-Visualizar</span>
            </button>

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
        <aside className="w-80 border-r border-[var(--border)] bg-[var(--surface-app)]/20 backdrop-blur-md flex flex-col z-10 shadow-2xl">
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

        {/* Coluna 3: Canvas — Visual Renderer Engine */}
        <section className="flex-1 bg-stone-900/40 relative overflow-hidden flex flex-col items-center justify-center p-8 lg:p-16">
           <div 
             className={cn(
               "bg-[#0a0a0f] rounded-3xl shadow-2xl overflow-y-auto no-scrollbar transition-all duration-300 ring-1 ring-white/10",
               device === 'desktop' ? "w-full max-w-5xl h-full" : device === 'tablet' ? "w-[768px] h-full" : "w-[390px] h-844px]"
             )}
           >
              <div className="w-full">
                 {sections.length === 0 ? (
                   <div className="p-12 text-center py-32 space-y-6">
                      <div className="animate-pulse flex flex-col items-center gap-4">
                         <div className="w-20 h-1 bg-[#a855f7] rounded-full mx-auto" />
                         <h2 className="text-4xl lg:text-6xl font-black text-white tracking-tighter">O Site Está Ganhando Vida</h2>
                         <p className="text-xl text-stone-400 max-w-2xl mx-auto">Adicione blocos à esquerda para começar a construir seu site canônico.</p>
                      </div>
                   </div>
                 ) : (
                   <div className="w-full">
                      {sections.map(section => (
                        <WebsiteSectionRenderer
                          key={section.id}
                          section={mapSectionToRecord(section)}
                          previewMode={device}
                          selected={selectedSectionId === section.id}
                          onSelect={() => setSelectedSectionId(section.id)}
                          onUpdateContent={(patch) => updateSectionContent(section.id, patch)}
                        />
                      ))}
                   </div>
                 )}
              </div>
           </div>

           {/* Ferramentas Flutuantes Simples */}
           <div className="fixed bottom-12 bg-black/60 backdrop-blur-2xl border border-white/10 p-2 rounded-2xl flex gap-1 shadow-2xl z-30 ring-1 ring-white/10">
              <button className="p-3 text-stone-500 hover:text-white transition-all"><MousePointer2 size={18} /></button>
              <button className="p-3 text-[#a855f7] bg-[#a855f7]/10 rounded-xl transition-all"><Type size={18} /></button>
              <button className="p-3 text-stone-500 hover:text-white transition-all"><ImageIcon size={18} /></button>
              <button className="p-3 text-stone-500 hover:text-white transition-all"><Settings size={18} /></button>
           </div>
        </section>

        {/* Coluna 4: Inspector sidepanel */}
        <aside className={cn(
          "w-[340px] lg:w-[420px] border-l border-white/5 bg-[var(--surface-app)] flex flex-col z-10 overflow-y-auto no-scrollbar py-6 transition-all",
          selectedSectionId ? "mr-0" : "-mr-[425px]"
        )}>
           {publication && (
             <div className="px-6">
                <WebsiteSectionInspector
                  website={publication as any}
                  activePage={null}
                  selectedSection={selectedSection ? mapSectionToRecord(selectedSection) : null}
                  canEdit={true}
                  updateWebsite={(patch) => {}} 
                  updatePage={() => {}}
                  updateSection={(id, patch) => updateSection(id, patch as any)}
                  updateSectionContent={(id, patch) => updateSectionContent(id, patch)}
                  onChangeStatus={() => {}}
                />
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


