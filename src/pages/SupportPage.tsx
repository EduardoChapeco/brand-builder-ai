import { LifeBuoy, MessageSquare, ShieldAlert } from 'lucide-react';
import OperationalModulePlaceholder from '@/components/shared/OperationalModulePlaceholder';

export default function SupportPage() {
  return (
    <OperationalModulePlaceholder
      eyebrow="Suporte"
      title="Tickets, histórico e status da plataforma"
      description="A operação de suporte do Simwork precisa registrar tickets, mensagens, avaliação e status da plataforma em um fluxo único."
      badge="Nova rota"
      metrics={[
        { label: 'Tickets abertos', value: 0, icon: LifeBuoy },
        { label: 'Mensagens', value: 0, icon: MessageSquare },
        { label: 'Incidentes ativos', value: 0, icon: ShieldAlert },
      ]}
      checklist={[
        'Persistir tickets, mensagens e avaliações por workspace.',
        'Exibir status da plataforma e incidentes abertos sem depender de texto solto no app.',
        'Permitir ao usuário acompanhar SLA e histórico do próprio workspace.',
      ]}
      nextActions={[
        'Criar a lista de tickets do workspace com filtros por status e prioridade.',
        'Conectar mensagens do ticket ao schema sw_ticket_messages.',
        'Expor status operacional da plataforma com sw_platform_status e sw_incidents.',
      ]}
    />
  );
}
