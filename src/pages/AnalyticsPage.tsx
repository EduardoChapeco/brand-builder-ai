import { BarChart3, Globe, MousePointerClick } from 'lucide-react';
import OperationalModulePlaceholder from '@/components/shared/OperationalModulePlaceholder';

export default function AnalyticsPage() {
  return (
    <OperationalModulePlaceholder
      eyebrow="Analytics"
      title="Eventos, tendências e conversão"
      description="Analytics passa a ser a visão consolidada por módulo, com eventos rastreados por workspace e agregações diárias para leitura operacional."
      badge="Base pronta"
      metrics={[
        { label: 'Eventos hoje', value: 0, icon: MousePointerClick },
        { label: 'Módulos rastreados', value: 0, icon: Globe },
        { label: 'Agregações diárias', value: 0, icon: BarChart3 },
      ]}
      checklist={[
        'Receber eventos de Sites, Bio Links, Posts, Vídeo e Agents no schema sw_analytics_events.',
        'Consolidar métricas por dia em sw_analytics_daily para dashboards rápidos.',
        'Exibir gráficos e filtros reais por módulo, período e entidade.',
      ]}
      nextActions={[
        'Criar o endpoint sw-analytics-track com validação de workspace e batching.',
        'Montar painéis por módulo usando agregação diária e últimos eventos.',
        'Ligar clicks públicos de Bio Links e Sites a esta camada canônica.',
      ]}
    />
  );
}
