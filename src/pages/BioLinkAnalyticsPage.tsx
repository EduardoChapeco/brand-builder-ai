import { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Users, MousePointer2, Globe, Calendar, 
  ArrowUpRight, ArrowDownRight, Smartphone, Monitor, Tablet,
  Share2, PlayCircle, Layers, HelpCircle, Zap
} from 'lucide-react';
import { SwButton, SwCard, SwBadge, SwSpinner } from '@/components/shared/SwComponents';
import { SwHelpSheet } from '@/components/shared/SwHelpSheet';
import { cn } from '@/lib/utils';

export default function BioLinkAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const ANALYTICS_HELP = [
    { title: 'Taxa de Conversão', description: 'Quantas pessoas clicaram em seus CTAs em relação às visitas totais.', icon: TrendingUp },
    { title: 'Dispositivos', description: 'Veja se o seu público usa mais Android ou iPhone para otimizar o layout.', icon: Smartphone },
    { title: 'Origem do Tráfego', description: 'Identifique quais redes sociais estão trazendo mais leads.', icon: Share2 }
  ];

  useEffect(() => {
    // Simulação de carregamento de métricas do banco sw_analytics_events
    setTimeout(() => setLoading(false), 1200);
  }, []);

  return (
    <div className="flex flex-col gap-8 pb-20">
      {/* Header com Filtro de Data */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
         <div>
            <div className="flex items-center gap-3 mb-2">
               <SwBadge variant="outline" className="text-[#a855f7] border-[#a855f7]/30">LIVE ANALYTICS</SwBadge>
               <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Performance · Últimos 30 Dias</span>
            </div>
            <h1 className="text-4xl font-bold font-display text-white tracking-tight">
               Insights de <span className="text-[#a855f7]">BioLinks</span>
            </h1>
         </div>
         <div className="flex gap-3 bg-white/5 p-1 rounded-2xl border border-white/5">
            <div className="h-10 text-xs px-4 rounded-xl text-white bg-white/10 shadow-sm border border-white/5 flex items-center justify-center font-bold">30 Dias</div>
            <SwButton variant="ghost" className="h-10 text-xs px-4 rounded-xl text-stone-500 hover:text-white">7 Dias</SwButton>
            <SwButton variant="ghost" className="h-10 text-xs px-4 rounded-xl text-stone-500 hover:text-white">Hoje</SwButton>
         </div>
      </div>

      {loading ? (
        <div className="h-[60vh] flex items-center justify-center"><SwSpinner className="w-10 h-10 text-[#a855f7]" /></div>
      ) : (
        <>
          {/* Top KPIs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             {[
               { label: 'Visitas Únicas', value: '4.2k', change: '+12.5%', color: 'text-blue-400', icon: Users },
               { label: 'Total de Cliques', value: '18.9k', change: '+8.2%', color: 'text-[#a855f7]', icon: MousePointer2 },
               { label: 'Taxa de Cliques', value: '14.2%', change: '-1.4%', color: 'text-green-400', icon: TrendingUp, negative: true },
               { label: 'Novos Leads', value: '124', change: '+24.0%', color: 'text-orange-400', icon: BarChart3 },
             ].map((stat, i) => (
               <SwCard key={i} className="p-6 border-white/5 bg-white/5 hover:bg-white/[0.08] transition-all group overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5 -mr-4 -mt-4 text-white group-hover:scale-125 transition-transform"><stat.icon size={64} /></div>
                  <div className="flex items-center justify-between mb-4 relative z-10">
                     <div className={cn("p-2 rounded-xl bg-white/5", stat.color)}><stat.icon size={18} /></div>
                     <span className={cn("text-[10px] font-bold flex items-center gap-1", stat.negative ? "text-red-400" : "text-green-400")}>
                        {stat.negative ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />} {stat.change}
                     </span>
                  </div>
                  <h3 className="text-3xl font-bold text-white tracking-tight mb-1 relative z-10">{stat.value}</h3>
                  <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest relative z-10">{stat.label}</p>
               </SwCard>
             ))}
          </div>

          {/* Gráficos e Detalhes - 2 Colunas */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
             {/* Gráfico Principal (8 cols) */}
             <div className="lg:col-span-8 space-y-6">
                <SwCard className="p-8 border-white/5 bg-white/5 flex flex-col h-[400px]">
                   <div className="flex justify-between items-center mb-8">
                      <h3 className="font-bold text-white flex items-center gap-3">
                         <TrendingUp size={20} className="text-[#a855f7]" /> Curva de Crescimento
                      </h3>
                      <div className="flex gap-4">
                         <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-[#a855f7]" /> <span className="text-[10px] text-stone-500 font-bold uppercase">Cliques</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500" /> <span className="text-[10px] text-stone-500 font-bold uppercase">Visitas</span>
                         </div>
                      </div>
                   </div>
                   
                   {/* Simulação Visual de Gráfico com Barras Custom */}
                   <div className="flex-1 flex items-end gap-3 px-4">
                      {Array.from({ length: 12 }).map((_, i) => (
                         <div key={i} className="flex-1 space-y-1 group">
                             <div className="w-full bg-[#a855f7]/40 rounded-t-lg group-hover:bg-[#a855f7] transition-all" style={{ height: `${20 + Math.random() * 60}%` }} />
                             <div className="w-full bg-blue-500/40 rounded-t-lg group-hover:bg-blue-500 transition-all" style={{ height: `${10 + Math.random() * 40}%` }} />
                         </div>
                      ))}
                   </div>
                   <div className="border-t border-white/5 mt-4 pt-4 flex justify-between text-[9px] text-stone-600 font-bold uppercase tracking-widest">
                      <span>Semana 1</span> <span>Semana 2</span> <span>Semana 3</span> <span>Semana 4</span>
                   </div>
                </SwCard>

                <div className="grid grid-cols-2 gap-6">
                   <SwCard className="p-6 border-white/5 bg-white/5 space-y-6">
                      <h3 className="font-bold text-white text-sm">Top Botões (Mais Clicados)</h3>
                      <div className="space-y-4">
                         {[
                           { name: 'WhatsApp Botão', clicks: 842, color: 'bg-green-500' },
                           { name: 'Instagram Bio', clicks: 532, color: 'bg-[#a855f7]' },
                           { name: 'Oferta Especial', clicks: 211, color: 'bg-orange-500' },
                         ].map((btn, i) => (
                           <div key={i} className="space-y-2">
                              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                                 <span className="text-stone-300">{btn.name}</span>
                                 <span className="text-white">{btn.clicks}</span>
                              </div>
                              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                 <div className={cn("h-full rounded-full", btn.color)} style={{ width: `${(btn.clicks / 842) * 100}%` }} />
                              </div>
                           </div>
                         ))}
                      </div>
                   </SwCard>

                   <SwCard className="p-6 border-white/5 bg-white/5 flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-[#a855f7]">
                         <Smartphone size={32} />
                      </div>
                      <div>
                         <h3 className="text-2xl font-bold text-white leading-none">92%</h3>
                         <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mt-1">Mobile Traffic</p>
                      </div>
                      <p className="text-[10px] text-stone-600 leading-relaxed max-w-[140px] border-t border-white/5 pt-4">
                         Otimizado para iOS 17 e Android 14.
                      </p>
                   </SwCard>
                </div>
             </div>

             {/* Sidebar Insights (4 cols) */}
             <div className="lg:col-span-4 space-y-8">
                <section className="space-y-4">
                   <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2">
                      <Layers size={14} /> Origem do Tráfego
                   </h3>
                   <div className="space-y-3">
                      {[
                        { label: 'Instagram', value: '64%', icon: '📸' },
                        { label: 'TikTok', value: '22%', icon: '🎥' },
                        { label: 'WhatsApp', value: '10%', icon: '📱' },
                        { label: 'Outros', value: '4%', icon: '🔗' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-[#a855f7]/30 transition-all">
                           <div className="flex items-center gap-3">
                              <span className="text-xl">{item.icon}</span>
                              <span className="text-sm font-bold text-white">{item.label}</span>
                           </div>
                           <span className="text-xs font-black text-stone-400 group-hover:text-white transition-colors">{item.value}</span>
                        </div>
                      ))}
                   </div>
                </section>

                <section className="p-8 rounded-3xl bg-gradient-to-br from-[#a855f7]/20 to-transparent border border-[#a855f7]/20 relative overflow-hidden group">
                   <PlayCircle className="absolute -right-4 -bottom-4 text-[#a855f7]/10 w-24 h-24 rotate-12 group-hover:rotate-45 transition-transform duration-500" />
                   <h4 className="font-bold text-white mb-4 relative z-10 flex items-center gap-2">
                      <Zap size={16} className="text-[#a855f7]" /> Insight da IA
                   </h4>
                   <p className="text-xs text-stone-300 leading-relaxed relative z-10 mb-6">
                      O botão "WhatsApp" está convertendo 4x mais do que a média. Recomendamos torná-lo fixo no topo no próximo BioLink.
                   </p>
                   <SwButton variant="primary" className="w-full bg-[#a855f7] rounded-xl text-xs py-3 font-bold uppercase tracking-widest relative z-10 shadow-lg shadow-[#a855f7]/20 border-none">
                      Aplicar Recomendação
                   </SwButton>
                </section>

                <div className="pt-4 flex justify-center">
                   <SwButton variant="ghost" className="text-stone-500 text-[10px] font-bold uppercase tracking-widest" onClick={() => setIsHelpOpen(true)}>
                      <HelpCircle size={12} className="mr-2" /> Entender as Métricas
                   </SwButton>
                </div>
             </div>
          </div>
        </>
      )}

      <SwHelpSheet 
        isOpen={isHelpOpen} 
        onClose={() => setIsHelpOpen(false)} 
        moduleName="ANALYTICS & INSIGHTS" 
        sections={ANALYTICS_HELP} 
      />
    </div>
  );
}
