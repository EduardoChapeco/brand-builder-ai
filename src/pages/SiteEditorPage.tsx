import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Bot,
  Eye,
  GripVertical,
  Layers,
  Loader2,
  Monitor,
  Plus,
  Save,
  Smartphone,
  Tablet,
  Trash2,
  Layout,
  Settings2,
  ChevronLeft,
  ChevronRight,
  Globe,
  UploadCloud
} from 'lucide-react';
import { toast } from 'sonner';
import WebsiteSectionInspector from '@/components/website/WebsiteSectionInspector';
import WebsiteSectionRenderer from '@/components/website/WebsiteSectionRenderer';
import { useWebsiteBuilder } from '@/hooks/useWebsiteBuilder';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { WEBSITE_SECTION_LIBRARY } from '@/lib/websites/defaults';
import type { WebsitePageRecord, WebsiteSectionRecord, WebsiteSectionType, WebsiteStatus } from '@/lib/websites/types';

type PreviewMode = 'desktop' | 'tablet' | 'mobile';
const SECTION_GROUP_ORDER = ['Topo', 'Conteudo', 'Conversao', 'Custom'] as const;

function SortableSectionRow({ section, selected, onSelect, onRemove }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative overflow-hidden rounded-[20px] p-4 flex items-center gap-4 transition-all ${selected ? 'bg-[#3b82f6]/10 border border-[#3b82f6]' : 'bg-[#111] border border-[#222] hover:bg-[#1a1a1a]'} ${isDragging ? 'opacity-80 scale-[1.02] shadow-2xl z-50' : ''}`}>
      <button {...attributes} {...listeners} className="text-stone-600 hover:text-white transition-colors cursor-grab active:cursor-grabbing"><GripVertical size={20}/></button>
      <button onClick={onSelect} className="flex-1 text-left">
        <p className={`text-sm font-bold ${selected ? 'text-[#3b82f6]' : 'text-stone-300'}`}>{section.section_type.replace('_', ' ').toUpperCase()}</p>
        <p className="text-xs text-stone-500 font-medium">Elemento {section.sort_order + 1}</p>
      </button>
      <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 p-2 text-stone-500 hover:text-red-500 transition-all rounded-full hover:bg-red-500/10">
        <Trash2 size={16}/>
      </button>
    </div>
  );
}

export default function SiteEditorPage() {
  const navigate = useNavigate();
  const { siteId } = useParams<{ siteId: string }>();
  const { workspace, canEdit } = useWorkspace();
  const {
    website, pages, activePage, activePageId, activeSections, selectedSection, selectedSectionId,
    loading, saving, isDirty, setActivePageId, setSelectedSectionId, updateWebsite,
    updatePage, addPage, addSection, updateSection, updateSectionContent, removeSection, reorderSections, save
  } = useWebsiteBuilder(workspace?.id, siteId);
  
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [newPageTitle, setNewPageTitle] = useState('');
  const [leftPaneOpen, setLeftPaneOpen] = useState(true);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const libraryByGroup = useMemo(() => SECTION_GROUP_ORDER.map(g => ({ group: g, items: WEBSITE_SECTION_LIBRARY.filter(i => i.group === g) })), []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = activeSections.findIndex(s => s.id === active.id);
    const newIndex = activeSections.findIndex(s => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    reorderSections(arrayMove(activeSections, oldIndex, newIndex).map(s => s.id));
  };

  const handleSave = async () => {
    const persistedId = await save();
    if (persistedId && siteId === 'new' && workspace?.id) {
      navigate(\`/workspace/\${workspace.id}/site-builder/\${persistedId}\`, { replace: true });
    }
  };

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-stone-500"><Loader2 className="animate-spin" size={32} /></div>;
  if (!website) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white"><p>Website não encontrado.</p></div>;

  return (
    <div className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden">
      
      {/* 
        ======== LEFT PANE: Structure & Modules ======== 
      */}
      <div className={`flex flex-col border-r border-[#1f1f1f] transition-all duration-300 ease-in-out relative ${leftPaneOpen ? 'w-[360px]' : 'w-0 overflow-hidden opacity-0'}`}>
        
        {/* Pages Header */}
        <div className="p-6 border-b border-[#1f1f1f] bg-black/50 backdrop-blur">
          <button onClick={() => navigate('../site-builder')} className="text-stone-500 hover:text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-4 transition-colors">
            <ChevronLeft size={14}/> Voltar aos Projetos
          </button>
          <h2 className="text-xl font-bold bg-gradient-to-r from-white to-stone-500 bg-clip-text text-transparent">Site Structure</h2>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
          
          {/* Pages Manager */}
          <div className="space-y-4">
             <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2"><Globe size={14}/> Rotas & Páginas</h3>
             </div>
             
             <div className="space-y-2">
               {pages.map((p) => (
                 <button key={p.id} onClick={() => setActivePageId(p.id)} className={`w-full text-left p-4 rounded-[16px] border transition-all flex items-center justify-between ${activePageId === p.id ? 'bg-[#3b82f6]/10 border-[#3b82f6] text-white' : 'bg-[#111] border-[#222] text-stone-400 hover:bg-[#1a1a1a]'}`}>
                   <div className="flex flex-col">
                     <span className="text-sm font-bold">{p.title}</span>
                     <span className="text-[10px] font-mono opacity-60 mt-1">{p.slug || '/'}</span>
                   </div>
                   {p.is_home && <div className="px-2 py-1 bg-white/10 rounded-full text-[9px] font-bold uppercase tracking-wider">Home</div>}
                 </button>
               ))}
               
               <div className="flex gap-2 mt-4">
                 <input value={newPageTitle} onChange={e => setNewPageTitle(e.target.value)} placeholder="Nova Página" className="flex-1 bg-transparent border-b border-[#333] text-sm px-2 focus:border-[#3b82f6] outline-none transition-colors" />
                 <button onClick={() => { if(newPageTitle) addPage(newPageTitle, ''); setNewPageTitle('');}} className="p-2 bg-[#111] hover:bg-[#222] border border-[#222] rounded-xl"><Plus size={16}/></button>
               </div>
             </div>
          </div>

          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#222] to-transparent" />

          {/* Section Composer */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2"><Layers size={14}/> Tree View (DOM)</h3>
            {activeSections.length === 0 ? (
              <div className="bg-[#111] rounded-[20px] p-6 text-center border border-dashed border-[#333]">
                <p className="text-xs text-stone-500">Arraste os nós virtuais do <br/><span className="text-[#3b82f6]">Module Library</span> <span className="text-stone-300">➜</span></p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={activeSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {activeSections.map((s) => (
                      <SortableSectionRow key={s.id} section={s} selected={selectedSectionId === s.id} onSelect={() => setSelectedSectionId(s.id)} onRemove={() => removeSection(s.id)} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

        </div>
      </div>

      {/* Expand/Collapse Left Pane Button */}
      <button onClick={() => setLeftPaneOpen(!leftPaneOpen)} className="absolute left-[360px] top-1/2 -translate-y-1/2 -translate-x-1/2 bg-[#111] border border-[#222] w-6 h-12 flex items-center justify-center rounded-full hover:bg-[#222] hover:text-white transition-all z-50 text-stone-500 shadow-xl" style={{ left: leftPaneOpen ? '360px' : '0px', transform: `translate(${leftPaneOpen ? '-50%' : '50%'}, -50%)` }}>
        {leftPaneOpen ? <ChevronLeft size={14}/> : <ChevronRight size={14}/>}
      </button>

      {/* 
        ======== CENTER PANE: Visual Preview / Stage ======== 
      */}
      <div className="flex-1 flex flex-col bg-[#050505] relative z-0">
        
        {/* Top Navbar */}
        <div className="h-[72px] border-b border-[#1f1f1f] bg-black/60 backdrop-blur-2xl flex items-center justify-between px-6">
           <div className="flex items-center gap-4">
             <div className="px-3 py-1 bg-[#111] border border-[#222] rounded-full text-xs font-mono text-stone-400 flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"/>
               {website.name} · {activePage?.title || 'Home'}
             </div>
             {isDirty && <span className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Unsaved changes</span>}
           </div>

           <div className="flex items-center gap-6">
             <div className="flex bg-[#111] border border-[#222] rounded-full p-1">
                {(['desktop', 'tablet', 'mobile'] as PreviewMode[]).map(mode => (
                  <button key={mode} onClick={() => setPreviewMode(mode)} className={`p-2 rounded-full transition-colors ${previewMode === mode ? 'bg-[#3b82f6] text-white shadow-lg' : 'text-stone-500 hover:text-white'}`}>
                    {mode === 'desktop' ? <Monitor size={14}/> : mode === 'tablet' ? <Tablet size={14}/> : <Smartphone size={14}/>}
                  </button>
                ))}
             </div>

             <button onClick={handleSave} disabled={saving || !canEdit} className="bg-white hover:bg-stone-200 text-black font-bold text-sm px-6 py-2.5 rounded-full flex items-center gap-2 transition-transform hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95">
                {saving ? <Loader2 size={16} className="animate-spin"/> : <UploadCloud size={16}/>}
                Push to Production
             </button>
           </div>
        </div>

        {/* Live Canvas Stage */}
        <div className="flex-1 flex flex-col overflow-hidden p-8 background-pattern relative">
          {/* Subtle Grid behind canvas */}
          <div className="absolute inset-0 bg-[url('https://ui.aceternity.com/_next/image?url=%2Fgrid.svg&w=384&q=75')] opacity-20 pointer-events-none mix-blend-screen" />
          
          <div className="flex-1 flex justify-center w-full min-h-full overflow-y-auto no-scrollbar relative z-10">
             {activeSections.length === 0 ? (
                <div className="w-full max-w-2xl mt-32 h-[400px] border border-dashed border-[#333] rounded-[40px] bg-black/40 backdrop-blur flex flex-col items-center justify-center">
                  <Layout size={48} className="text-stone-700 mb-6"/>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-stone-300 to-stone-600 bg-clip-text text-transparent">Canvas Vazio</h2>
                  <p className="text-sm text-stone-500 mt-2 text-center max-w-sm">Use o inspetor lateral para adicionar blocos canônicos compatíveis com a IA.</p>
                </div>
             ) : (
                <div className={`bg-white w-full rounded-[40px] overflow-hidden shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${previewMode === 'desktop' ? 'max-w-[1440px]' : previewMode === 'tablet' ? 'max-w-[768px]' : 'max-w-[430px]'}`}>
                  {activeSections.map(s => (
                    <WebsiteSectionRenderer key={s.id} section={s} previewMode={previewMode} selected={selectedSectionId === s.id} onSelect={() => setSelectedSectionId(s.id)} onUpdateContent={content => updateSectionContent(s.id, content)} />
                  ))}
                </div>
             )}
          </div>
        </div>
      </div>

      {/* 
        ======== RIGHT PANE: Component Library & Inspector ======== 
      */}
      <div className="w-[380px] bg-[#0a0a0a] border-l border-[#1f1f1f] flex flex-col overflow-hidden shrink-0 z-20">
         
         <div className="p-6 border-b border-[#1f1f1f] bg-black">
           <h2 className="text-sm font-bold flex items-center gap-2"><Settings2 size={16}/> Component Inspector</h2>
         </div>

         <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
           
           {!selectedSectionId ? (
             <div className="space-y-6">
                <div className="p-4 rounded-[20px] bg-[#111] border border-[#222]">
                  <h3 className="text-xs font-bold text-stone-400 mb-2">Module Library</h3>
                  <p className="text-[11px] text-stone-600">Clique para injetar no DOM da página atual.</p>
                </div>

                <div className="space-y-6">
                  {libraryByGroup.map(grp => (
                    <div key={grp.group} className="space-y-3">
                      <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">{grp.group}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {grp.items.map(item => (
                          <button key={item.type} onClick={() => addSection(item.type)} disabled={!activePageId} className="p-3 text-left bg-[#111] border border-[#222] hover:border-[#3b82f6] hover:bg-[#3b82f6]/5 rounded-2xl transition-all disabled:opacity-30 disabled:hover:border-[#222]">
                            <p className="text-[11px] font-bold text-white mb-1">{item.label}</p>
                            <p className="text-[9px] text-stone-500 leading-tight block truncate md:whitespace-normal">{item.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
             </div>
           ) : (
             <div className="animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold text-[#3b82f6]">Configurações do Nó</h3>
                  <button onClick={() => setSelectedSectionId(null)} className="text-[10px] uppercase font-bold text-stone-500 hover:text-white px-3 py-1 border border-[#333] rounded-full hover:bg-[#222]">Voltar à Biblioteca</button>
                </div>
                
                {/* O WebsiteSectionInspector original lida com configs avançadas de cada Type, então mantemos a ref dele */}
                <div className="bg-[#111] rounded-[24px] border border-[#222] p-1">
                  <WebsiteSectionInspector
                    website={website}
                    activePage={activePage}
                    selectedSection={selectedSection}
                    canEdit={canEdit}
                    updateWebsite={updateWebsite}
                    updatePage={updatePage}
                    updateSection={updateSection}
                    updateSectionContent={updateSectionContent}
                    onChangeStatus={s => updateWebsite({ status: s as WebsiteStatus })}
                  />
                </div>
             </div>
           )}

         </div>

      </div>

    </div>
  );
}
