import { useState, useEffect } from 'react';
import { 
  Plus, LayoutTemplate, Layers, Settings, Eye, Globe, ChevronLeft, 
  Smartphone, Monitor, Tablet, MousePointer2, Type, Image as ImageIcon, 
  PlusCircle, Trash2, MoveVertical, HelpCircle
} from 'lucide-react';
import { SwButton, SwBadge, SwCard, SwInput, SwSpinner } from '@/components/shared/SwComponents';
import { SwHelpSheet } from '@/components/shared/SwHelpSheet';
import { cn } from '@/lib/utils';

export default function SiteEditorPage() {
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [activeTab, setActiveTab] = useState<'structure' | 'blocks' | 'settings'>('structure');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const SITE_HELP = [
    { title: 'Editor de 4 Colunas', description: 'Organize suas páginas à esquerda e edite o conteúdo ao centro.', icon: LayoutTemplate },
    { title: 'Seções Dinâmicas', description: 'Adicione blocos de Hero, CTA e Features com um clique.', icon: PlusCircle },
    { title: 'Injeção de Marca', description: 'As cores do seu Brand Kit são aplicadas automaticamente em cada seção.', icon: Layers }
  ];

  // Exemplo de seções no editor
  const [sections, setSections] = useState([
    { id: '1', type: 'hero-dark', title: 'A Revolução Tecnológica', subtitle: 'A Simwork ajuda você a escalar sua marca com IA.', isVisible: true },
    { id: '2', type: 'features-grid', title: 'Principais Recursos', subtitle: 'Tudo o que você precisa num só lugar.', isVisible: true },
    { id: '3', type: 'cta-glass', title: 'Pronto para começar?', subtitle: 'Crie sua conta gratuita hoje mesmo.', isVisible: true },
  ]);

  return (
    <div className="fixed inset-0 bg-[#0a0a0f] flex flex-col z-50 overflow-hidden font-sans">
      {/* Topbar do Editor */}
      <header className="h-16 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between px-6 z-20">
         <div className="flex items-center gap-4">
            <button className="p-2 rounded-xl border border-white/5 bg-white/5 text-stone-500 hover:text-white transition-all">
               <ChevronLeft size={18} />
            </button>
            <div>
               <h1 className="text-sm font-bold text-white tracking-tight">Nome do Site</h1>
               <span className="text-[9px] text-stone-500 font-bold uppercase tracking-widest">Página: Home</span>
            </div>
            <SwBadge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[9px]">Rascunho</SwBadge>
         </div>

         <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
            <button onClick={() => setDevice('desktop')} className={cn("p-2 rounded-xl transition-all", device === 'desktop' ? "bg-white text-black" : "text-stone-500 hover:text-white")}><Monitor size={16} /></button>
            <button onClick={() => setDevice('tablet')} className={cn("p-2 rounded-xl transition-all", device === 'tablet' ? "bg-white text-black" : "text-stone-500 hover:text-white")}><Tablet size={16} /></button>
            <button onClick={() => setDevice('mobile')} className={cn("p-2 rounded-xl transition-all", device === 'mobile' ? "bg-white text-black" : "text-stone-500 hover:text-white")}><Smartphone size={16} /></button>
         </div>

         <div className="flex items-center gap-3">
            <button className="p-2 text-stone-500 hover:text-white transition-all" onClick={() => setIsHelpOpen(true)}><HelpCircle size={20} /></button>
            <SwButton variant="ghost" className="h-10 text-stone-400 border-white/5"><Eye size={16} /> Ver</SwButton>
            <SwButton variant="primary" className="h-10 bg-[#a855f7] text-white px-6 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-[#a855f7]/20">
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
                      {sections.map((section, index) => (
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
                                 <h4 className="text-xs font-bold text-white capitalize">{section.type.replace('-', ' ')}</h4>
                                 <span className="text-[9px] text-stone-500 uppercase font-black">ID: {section.id}</span>
                              </div>
                           </div>
                           <SwBadge variant="outline" className="text-[8px] opacity-0 group-hover:opacity-100 transition-opacity">Editar</SwBadge>
                        </div>
                      ))}
                   </div>
                   <SwButton variant="ghost" className="w-full h-10 border-dashed border-white/10 text-stone-500 hover:text-white">
                      <PlusCircle size={16} /> Nova Seção
                   </SwButton>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                   {['Hero', 'Features', 'Testimonials', 'Pricing', 'CTA', 'Contact', 'FAQ', 'Footer'].map(block => (
                     <div key={block} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-[#a855f7] transition-all text-center group cursor-pointer">
                        <div className="w-10 h-10 bg-white/5 rounded-xl border border-white/5 mx-auto mb-2 flex items-center justify-center text-stone-500 group-hover:text-[#a855f7] transition-colors">
                           <LayoutTemplate size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest group-hover:text-white transition-colors">{block}</span>
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
                 <div className="p-12 text-center space-y-6">
                    <div className="animate-pulse flex flex-col items-center gap-4">
                       <div className="w-20 h-1 bg-[#a855f7] rounded-full mx-auto" />
                       <h2 className="text-4xl lg:text-6xl font-black text-white tracking-tighter">O Site Está Ganhando Vida</h2>
                       <p className="text-xl text-stone-400 max-w-2xl mx-auto">Edite suas seções à esquerda e veja o resultado aqui em tempo real.</p>
                       <div className="flex gap-4 pt-4">
                          <div className="px-8 py-3 bg-[#a855f7] rounded-2xl text-white font-bold">Experimentar Agora</div>
                          <div className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-white font-bold">Saiba mais</div>
                       </div>
                    </div>
                 </div>
                 
                 {/* Exemplo de Seção Extra */}
                 <div className="p-20 bg-white/5 border-y border-white/5 grid grid-cols-3 gap-8">
                    {[1,2,3].map(i => (
                      <div key={i} className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                         <div className="w-12 h-12 bg-[#a855f7]/20 rounded-2xl flex items-center justify-center text-[#a855f7]"><Zap /></div>
                         <h3 className="text-xl font-bold text-white">Recurso Premium {i}</h3>
                         <p className="text-sm text-stone-500 leading-relaxed">Descrição detalhada do seu recurso que vai encantar os usuários.</p>
                      </div>
                    ))}
                 </div>
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
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Editando: Seção {selectedSectionId}</p>
           </div>

           <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
              <section className="space-y-4">
                 <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Conteúdo</label>
                 <div className="space-y-3">
                    <SwInput label="Título" defaultValue="A Revolução Tecnológica" className="bg-white/5 border-white/10 rounded-xl" />
                    <SwInput label="Subtítulo" defaultValue="A Simwork ajuda você a escalar sua marca." className="bg-white/5 border-white/10 rounded-xl" />
                 </div>
              </section>

              <section className="space-y-4">
                 <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Cores e Estilo</label>
                 <div className="grid grid-cols-4 gap-2">
                    {['#a855f7', '#06b6d4', '#ef4444', '#10b981'].map(color => (
                       <div key={color} className="w-full aspect-square rounded-xl cursor-pointer ring-2 ring-transparent hover:ring-white transition-all" style={{ backgroundColor: color }} />
                    ))}
                 </div>
              </section>

              <section className="pt-8 space-y-4">
                 <SwButton variant="ghost" className="w-full border-red-500/20 text-red-500 hover:bg-red-500/10">
                    <Trash2 size={16} /> Excluir Seção
                 </SwButton>
              </section>
           </div>
        </aside>
      </main>

      <SwHelpSheet 
        isOpen={isHelpOpen} 
        onClose={() => setIsHelpOpen(false)} 
        moduleName="SITE BUILDER CANVAS" 
        sections={SITE_HELP} 
      />
    </div>
  );
}
