import { useState, useEffect } from 'react';
import { Users, Search, Filter, Mail, Phone, ExternalLink, MoreVertical, Plus, Zap, UserCheck, UserMinus, Clock } from 'lucide-react';
import { SwButton, SwInput, SwBadge, SwCard, SwSpinner } from '@/components/shared/SwComponents';
import { SwHelpSheet } from '@/components/shared/SwHelpSheet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function CRMPage() {
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<any[]>([]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const CRM_HELP = [
    { title: 'Gestão de Leads', description: 'Todos os que preencheram formulários no BioLink ou Site aparecem aqui.', icon: Users },
    { title: 'Status do Funil', description: 'Classifique como Novo, Lead ou Cliente para focar seus esforços.', icon: Zap },
    { title: 'Ações Diretas', description: 'Mande WhatsApp ou E-mail com um clique direto da lista.', icon: Mail }
  ];

  useEffect(() => {
    async function loadContacts() {
      try {
        // @ts-ignore - Tabela sw_ criada dinamicamente
        const { data, error } = await supabase
          .from('sw_contacts')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setContacts(data || []);
      } catch (err) {
        console.error('Erro ao carregar contatos:', err);
      } finally {
        setLoading(false);
      }
    }
    loadContacts();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'lead': return 'bg-[#a855f7]/10 text-[#a855f7] border-[#a855f7]/20';
      case 'customer': return 'bg-green-500/10 text-green-400 border-green-500/20';
      default: return 'bg-stone-500/10 text-stone-400 border-stone-500/20';
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header Secundário */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
         <div>
            <div className="flex items-center gap-3 mb-2">
               <SwBadge variant="outline" className="text-[#a855f7] border-[#a855f7]/30">CRM OPERACIONAL</SwBadge>
               <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Contatos & Negócios</span>
            </div>
            <h1 className="text-4xl font-bold font-display text-white tracking-tight">
               Gestão de <span className="text-[#a855f7]">Leads</span>
            </h1>
         </div>
         <div className="flex gap-3">
            <SwButton variant="ghost" className="text-stone-500" onClick={() => setIsHelpOpen(true)}>
               Precisa de Ajuda?
            </SwButton>
            <SwButton variant="primary" className="bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-2xl px-6 h-12 flex items-center gap-2">
               <Plus size={18} /> Adicionar Contato
            </SwButton>
         </div>
      </div>

      {/* Grid de Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {[
           { label: 'Total Base', count: contacts.length, icon: Users, color: 'text-stone-400' },
           { label: 'Novos (7d)', count: contacts.filter(c => c.status === 'new').length, icon: Zap, color: 'text-blue-400' },
           { label: 'Leads Quentes', count: contacts.filter(c => c.status === 'lead').length, icon: Sparkles, color: 'text-[#a855f7]' },
           { label: 'Taxa de Conversão', count: '12.4%', icon: UserCheck, color: 'text-green-400' },
         ].map((stat, i) => (
           <SwCard key={i} className="p-6 border-white/5 bg-white/5 hover:bg-white/[0.08] transition-all">
              <div className="flex items-center justify-between mb-4">
                 <div className={cn("p-2 rounded-xl bg-white/5", stat.color)}>
                    <stat.icon size={18} />
                 </div>
                 <span className="text-2xl font-bold text-white leading-none">{stat.count}</span>
              </div>
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">{stat.label}</p>
           </SwCard>
         ))}
      </div>

      {/* Tabela de Leads */}
      <div className="bg-[#0a0a0f] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
         <div className="p-6 border-b border-white/5 bg-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-600" size={18} />
               <SwInput 
                  placeholder="Buscar leads por nome ou e-mail..." 
                  className="pl-12 bg-white/5 border-white/10 rounded-2xl h-12 text-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
               <SwButton variant="ghost" className="flex-1 md:flex-none border-white/5"><Filter size={16} /> Filtros</SwButton>
               <SwButton variant="ghost" className="flex-1 md:flex-none border-white/5">Exportar CSV</SwButton>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                     <th className="p-5 text-[10px] font-bold text-stone-500 uppercase tracking-widest">Contato</th>
                     <th className="p-5 text-[10px] font-bold text-stone-500 uppercase tracking-widest">Fonte</th>
                     <th className="p-5 text-[10px] font-bold text-stone-500 uppercase tracking-widest">Status</th>
                     <th className="p-5 text-[10px] font-bold text-stone-500 uppercase tracking-widest">Última Atividade</th>
                     <th className="p-5 text-right text-[10px] font-bold text-stone-500 uppercase tracking-widest">Ações</th>
                  </tr>
               </thead>
               <tbody>
                  {loading ? (
                    <tr>
                       <td colSpan={5} className="p-20 text-center">
                          <SwSpinner className="w-8 h-8 text-[#a855f7] mx-auto" />
                          <p className="mt-4 text-xs text-stone-500">Sincronizando dados...</p>
                       </td>
                    </tr>
                  ) : contacts.length === 0 ? (
                    <tr>
                       <td colSpan={5} className="p-20 text-center">
                          <Users className="w-12 h-12 text-stone-800 mx-auto mb-4" />
                          <p className="text-stone-500 font-bold">Nenhum lead encontrado.</p>
                          <p className="text-[10px] text-stone-700 uppercase mt-2">Os contatos capturados no BioLink e Site aparecerão aqui automaticamente.</p>
                       </td>
                    </tr>
                  ) : contacts.map((contact) => (
                    <tr key={contact.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                       <td className="p-5">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#a855f7]/20 to-transparent border border-[#a855f7]/20 flex items-center justify-center text-white font-bold">
                                {contact.name.charAt(0)}
                             </div>
                             <div>
                                <h4 className="text-sm font-bold text-white group-hover:text-[#a855f7] transition-colors">{contact.name}</h4>
                                <span className="text-[11px] text-stone-500 lowercase">{contact.email}</span>
                             </div>
                          </div>
                       </td>
                       <td className="p-5">
                          <SwBadge variant="outline" className="bg-white/5 border-white/10 text-stone-400 capitalize">
                             {contact.source || 'Direct'}
                          </SwBadge>
                       </td>
                       <td className="p-5">
                          <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border", getStatusColor(contact.status))}>
                             {contact.status}
                          </span>
                       </td>
                       <td className="p-5">
                          <div className="flex items-center gap-2 text-stone-500">
                             <Clock size={12} />
                             <span className="text-xs">{new Date(contact.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                       </td>
                       <td className="p-5 text-right">
                          <div className="flex justify-end gap-2">
                             <button className="p-2 rounded-lg bg-white/5 text-stone-500 hover:text-green-400 transition-colors">
                                <Phone size={16} />
                             </button>
                             <button className="p-2 rounded-lg bg-white/5 text-stone-500 hover:text-[#a855f7] transition-colors">
                                <Mail size={16} />
                             </button>
                             <button className="p-2 rounded-lg bg-white/5 text-stone-500 hover:text-white transition-colors">
                                <MoreVertical size={16} />
                             </button>
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
