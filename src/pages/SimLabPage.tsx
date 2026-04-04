import { useState } from 'react';
import { 
  Beaker, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  Ban, 
  Clock, 
  ChevronRight,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Table as TableIcon,
  MessageSquare
} from 'lucide-react';
import { useSimLab, useSimLabRun } from '@/hooks/useSimLab';
import { SwCard, SwBadge, SwButton, SwInput, SwSpinner } from '@/components/shared/SwComponents';
import SimlabReviewPanel from '@/components/simlab/SimlabReviewPanel';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function SimLabDetail({ runId, onRefresh }: { runId: string, onRefresh: () => void }) {
  const { data, isLoading, error, refetch } = useSimLabRun(runId);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-500">
        <SwSpinner className="mx-auto" />
        <p className="text-sm animate-pulse">Sintetizando insights do laboratório...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-rose-500">
        <AlertCircle size={48} className="opacity-20" />
        <p className="text-sm font-medium">Erro ao carregar detalhes da execução.</p>
        <SwButton variant="ghost" onClick={() => refetch()}>Tentar novamente</SwButton>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">{data.run.objective}</h2>
          <div className="flex items-center gap-4">
            <SwBadge variant="ghost" className="flex items-center gap-1.5 py-1 px-3">
              <TableIcon size={12} /> {data.run.module_type.replace('_', ' ')}
            </SwBadge>
            <span className="text-xs text-slate-500">
              ID: <span className="font-mono">{data.run.id.slice(0, 8)}...</span>
            </span>
            <span className="text-xs text-slate-500">
              Realizado em: {data.run.created_at ? format(new Date(data.run.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR }) : '--'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <SwButton variant="ghost" className="text-slate-400 hover:text-white" onClick={onRefresh}>
             <RefreshCw size={18} />
           </SwButton>
        </div>
      </div>

      <SimlabReviewPanel 
        run={data.run}
        insight={data.insight}
        variants={data.variants}
        loading={false}
        title="Relatório de Auditoria"
      />

      {data.run.target_ref && (
        <SwCard className="p-6 bg-white/[0.02] border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <ExternalLink size={20} className="text-blue-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Item Validado</h4>
                <p className="text-xs text-slate-500">Link direto para o artefato original</p>
              </div>
            </div>
            <SwButton variant="ghost" size="sm" className="gap-2">
               Ver {data.run.target_ref.table === 'posts_v2' ? 'Post' : 'Página'} <ExternalLink size={14} />
            </SwButton>
          </div>
        </SwCard>
      )}
    </div>
  );
}

export default function SimLabPage() {
  const { runs, isLoading } = useSimLab();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRuns = runs.filter(run => 
    run.objective.toLowerCase().includes(searchTerm.toLowerCase()) ||
    run.module_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getVerdictIcon = (verdict: string | null) => {
    switch (verdict) {
      case 'approved': return <CheckCircle2 className="text-emerald-400" size={18} />;
      case 'revise': return <AlertCircle className="text-amber-400" size={18} />;
      case 'blocked': return <Ban className="text-rose-400" size={18} />;
      default: return <Clock className="text-slate-400" size={18} />;
    }
  };

  const getVerdictLabel = (verdict: string | null) => {
    switch (verdict) {
      case 'approved': return 'Aprovado';
      case 'revise': return 'Revisar';
      case 'blocked': return 'Bloqueado';
      default: return 'Pendente';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0b] text-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
            <Beaker className="text-indigo-400" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Laboratório de IA (SimLab)
            </h1>
            <p className="text-sm text-slate-500">Auditoria e validação de personas em tempo real</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <SwInput 
              placeholder="Buscar validação..." 
              className="pl-10 w-64 bg-white/5 border-white/10 focus:border-indigo-500/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <SwButton variant="ghost" className="flex items-center gap-2 border-white/10 hover:bg-white/5">
            <Filter size={16} /> Filtros
          </SwButton>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: History List */}
        <div className="w-96 border-r border-white/5 bg-white/[0.01] flex flex-col">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Histórico de Execuções</span>
            <SwBadge variant="outline" className="text-[9px] opacity-60">{filteredRuns.length}</SwBadge>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
                <SwSpinner />
                <span className="text-[10px] uppercase tracking-wider font-medium opacity-50">Carregando histórico...</span>
              </div>
            ) : filteredRuns.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="mx-auto text-slate-800 mb-4" size={32} />
                <p className="text-sm text-slate-500 italic">Nenhuma validação encontrada.</p>
              </div>
            ) : (
              filteredRuns.map((run) => (
                <button
                  key={run.id}
                  onClick={() => setSelectedRunId(run.id)}
                  className={`w-full p-4 rounded-xl text-left transition-all border group relative overflow-hidden ${
                    selectedRunId === run.id 
                      ? 'bg-indigo-500/10 border-indigo-500/30' 
                      : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.08] hover:border-white/10'
                  }`}
                >
                  {selectedRunId === run.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                  )}
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                      {run.module_type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-600 font-medium">
                      {run.created_at ? format(new Date(run.created_at), 'dd MMM, HH:mm', { locale: ptBR }) : '--'}
                    </span>
                  </div>
                  
                  <h3 className="text-sm font-semibold text-slate-200 line-clamp-2 mb-4 group-hover:text-white transition-colors">
                    {run.objective}
                  </h3>
                  
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      {getVerdictIcon(run.verdict)}
                      <span className={`text-[11px] font-bold uppercase tracking-wide ${
                        run.verdict === 'approved' ? 'text-emerald-400' :
                        run.verdict === 'revise' ? 'text-amber-400' :
                        run.verdict === 'blocked' ? 'text-rose-400' : 'text-slate-500'
                      }`}>
                        {getVerdictLabel(run.verdict)}
                      </span>
                    </div>
                    <ChevronRight size={14} className={`transition-transform duration-300 ${selectedRunId === run.id ? 'translate-x-1 text-indigo-400' : 'text-slate-700'}`} />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail Area */}
        <div className="flex-1 bg-[#050506]/50 overflow-y-auto relative custom-scrollbar">
          {!selectedRunId ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-12">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center border border-white/10 mb-8 relative group">
                <Beaker size={48} className="text-indigo-500/20 group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-indigo-500/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-center max-w-sm">
                <h3 className="text-xl font-bold text-slate-300 mb-2">SimLab Explorer</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Selecione uma execução no histórico lateral para auditar o veredito dos agentes e visualizar insights detalhados sobre o público.
                </p>
              </div>
              
              <div className="mt-12 grid grid-cols-2 gap-4 w-full max-w-lg">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="text-indigo-400 font-bold text-lg mb-1">0%</div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Viés Humano</div>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="text-emerald-400 font-bold text-lg mb-1">100%</div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Validado por Dados</div>
                </div>
              </div>
            </div>
          ) : (
             <div className="p-8 lg:p-12 animate-in fade-in slide-in-from-right-8 duration-700">
                <SimLabDetail runId={selectedRunId} onRefresh={() => {}} />
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
