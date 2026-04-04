import { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  Plus, 
  Zap, 
  Clock, 
  Sparkles, 
  Trash2, 
  CheckCircle2 
} from 'lucide-react';
import { SwButton, SwInput, SwBadge, SwCard, SwSpinner } from '@/components/shared/SwComponents';
import { SwHelpSheet } from '@/components/shared/SwHelpSheet';
import { useCRM } from '@/hooks/useCRM';
import { cn } from '@/lib/utils';
import type { LeadStatus } from '@/types/app.types';

export default function CRMPage() {
  const { leads, isLoading, updateStatus, deleteLead } = useCRM();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const CRM_HELP = [
    { title: 'Gestão de Leads', description: 'Todos os que preencheram formulários no BioLink ou Site aparecem aqui.', icon: Users },
    { title: 'Status do Funil', description: 'Classifique como Novo, Lead ou Cliente para focar seus esforços.', icon: Zap },
    { title: 'Ações Diretas', description: 'Mande WhatsApp ou E-mail com um clique direto da lista.', icon: Mail }
  ];

  const filteredContacts = useMemo(() => {
    return leads.filter(c => 
      (c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) || 
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [leads, searchTerm]);

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case 'new': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'contacted': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'qualified': return 'bg-[#a855f7]/10 text-[#a855f7] border-[#a855f7]/20';
      case 'customer': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'lost': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-stone-500/10 text-stone-400 border-stone-500/20';
    }
  };

  const getStatusLabel = (status: LeadStatus) => {
     const labels: Record<LeadStatus, string> = {
        new: 'Novo',
        contacted: 'Contatado',
        qualified: 'Qualificado',
        customer: 'Cliente',
        lost: 'Perdido'
     };
     return labels[status] || status;
  };

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-12 animate-in fade-in duration-700">
      {/* Header Secundário */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
         <div>
            <div className="flex items-center gap-3 mb-2">
               <SwBadge variant="outline" className="text-[#a855f7] border-[#a855f7]/30">CRM OPERACIONAL</SwBadge>
               <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Contatos & Base Canônica</span>
            </div>
            <h1 className="text-4xl font-bold font-display text-white tracking-tight leading-tight">
               Gestão de <span className="text-[#a855f7]">Leads</span>
            </h1>
         </div>
         <div className="flex gap-3">
            <SwButton variant="ghost" className="text-stone-500 border-white/5" onClick={() => setIsHelpOpen(true)}>
               Precisa de Ajuda?
            </SwButton>
            <SwButton variant="primary" className="bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-2xl px-6 h-12 flex items-center gap-2 shadow-lg shadow-[#a855f7]/20 transition-all active:scale-95">
               <Plus size={18} /> Adicionar Lead
            </SwButton>
         </div>
      </div>

      {/* Grid de Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {[
            { label: 'Total Base', count: leads.length, icon: Users, color: 'text-stone-400' },
            { label: 'Novos', count: leads.filter(c => c.status === 'new').length, icon: Zap, color: 'text-blue-400' },
            { label: 'Qualificados', count: leads.filter(c => c.status === 'qualified').length, icon: Sparkles, color: 'text-[#a855f7]' },
            { label: 'Clientes', count: leads.filter(c => c.status === 'customer').length, icon: CheckCircle2, color: 'text-emerald-400' },
         ].map((stat, i) => (
            <SwCard key={i} className="p-6 border-white/5 bg-white/5 hover:bg-white/[0.08] transition-all group overflow-hidden relative">
               <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className={cn("p-2 rounded-xl bg-white/5 shadow-inner transition-transform group-hover:scale-110", stat.color)}>
                     <stat.icon size={18} />
                  </div>
                  <span className="text-2xl font-bold text-white leading-none font-display">{stat.count}</span>
               </div>
               <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest leading-none relative z-10">{stat.label}</p>
               <stat.icon size={64} className={cn("absolute -bottom-4 -right-4 opacity-[0.03] transition-transform group-hover:scale-125", stat.color)} />
            </SwCard>
         ))}
      </div>

      {/* Tabela de Leads */}
      <div className="bg-[#0a0a0f] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
         <div className="p-6 border-b border-white/5 bg-white/5 flex flex-col md:flex-row gap-4 items-center justify-between z-10 relative">
            <div className="relative w-full md:w-96">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-600 focus-within:text-[#a855f7] transition-colors" size={18} />
               <SwInput 
                  placeholder="Buscar leads por nome ou e-mail..." 
                  className="pl-12 bg-white/5 border-white/10 rounded-2xl h-12 text-white outline-none focus:border-[#a855f7]/50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
               <SwButton variant="ghost" className="flex-1 md:flex-none border-white/5"><Filter size={16} /> Filtros</SwButton>
               <SwButton variant="ghost" className="flex-1 md:flex-none border-white/5">Exportar Base</SwButton>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                     <th className="p-5 text-[10px] font-bold text-stone-500 uppercase tracking-widest">Contato</th>
                     <th className="p-5 text-[10px] font-bold text-stone-500 uppercase tracking-widest">Fonte Publicação</th>
                     <th className="p-5 text-[10px] font-bold text-stone-500 uppercase tracking-widest">Status Funil</th>
                     <th className="p-5 text-[10px] font-bold text-stone-500 uppercase tracking-widest">Data Captura</th>
                     <th className="p-5 text-right text-[10px] font-bold text-stone-500 uppercase tracking-widest">Operações</th>
                  </tr>
               </thead>
               <tbody>
                  {isLoading ? (
                    <tr>
                       <td colSpan={5} className="p-20 text-center">
                          <SwSpinner className="mx-auto" />
                          <p className="mt-4 text-[10px] font-bold text-stone-500 uppercase tracking-widest animate-pulse">Sincronizando Leads...</p>
                       </td>
                    </tr>
                  ) : filteredContacts.length === 0 ? (
                    <tr>
                       <td colSpan={5} className="p-20 text-center">
                          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Users className="w-8 h-8 text-stone-800" />
                          </div>
                          <p className="text-stone-500 font-bold">Nenhum lead qualificado encontrado.</p>
                          <p className="text-[10px] text-stone-700 uppercase mt-2 font-bold tracking-widest">Os contatos capturados no BioLink e Site aparecerão aqui automaticamente.</p>
                       </td>
                    </tr>
                  ) : filteredContacts.map((contact) => (
                    <tr key={contact.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                       <td className="p-5">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#a855f7]/20 to-transparent border border-[#a855f7]/20 flex items-center justify-center text-white font-black text-xs ring-1 ring-white/5 shadow-xl">
                                {(contact.name || contact.email).charAt(0).toUpperCase()}
                             </div>
                             <div>
                                <h4 className="text-sm font-bold text-white group-hover:text-[#a855f7] transition-colors">{contact.name || 'Sem Nome'}</h4>
                                <span className="text-[11px] text-stone-600 font-medium">{contact.email}</span>
                             </div>
                          </div>
                       </td>
                       <td className="p-5">
                          <div className="flex flex-col">
                             <SwBadge variant="outline" className="bg-white/5 border-white/10 text-stone-500 uppercase text-[9px] w-fit">
                                {contact.publication_id ? 'Páginas/Bio' : 'Manual'}
                             </SwBadge>
                             {contact.publication_id && (
                                <span className="text-[9px] text-stone-700 mt-1 uppercase font-bold tracking-tighter">REF: {contact.publication_id.slice(0, 8)}</span>
                             )}
                          </div>
                       </td>
                       <td className="p-5">
                          <select 
                             className={cn("px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tight border bg-transparent cursor-pointer hover:brightness-110 transition-all outline-none", getStatusColor(contact.status))}
                             value={contact.status}
                             onChange={(e) => updateStatus({ id: contact.id, status: e.target.value as LeadStatus })}
                          >
                             <option value="new" className="bg-[#0a0a0f] text-white">Novo</option>
                             <option value="contacted" className="bg-[#0a0a0f] text-white">Contatado</option>
                             <option value="qualified" className="bg-[#0a0a0f] text-white">Qualificado</option>
                             <option value="customer" className="bg-[#0a0a0f] text-white">Cliente</option>
                             <option value="lost" className="bg-[#0a0a0f] text-white">Perdido</option>
                          </select>
                       </td>
                       <td className="p-5">
                          <div className="flex items-center gap-2 text-stone-500 font-medium">
                             <Clock size={12} />
                             <span className="text-xs">{new Date(contact.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                       </td>
                       <td className="p-5 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <SwButton 
                               variant="ghost"
                               size="sm"
                               onClick={() => deleteLead(contact.id)}
                               className="p-2 h-9 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white"
                             >
                                <Trash2 size={16} />
                             </SwButton>
                             <SwButton variant="ghost" size="sm" className="p-2 h-9 border-white/5 text-stone-500 hover:text-[#a855f7]">
                                <Mail size={16} />
                             </SwButton>
                             <SwButton variant="ghost" size="sm" className="p-2 h-9 border-white/5 text-stone-500 hover:text-green-400">
                                <Phone size={16} />
                             </SwButton>
                          </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      <SwHelpSheet 
        isOpen={isHelpOpen} 
        onClose={() => setIsHelpOpen(false)} 
        moduleName="CRM & LEADS"
        sections={CRM_HELP}
      />
    </div>
  );
}
