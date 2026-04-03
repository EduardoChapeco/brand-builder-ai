import { Building2, KeyRound, ShieldAlert } from 'lucide-react';
import OperationalModulePlaceholder from '@/components/shared/OperationalModulePlaceholder';

export default function AdminPage() {
  return (
    <OperationalModulePlaceholder
      eyebrow="Admin"
      title="Operação administrativa global"
      description="O painel administrativo concentra workspaces, módulos, chaves, billing, logs e incidentes em um fluxo único de operação do Simwork."
      badge="Admin"
      metrics={[
        { label: 'Workspaces', value: 0, icon: Building2 },
        { label: 'Chaves globais', value: 0, icon: KeyRound },
        { label: 'Incidentes abertos', value: 0, icon: ShieldAlert },
      ]}
      checklist={[
        'Exibir gestão global de workspaces, planos, flags, billing e chaves.',
        'Permitir observabilidade e suporte sem acessar tabelas legadas espalhadas.',
        'Centralizar incidentes, logs técnicos e saúde dos provedores.',
      ]}
      nextActions={[
        'Adicionar subrotas para usuários, workspaces, billing, keys, gateways, logs e suporte.',
        'Conectar o painel aos schemas sw_system_logs, sw_error_logs, sw_incidents e sw_provider_keys.',
        'Aplicar controle de acesso administrativo no frontend e nas edge functions.',
      ]}
    />
  );
}
