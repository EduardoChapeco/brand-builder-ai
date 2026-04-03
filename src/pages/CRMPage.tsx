import { BriefcaseBusiness, FileText, Users } from 'lucide-react';
import OperationalModulePlaceholder from '@/components/shared/OperationalModulePlaceholder';

export default function CRMPage() {
  return (
    <OperationalModulePlaceholder
      eyebrow="CRM"
      title="Leads, pipeline e formulários"
      description="O CRM consolida leads vindos de Sites, Bio Links, Blog e formulários do workspace em um fluxo comercial rastreável."
      badge="Fundação criada"
      metrics={[
        { label: 'Leads', value: 0, icon: Users },
        { label: 'Pipelines', value: 0, icon: BriefcaseBusiness },
        { label: 'Formulários', value: 0, icon: FileText },
      ]}
      checklist={[
        'Persistir leads no schema sw_leads com origem, tags, status e campos customizados.',
        'Registrar eventos do lead e histórico comercial sem silêncios de auditoria.',
        'Ligar formulários de captura aos módulos públicos do produto.',
      ]}
      nextActions={[
        'Construir a lista operacional de leads com filtros por origem, status e data.',
        'Criar o kanban de pipeline em cima de sw_crm_pipelines e sw_crm_deals.',
        'Conectar submissions de Bio Links e Sites ao CRM com rastreamento completo.',
      ]}
    />
  );
}
