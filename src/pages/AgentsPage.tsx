import { useState } from 'react';
import { Bot, Sparkles, UserPlus, PlayCircle, Send, MessageSquare, BrainCircuit, Settings2 } from 'lucide-react';
import { SwButton, SwCard, SwBadge, SwInput } from '@/components/shared/SwComponents';
import { SwHelpSheet } from '@/components/shared/SwHelpSheet';
import { cn } from '@/lib/utils';

export default function AgentsPage() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'test'>('config');
  const [status, setStatus] = useState<'idle' | 'writing'>('idle');

  const AGENT_FEATURES = [
    { title: 'Memória Evolutiva', description: 'O agente lembra do briefing e de interações passadas.', icon: BrainCircuit },
    { title: 'Personalidade Única', description: 'Defina o tom de voz e o nível de autonomia.', icon: Sparkles },
    { title: 'Simulação SimLab', description: 'Teste cenários de estresse e vendas antes de publicar.', icon: MessageSquare }
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Header e Seleção */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
         <div>
            <div className="flex items-center gap-3 mb-2">
               <SwBadge variant="outline" className="text-[#a855f7] border-[#a855f7]/30">SIMLAB V1.0</SwBadge>
               <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Inteligência Operacional</span>
            </div>
            <h1 className="text-4xl font-bold font-display text-white tracking-tight">
               Agents & <span className="text-[#a855f7]">Inteligência</span>
            </h1>
         </div>
         <div className="flex gap-3">
            <SwButton variant="ghost" onClick={() => setIsHelpOpen(true)}>
               <Settings2 size={16} /> Configurações Globais
            </SwButton>
            <SwButton variant="primary" className="bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-2xl px-6 h-12 flex items-center gap-2">
               <UserPlus size={18} /> Novo Agente
            </SwButton>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Coluna de Configuração / Lista (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
           <section className="space-y-4">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-widest">Agente Selecionado</h3>
              <div className="p-6 rounded-3xl bg-white/5 border border-[#a855f7]/20 relative overflow-hidden group hover:bg-white/[0.08] transition-all cursor-pointer">
                 <div className="h-full w-1 bg-[#a855f7] absolute left-0 top-0 bottom-0" />
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#a855f7]/20 flex items-center justify-center text-[#a855f7]">
                       <Bot size={24} />
                    </div>
                    <div>
                       <h4 className="font-bold text-white">Vendedor Simwork</h4>
                       <span className="text-[10px] text-stone-500 font-bold uppercase tracking-tighter flex items-center gap-1">
                          <PlayCircle size={10} className="text-green-500" /> Ativo · Versão 1.2
                       </span>
                    </div>
                 </div>
              </div>
           </section>

           <section className="space-y-4">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-widest">Controles de IA</h3>
              <div className="space-y-3">
                 {[
                   { label: 'Leitura de Briefing', active: true },
                   { label: 'Uso de Web Search', active: false },
                   { label: 'Gerar Imagens (DALL-E)', active: true },
                   { label: 'Memória de Longo Prazo', active: true },
                 ].map((ctrl, i) => (
                   <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                      <span className="text-xs font-bold text-stone-300">{ctrl.label}</span>
                      <div className={cn("w-10 h-5 rounded-full p-1 transition-colors transition-all cursor-pointer", ctrl.active ? "bg-[#a855f7]" : "bg-white/10")}>
                        <div className={cn("w-3 h-3 rounded-full bg-white transition-transform", ctrl.active ? "translate-x-5" : "translate-x-0")} />
                      </div>
                   </div>
                 ))}
              </div>
           </section>
        </div>

        {/* Simulador (SimLab) (8 cols) */}
        <div className="lg:col-span-8 flex flex-col h-[650px] rounded-3xl bg-[#0a0a0f] border border-white/10 relative overflow-hidden group">
           {/* Glass Overlay Top */}
           <div className="p-6 bg-white/5 backdrop-blur-xl border-b border-white/5 flex justify-between items-center z-10">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-xl bg-[#a855f7]/20 flex items-center justify-center text-[#a855f7]">
                    <MessageSquare size={16} />
                 </div>
                 <div>
                    <h3 className="text-sm font-bold text-white">SimLab Playground</h3>
                    <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Simulando: Lead de Tecnologia</p>
                 </div>
              </div>
              <div className="flex gap-2">
                 <SwBadge variant="outline" className="bg-white/5 border-white/10 text-stone-400">Tokens: 1.4k</SwBadge>
                 <SwBadge variant="outline" className="bg-green-500/10 border-green-500/20 text-green-500">RTT: 180ms</SwBadge>
              </div>
           </div>

           {/* Mensagens (ScrollArea) */}
           <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
              {/* Bot Message */}
              <div className="flex gap-4 max-w-[85%] group/msg">
                 <div className="w-8 h-8 rounded-xl bg-[#a855f7] flex-shrink-0 flex items-center justify-center text-white">
                    <Bot size={16} />
                 </div>
                 <div className="space-y-1">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-stone-300 text-sm leading-relaxed">
                       Olá! Eu sou o seu agente de vendas. Estou configurado para ler o seu <span className="text-[#a855f7] font-bold">Briefing v1.2</span> e responder com foco em conversão de tecnologia. Como posso ajudar agora?
                    </div>
                    <span className="text-[9px] text-stone-600 font-bold uppercase tracking-widest">Agente Simwork · Agora</span>
                 </div>
              </div>

              {/* User Message */}
              <div className="flex gap-4 max-w-[85%] ml-auto flex-row-reverse group/msg">
                 <div className="w-8 h-8 rounded-xl bg-white flex-shrink-0 flex items-center justify-center text-black">
                    <span className="text-[10px] font-black">VC</span>
                 </div>
                 <div className="space-y-1 text-right">
                    <div className="p-4 rounded-2xl bg-[#a855f7] text-white text-sm leading-relaxed shadow-lg shadow-[#a855f7]/20">
                       Oi! Quero testar se você sabe quais são os principais diferenciais da nossa solução de ERP para e-commerce.
                    </div>
                    <span className="text-[9px] text-stone-600 font-bold uppercase tracking-widest">Você · Agora</span>
                 </div>
              </div>

              {status === 'writing' && (
                <div className="flex gap-4 max-w-[85%] animate-in fade-in slide-in-from-bottom-2">
                   <div className="w-8 h-8 rounded-xl bg-[#a855f7]/50 flex-shrink-0 flex items-center justify-center text-white">
                      <Bot size={16} className="animate-pulse" />
                   </div>
                   <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
                      <div className="w-1 h-1 bg-[#a855f7] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1 h-1 bg-[#a855f7] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1 h-1 bg-[#a855f7] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                   </div>
                </div>
              )}
           </div>

           {/* Input Area */}
           <div className="p-6 bg-white/5 border-t border-white/5 backdrop-blur-xl space-y-4">
              <div className="relative flex items-center gap-3">
                 <div className="flex-1 relative group/field">
                    <SwInput 
                      placeholder="Mande uma mensagem para o Agente..." 
                      className="bg-white/5 border-white/10 rounded-2xl h-14 pl-12 pr-4 text-white focus:border-[#a855f7]/50 transition-all no-scrollbar"
                    />
                    <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-600 group-focus-within/field:text-[#a855f7] transition-colors" size={18} />
                 </div>
                 <SwButton 
                    variant="primary" 
                    className="w-14 h-14 rounded-2xl bg-white text-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5 flex items-center justify-center"
                    onClick={() => {
                       setStatus('writing');
                       setTimeout(() => setStatus('idle'), 3000);
                    }}
                 >
                    <Send size={24} />
                 </SwButton>
              </div>
              <p className="text-[9px] text-center text-stone-600 font-bold uppercase tracking-widest leading-relaxed">
                 O Agente pode cometer gafes. Valide sempre as simulações críticas no <span className="text-stone-400">Plano de Qualidade</span>.
              </p>
           </div>
        </div>
      </div>

      <SwHelpSheet 
        isOpen={isHelpOpen} 
        onClose={() => setIsHelpOpen(false)} 
        moduleName="AGENTS & SIMLAB" 
        sections={AGENT_FEATURES} 
      />
    </div>
  );
}
