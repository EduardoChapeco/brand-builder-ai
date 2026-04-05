import { useState, useMemo } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import {
  Smartphone, Monitor, GripVertical, Trash2, Eye, EyeOff, LayoutTemplate, Palette, Globe, Save, UploadCloud, Link as LinkIcon, Settings2, Sparkles, ChevronLeft, ChevronRight, Layers, Bot, Activity, Users, Plus
} from "lucide-react";
import { toast } from "sonner";

import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useBioLinkWorkspace } from "@/hooks/useBioLinkWorkspace";
import { BioLinkRenderer } from "@/components/biolink/BioLinkRenderer";
import { BioLinkBlockInspector } from "@/components/biolink/BioLinkBlockInspector";
import { 
  BIO_LINK_BLOCK_DEFINITIONS, 
  BIO_LINK_THEMES, 
  type BioLinkBlock,
  getBioLinkBlockDefinition
} from "@/lib/biolink/registry";
import { publishBioLink } from "@/lib/biolink/service";

function SortableBlockRow({ block, active, onSelect, onDelete, onToggleVisibility }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const def = getBioLinkBlockDefinition(block.type);

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative overflow-hidden rounded-[20px] p-4 flex items-center gap-4 transition-all ${active ? 'bg-[#3b82f6]/10 border border-[#3b82f6]' : 'bg-[#111] border border-[#222] hover:bg-[#1a1a1a]'} ${isDragging ? 'opacity-80 scale-[1.02] shadow-2xl z-50' : ''}`}>
      <button {...attributes} {...listeners} className="text-stone-600 hover:text-white transition-colors cursor-grab active:cursor-grabbing"><GripVertical size={20}/></button>
      <button onClick={onSelect} className="flex-1 text-left">
         <p className={`text-sm font-bold ${active ? 'text-[#3b82f6]' : 'text-stone-300'} truncate`}>{block.config.title || def.label}</p>
         <p className="text-[10px] uppercase font-bold tracking-widest text-stone-500 mt-1">{def.label}</p>
      </button>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }} className="p-2 text-stone-500 hover:text-white transition-all rounded-full hover:bg-white/10">
          {block.isVisible ? <Eye size={14} /> : <EyeOff size={14} className="text-red-400" />}
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 text-stone-500 hover:text-red-500 transition-all rounded-full hover:bg-red-500/10">
          <Trash2 size={14}/>
        </button>
      </div>
    </div>
  );
}

export default function BioLinkPage() {
  const navigate = useNavigate();
  const { workspace, canEdit } = useWorkspace();
  const { bioLink, blocks, isDirty, isLoading, isSaving, updateBioLink, updateTheme, addBlock, updateBlock, removeBlock, reorderBlocks, toggleBlockVisibility, save } = useBioLinkWorkspace(workspace?.id);

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [leftPaneOpen, setLeftPaneOpen] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const selectedBlock = useMemo(() => blocks.find((b) => b.id === selectedBlockId) || null, [blocks, selectedBlockId]);
  const publicUrl = bioLink?.slug ? `${window.location.origin}/b/${bioLink.slug}` : null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex(b => b.id === active.id);
    const newIndex = blocks.findIndex(b => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    reorderBlocks(arrayMove(blocks, oldIndex, newIndex).map(b => b.id));
  };

  const handlePublish = async () => {
    if (!workspace?.id || !bioLink) return;
    setIsPublishing(true);
    try {
      const savedId = await save();
      const id = savedId || bioLink.id;
      if (id) await publishBioLink(workspace.id, id);
      toast.success("BioLink publicado!", { description: "Seu link mágico está atualizado live." });
    } catch (e) {
      toast.error("Erro ao publicar");
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="flex items-center gap-3 text-stone-400 text-sm"><span className="w-5 h-5 rounded-full border-2 border-[#a855f7] border-t-transparent animate-spin"/> Loading BioLink Engine...</div>
    </div>
  );
  if (!bioLink) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center text-stone-400">
      <p>Workspace sem BioLink ativo. Configure um no painel de Workspace.</p>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden">
      
      {/* 
        ======== LEFT PANE: Structure & Modules ======== 
      */}
      <div className={`flex flex-col border-r border-[#1f1f1f] transition-all duration-300 ease-in-out relative ${leftPaneOpen ? 'w-[360px]' : 'w-0 overflow-hidden opacity-0'}`}>
        
        <div className="p-6 border-b border-[#1f1f1f] bg-black/50 backdrop-blur shrink-0">
          <div className="flex items-center gap-3 mb-2 opacity-70">
            <LinkIcon size={16} className="text-[#a855f7]" /> <span className="text-xs font-semibold tracking-widest uppercase">BioLink Engine</span>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-stone-500 bg-clip-text text-transparent">Árvore de Links</h2>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
           <div className="space-y-4">
             <div className="flex justify-between items-center">
                 <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2"><Globe size={14}/> URL Pública</h3>
             </div>
             {publicUrl ? (
               <a href={publicUrl} target="_blank" rel="noreferrer" className="block text-xs font-mono text-[#3b82f6] hover:text-white p-4 bg-[#111] border border-[#222] hover:border-[#3b82f6] rounded-[16px] transition-all truncate">
                 {publicUrl}
               </a>
             ) : (
               <div className="p-4 bg-[#111] border border-[#222] rounded-[16px] text-xs text-stone-500">
                 Slug não configurado
               </div>
             )}
           </div>

           <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#222] to-transparent" />

           <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2"><Layers size={14}/> Blocos (DOM)</h3>
            {blocks.length === 0 ? (
              <div className="bg-[#111] rounded-[20px] p-6 text-center border border-dashed border-[#333]">
                <p className="text-xs text-stone-500">Adicione blocos pela biblioteca <br/><span className="text-[#a855f7]">na coluna à direita</span> ➜</p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {blocks.map((b) => (
                      <SortableBlockRow 
                        key={b.id} block={b} active={selectedBlockId === b.id} 
                        onSelect={() => setSelectedBlockId(b.id)} onDelete={() => removeBlock(b.id)} onToggleVisibility={() => toggleBlockVisibility(b.id)} 
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>

      </div>

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
               Mobile Preview
             </div>
             {isDirty && <span className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Unsaved changes</span>}
           </div>

           <div className="flex items-center gap-4">
             <button 
               onClick={() => {
                 if (bioLink?.slug) window.open(`${window.location.origin}/b/${bioLink.slug}`, '_blank');
                 else toast.error("Salve o BioLink para gerar o slug!");
               }}
               className="p-2.5 text-stone-400 hover:text-white bg-[#111] hover:bg-[#222] rounded-full transition-all flex items-center gap-2 border border-[#222]"
               title="Pre-Visualizar"
             >
               <Eye size={18}/>
             </button>

             <button onClick={() => navigate('../biolink-crm')} className="px-4 py-2 text-xs font-bold text-stone-400 hover:text-white bg-[#111] hover:bg-[#222] rounded-full transition-all flex items-center gap-2">
               <Users size={14}/> Smart CRM
             </button>
             <button onClick={() => navigate('../biolink-analytics')} className="px-4 py-2 text-xs font-bold text-stone-400 hover:text-white bg-[#111] hover:bg-[#222] rounded-full transition-all flex items-center gap-2">
               <Activity size={14}/> Analytics View
             </button>
             
             <button onClick={handlePublish} disabled={isPublishing || !canEdit} className="bg-white hover:bg-stone-200 text-black font-bold text-sm px-6 py-2.5 rounded-full flex items-center gap-2 transition-transform hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95 ml-2">
                {isPublishing ? <Sparkles size={16} className="animate-spin text-[#a855f7]"/> : <UploadCloud size={16}/>}
                Push Live
             </button>
           </div>
        </div>

        {/* Live Canvas Stage */}
        <div className="flex-1 flex flex-col overflow-hidden p-8 background-pattern relative items-center justify-center">
          <div className="absolute inset-0 bg-[url('https://ui.aceternity.com/_next/image?url=%2Fgrid.svg&w=384&q=75')] opacity-20 pointer-events-none mix-blend-screen" />
          
          {/* Falso Notch Phone */}
          <div className="relative w-full max-w-[400px] h-[800px] bg-black rounded-[50px] shadow-2xl overflow-hidden border-[8px] border-[#222] ring-1 ring-white/5 z-10 flex flex-col">
            <div className="absolute top-0 inset-x-0 h-6 bg-black z-50 rounded-b-[20px] mx-auto w-32 flex justify-center items-end pb-1">
              <div className="w-12 h-1.5 bg-stone-800 rounded-full"/>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar relative w-full h-full">
              <BioLinkRenderer wrapperClassName="min-h-full" profile={bioLink} blocks={blocks.filter(b => b.isVisible)} />
            </div>
          </div>
        </div>
      </div>


      {/* 
        ======== RIGHT PANE: Component Library & Inspector ======== 
      */}
      <div className="w-[380px] bg-[#0a0a0a] border-l border-[#1f1f1f] flex flex-col overflow-hidden shrink-0 z-20">
         
         <div className="p-6 border-b border-[#1f1f1f] bg-black flex gap-4">
           {!selectedBlockId ? (
             <h2 className="text-sm font-bold flex items-center gap-2 text-white"><Settings2 size={16}/> Component Library</h2>
           ) : (
             <>
               <button onClick={() => setSelectedBlockId(null)} className="text-stone-500 hover:text-white transition-colors"><ChevronLeft size={16}/></button>
               <h2 className="text-sm font-bold flex items-center gap-2 text-[#a855f7]">Node Inspector</h2>
             </>
           )}
         </div>

         <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
           
           {!selectedBlockId ? (
             <>
                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2"><Palette size={14}/> Design System</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(BIO_LINK_THEMES).map(([id, theme]) => (
                      <button key={id} onClick={() => updateTheme(id)} className={`p-3 text-left border rounded-2xl transition-all ${bioLink.theme_id === id ? 'bg-[#a855f7]/10 border-[#a855f7]' : 'bg-[#111] border-[#222] hover:bg-[#1a1a1a]'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-4 h-4 rounded-full border border-white/20" style={{ background: theme.cssVars['--primary'] }} />
                          <p className={`text-[11px] font-bold ${bioLink.theme_id === id ? 'text-white' : 'text-stone-400'}`}>{theme.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#222] to-transparent" />

                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2"><Plus size={14}/> Inject Block</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.values(BIO_LINK_BLOCK_DEFINITIONS).map(def => (
                      <button key={def.type} onClick={() => { addBlock(def.type); toast.success('Bloco adicionado'); }} className="p-4 text-left bg-[#111] border border-[#222] hover:border-[#a855f7] hover:bg-[#a855f7]/5 rounded-2xl transition-all flex items-center gap-4">
                        <div className="p-2 bg-[#222] rounded-xl text-stone-400">{def.icon && <def.icon size={16}/>}</div>
                        <div>
                          <p className="text-[12px] font-bold text-white mb-1">{def.label}</p>
                          <p className="text-[10px] text-stone-500 leading-tight">{def.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
             </>
           ) : selectedBlock ? (
             <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
                
                <div className="p-4 bg-[#111] border border-[#222] rounded-[20px]">
                  <Label className="text-[10px] tracking-widest uppercase font-mono text-stone-500 mb-2">Internal Title (DOM)</Label>
                  <Input value={selectedBlock.config.title || ''} onChange={e => updateBlock(selectedBlock.id, { title: e.target.value })} className="bg-black border-[#333] mt-2 font-mono text-xs" />
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] tracking-widest uppercase font-mono text-stone-500">Block Data Configuration</Label>
                  
                  {/* FORMULÁRIO DINÂMICO BASEADO NO DEF DO BLOCO */}
                  {(() => {
                    const def = getBioLinkBlockDefinition(selectedBlock.type);
                    if (!def.formSchema) return <p className="text-xs text-stone-500">Nenhuma configuração extra necessária.</p>;
                    return (
                       <div className="space-y-4">
                         {Object.entries(def.formSchema as Record<string,any>).map(([key, schema]) => (
                            <div key={key} className="space-y-2">
                              <Label className="text-xs font-bold text-stone-300">{schema.label}</Label>
                              {schema.type === 'string' && (
                                <Input value={selectedBlock.config[key] || ''} onChange={e => updateBlock(selectedBlock.id, { [key]: e.target.value })} className="bg-[#111] border-[#333]" />
                              )}
                              {schema.type === 'text' && (
                                <textarea value={selectedBlock.config[key] || ''} onChange={e => updateBlock(selectedBlock.id, { [key]: e.target.value })} rows={4} className="flex min-h-[80px] w-full rounded-md border border-[#333] bg-[#111] px-3 py-2 text-sm text-white resize-none" />
                              )}
                              {schema.type === 'boolean' && (
                                <div className="flex items-center justify-between p-3 bg-[#111] border border-[#333] rounded-xl">
                                  <span className="text-xs text-stone-400">{schema.label} ativo?</span>
                                  <Switch checked={selectedBlock.config[key] === true} onCheckedChange={v => updateBlock(selectedBlock.id, { [key]: v })} />
                                </div>
                              )}
                              {schema.type === 'select' && schema.options && (
                                <select value={selectedBlock.config[key] || ''} onChange={e => updateBlock(selectedBlock.id, { [key]: e.target.value })} className="w-full bg-[#111] border border-[#333] text-sm text-white p-2 rounded-xl">
                                  <option value="">Selecione...</option>
                                  {schema.options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                              )}
                            </div>
                         ))}
                       </div>
                    );
                  })()}
                </div>

                <div className="pt-4 border-t border-[#1f1f1f]">
                  <Label className="text-[10px] tracking-widest uppercase font-mono text-stone-500 mb-2">Danger Zone</Label>
                  <button onClick={() => { removeBlock(selectedBlock.id); setSelectedBlockId(null); }} className="w-full mt-2 py-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors">
                    <Trash2 size={14}/> Excluir Nó Permanentemente
                  </button>
                </div>

             </div>
           ) : null}

         </div>

      </div>

    </div>
  );
}
