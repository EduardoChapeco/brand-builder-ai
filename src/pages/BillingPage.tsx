import { CreditCard, Receipt, Wallet } from 'lucide-react';
import OperationalModulePlaceholder from '@/components/shared/OperationalModulePlaceholder';

export default function BillingPage() {
  return (
    <OperationalModulePlaceholder
      eyebrow="Cobrança"
      title="Plano, créditos e faturas"
      description="Cobrança reúne plano atual, ledger de créditos, faturas e tentativas de pagamento em um único fluxo administrativo do workspace."
      badge="Em implantação"
      metrics={[
        { label: 'Plano atual', value: 'Free', icon: Wallet },
        { label: 'Faturas', value: 0, icon: Receipt },
        { label: 'Tentativas', value: 0, icon: CreditCard },
      ]}
      checklist={[
        'Persistir faturas, tentativas de pagamento e créditos no schema sw_*.',
        'Exibir limites do plano e consumo do workspace sem depender de textos estáticos.',
        'Preparar o terreno para o orquestrador de gateways e métodos.',
      ]}
      nextActions={[
        'Conectar o workspace ao plano vindo de sw_subscriptions.',
        'Criar listagem de faturas e ledger de créditos com filtros básicos.',
        'Implementar o roteamento de pagamento e histórico por método.',
      ]}
    />
  );
}
