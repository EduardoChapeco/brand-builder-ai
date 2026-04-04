import { Settings, ShieldCheck, Database, Activity, AlertTriangle, Users, LayoutDashboard, Search } from 'lucide-react';
import { SwCard, SwButton, SwInput, SwBadge } from '@/components/shared/SwComponents';
import { useState } from 'react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 font-display">System Administration</h1>
          <p className="text-stone-400 font-medium">Monitoramento global de infraestrutura, usuários e saúde da plataforma.</p>
        </div>
        <div className="flex gap-3">
          <SwButton variant="ghost" className="border-stone-800 text-stone-400">
             <Activity size={16} /> Logs de Auditoria
          </SwButton>
          <SwButton variant="primary" className="bg-[#a855f7] hover:bg-[#9333ea] text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]">
             <ShieldCheck size={16} /> Verificação Global
          </SwButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Workspaces Ativos', value: '0', icon: LayoutDashboard },
          { label: 'Usuários Totais', value: '1', icon: Users },
          { label: 'Saúde do Banco (RLS)', value: '100%', icon: ShieldCheck },
          { label: 'Erros Recentes', value: '0', icon: AlertTriangle, color: 'text-emerald-500' }
        ].map((stat, i) => (
          <SwCard key={i} glass className="p-5">
            <div className="text-stone-500 mb-3 flex items-center gap-2">
              <stat.icon size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{stat.label}</span>
            </div>
            <p className={`text-3xl font-bold text-white ${stat.color || ''}`}>{stat.value}</p>
          </SwCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <SwCard glass>
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="font-bold flex items-center gap-2 text-white"><Database size={18} /> Central de Dados (sw_*)</h3>
              <SwBadge variant="accent">Conectado (Supabase)</SwBadge>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {[
                  { table: 'sw_workspaces', rows: '0', status: 'Healthy' },
                  { table: 'sw_brand_kits', rows: '0+', status: 'Healthy' },
                  { table: 'sw_briefings', rows: '0+', status: 'Healthy' },
                  { table: 'sw_leads', rows: '0', status: 'Healthy' }
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all cursor-default group">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-stone-500 group-hover:text-white transition-colors">
                          <Settings size={18} />
                       </div>
                       <div>
                          <p className="text-sm font-mono font-bold text-stone-300">{row.table}</p>
                          <p className="text-[10px] text-stone-500 uppercase tracking-widest">{row.rows} registros detectados</p>
                       </div>
                    </div>
                    <SwBadge variant="outline" className="text-[10px] border-emerald-500/50 text-emerald-500">{row.status}</SwBadge>
                  </div>
                ))}
              </div>
            </div>
          </SwCard>
        </div>

        <div className="space-y-6">
          <SwCard glass className="p-6 border-[#a855f7]/20">
             <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500" /> Alertas de Segurança</h3>
             <p className="text-xs text-stone-500 leading-relaxed">Nenhum incidente detectado nas últimas 24 horas. As políticas de RLS protegem o isolamento de todos os projetos Simwork.</p>
          </SwCard>
          
          <SwCard glass className="p-6">
             <h3 className="text-lg font-bold text-white mb-4">Fluxos de Trabalho</h3>
             <div className="space-y-3">
               {['Limpeza de Logs', 'Backup Semanal', 'Sincronização Cloudflare'].map((task, i) => (
                 <div key={i} className="flex items-center justify-between">
                   <span className="text-sm text-stone-400">{task}</span>
                   <SwBadge variant="draft">AGENDADO</SwBadge>
                 </div>
               ))}
             </div>
          </SwCard>
        </div>
      </div>
    </div>
  );
}
