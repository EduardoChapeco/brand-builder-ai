/**
 * src/pages/SupportPage.tsx
 * SDD-1.0 — SW-120 — Suporte com tickets reais
 */
import { useEffect, useState } from 'react';
import { LifeBuoy, MessageSquare, Plus, Clock, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/error-logger';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { SwCard, SwBadge, SwSpinner, SwButton } from '@/components/shared/SwComponents';
import { ErrorBadge } from '@/components/shared/ErrorBadge';
import PageHeader from '@/components/shared/PageHeader';

interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  sla_response_deadline: string | null;
}

const PRIORITY_COLOR = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/20',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  low: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
} as Record<string, string>;

const STATUS_ICON = {
  open: <AlertCircle size={14} className="text-amber-400" />,
  in_progress: <Clock size={14} className="text-blue-400" />,
  resolved: <CheckCircle2 size={14} className="text-emerald-400" />,
  closed: <CheckCircle2 size={14} className="text-zinc-500" />,
} as Record<string, JSX.Element>;

export default function SupportPage() {
  const { workspace } = useWorkspace();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadTickets = async () => {
    if (!workspace?.id) return;
    setIsLoading(true);
    setErrorCode(null);

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('id, title, status, priority, created_at, sla_response_deadline')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTickets((data ?? []) as Ticket[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setErrorCode('ERR_SUPPORT_LOAD_001');
      setErrorMsg(msg);
      await logError({
        code: 'ERR_SUPPORT_LOAD_001',
        module: 'support',
        message: 'Falha ao carregar tickets de suporte',
        detail: { error: msg },
        workspaceId: workspace?.id,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [workspace?.id]);

  const openCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;

  return (
    <div className="page-layout">
      <div className="page-content no-scrollbar">
        <div className="page-inner space-y-6 py-6">
          <PageHeader
            eyebrow="Suporte"
            title="Tickets, histórico e SLA"
            description="Acompanhe seus tickets de suporte, prazos de SLA e histórico de atendimento."
            action={
              <SwButton variant="primary">
                <Plus size={14} />
                Abrir ticket
              </SwButton>
            }
          />

          {errorCode && (
            <ErrorBadge
              code={errorCode}
              message={errorMsg ?? 'Erro ao carregar tickets'}
              onRetry={loadTickets}
            />
          )}

          {/* Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Abertos', value: openCount, icon: AlertCircle, color: 'text-amber-400' },
              { label: 'Em andamento', value: inProgressCount, icon: Clock, color: 'text-blue-400' },
              { label: 'Total', value: tickets.length, icon: MessageSquare, color: 'text-zinc-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <SwCard key={label} glass className="p-5">
                <div className={`flex items-center gap-2 mb-2 ${color}`}>
                  <Icon size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</span>
                </div>
                <p className="text-3xl font-bold text-white">{value}</p>
              </SwCard>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <SwSpinner className="w-8 h-8 text-violet-500" />
            </div>
          ) : (
            <SwCard glass className="overflow-hidden">
              <div className="p-5 border-b border-white/5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <LifeBuoy size={14} className="text-violet-400" />
                  Meus tickets
                </h3>
              </div>
              {tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <LifeBuoy size={40} className="text-zinc-700" />
                  <p className="text-zinc-500 text-sm font-medium">Nenhum ticket encontrado.</p>
                  <p className="text-zinc-700 text-xs">Abra um ticket para receber atendimento da equipe Simwork.</p>
                  <SwButton variant="primary" className="mt-2">
                    <Plus size={14} />
                    Abrir primeiro ticket
                  </SwButton>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 flex justify-center">
                          {STATUS_ICON[ticket.status] ?? STATUS_ICON.open}
                        </div>
                        <div>
                          <p className="text-sm text-white font-medium group-hover:text-violet-300 transition-colors">
                            {ticket.title}
                          </p>
                          <p className="text-xs text-zinc-600 mt-0.5">
                            {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                            {ticket.sla_response_deadline && (
                              <> · SLA: {new Date(ticket.sla_response_deadline).toLocaleString('pt-BR')}</>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORITY_COLOR[ticket.priority] ?? PRIORITY_COLOR.low}`}>
                          {ticket.priority}
                        </span>
                        <ChevronRight size={14} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SwCard>
          )}
        </div>
      </div>
    </div>
  );
}
