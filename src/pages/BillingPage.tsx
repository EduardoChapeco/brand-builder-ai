/**
 * src/pages/BillingPage.tsx
 * SDD-1.0 — SW-110 — Plano, créditos e faturas com dados reais
 */
import { useEffect, useState } from 'react';
import { CreditCard, Receipt, Wallet, CheckCircle2, XCircle, AlertCircle, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/error-logger';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { SwCard, SwBadge, SwSpinner } from '@/components/shared/SwComponents';
import { ErrorBadge } from '@/components/shared/ErrorBadge';
import PageHeader from '@/components/shared/PageHeader';

interface Subscription {
  id: string;
  plan: string;
  status: string;
  current_period_end: string | null;
  gateway: string | null;
}

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

const PLANS = {
  free: { label: 'Gratuito', color: 'text-zinc-400', features: ['1 workspace', '3 Bio Links', '5 posts/mês', '500MB assets'] },
  starter: { label: 'Starter', color: 'text-blue-400', features: ['1 workspace', '10 Bio Links', '50 posts/mês', '2GB assets', 'Analytics básico'] },
  pro: { label: 'Pro', color: 'text-violet-400', features: ['3 workspaces', 'Bio Links ilimitados', 'Posts ilimitados', '20GB assets', 'Agents + SimLab', 'Analytics completo'] },
  business: { label: 'Business', color: 'text-amber-400', features: ['10 workspaces', 'Tudo no Pro', '100GB assets', 'API própria', 'Suporte prioritário', 'Chaves de IA próprias'] },
};

export default function BillingPage() {
  const { workspace } = useWorkspace();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadBilling = async () => {
    if (!workspace?.id) return;
    setIsLoading(true);
    setErrorCode(null);

    try {
      const [subResult, invResult] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('id, plan, status, current_period_end, gateway')
          .eq('workspace_id', workspace.id)
          .maybeSingle(),
        supabase
          .from('invoices')
          .select('id, amount, currency, status, created_at')
          .eq('workspace_id', workspace.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (subResult.error && subResult.error.code !== 'PGRST116') throw subResult.error;
      if (invResult.error) throw invResult.error;

      setSubscription(subResult.data as Subscription | null);
      setInvoices((invResult.data ?? []) as Invoice[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setErrorCode('ERR_BILLING_LOAD_001');
      setErrorMsg(msg);
      await logError({
        code: 'ERR_BILLING_LOAD_001',
        module: 'billing',
        message: 'Falha ao carregar dados de cobrança',
        detail: { error: msg },
        workspaceId: workspace?.id,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBilling();
  }, [workspace?.id]);

  const currentPlan = (workspace?.plan as keyof typeof PLANS) ?? 'free';
  const planInfo = PLANS[currentPlan] ?? PLANS.free;

  const statusIcon = (s: string) => {
    if (s === 'active') return <CheckCircle2 size={14} className="text-emerald-400" />;
    if (s === 'past_due') return <AlertCircle size={14} className="text-amber-400" />;
    return <XCircle size={14} className="text-red-400" />;
  };

  return (
    <div className="page-layout">
      <div className="page-content no-scrollbar">
        <div className="page-inner space-y-6 py-6">
          <PageHeader
            eyebrow="Cobrança"
            title="Plano, créditos e faturas"
            description="Gerencie o plano do workspace, histórico de faturas e métodos de pagamento."
            action={<SwBadge variant="brand">{planInfo.label}</SwBadge>}
          />

          {errorCode && (
            <ErrorBadge
              code={errorCode}
              message={errorMsg ?? 'Erro ao carregar cobrança'}
              onRetry={loadBilling}
            />
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <SwSpinner className="w-8 h-8 text-violet-500" />
            </div>
          ) : (
            <>
              {/* Plano atual */}
              <div className="grid gap-4 md:grid-cols-3">
                <SwCard glass className="p-5 col-span-2">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Plano atual</p>
                      <h2 className={`text-2xl font-bold ${planInfo.color}`}>{planInfo.label}</h2>
                    </div>
                    <Wallet size={24} className="text-zinc-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {planInfo.features.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-xs text-zinc-400">
                        <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>
                </SwCard>

                <SwCard glass className="p-5 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Status assinatura</p>
                    <div className="flex items-center gap-2 mt-2">
                      {statusIcon(subscription?.status ?? 'inactive')}
                      <span className="text-sm font-bold text-white capitalize">
                        {subscription?.status === 'active' ? 'Ativa' :
                         subscription?.status === 'past_due' ? 'Em atraso' :
                         subscription ? subscription.status : 'Sem assinatura'}
                      </span>
                    </div>
                    {subscription?.current_period_end && (
                      <div className="flex items-center gap-2 mt-3 text-xs text-zinc-500">
                        <Calendar size={12} />
                        Renova em {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                  <button className="w-full mt-4 py-2 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors">
                    {subscription?.status === 'active' ? 'Gerenciar plano' : 'Fazer upgrade'}
                  </button>
                </SwCard>
              </div>

              {/* Faturas */}
              <SwCard glass className="p-6">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Receipt size={14} className="text-violet-400" />
                  Histórico de faturas
                </h3>
                {invoices.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt size={32} className="text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500 text-sm">Nenhuma fatura encontrada.</p>
                    <p className="text-zinc-700 text-xs mt-1">As faturas aparecerão aqui após a primeira cobrança.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex items-center gap-3">
                          <CreditCard size={14} className="text-zinc-500" />
                          <div>
                            <p className="text-sm text-white font-medium">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: inv.currency ?? 'BRL' }).format(inv.amount / 100)}
                            </p>
                            <p className="text-xs text-zinc-500">{new Date(inv.created_at).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' :
                          inv.status === 'open' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-red-500/10 text-red-400'
                        }`}>
                          {inv.status === 'paid' ? 'Pago' : inv.status === 'open' ? 'Pendente' : inv.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </SwCard>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
