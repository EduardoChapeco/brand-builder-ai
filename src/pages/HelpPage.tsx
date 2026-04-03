import { BookOpenText, CheckCircle2, HelpCircle } from 'lucide-react';
import OperationalModulePlaceholder from '@/components/shared/OperationalModulePlaceholder';

export default function HelpPage() {
  return (
    <OperationalModulePlaceholder
      eyebrow="Ajuda"
      title="Central de ajuda e onboarding contínuo"
      description="A área de ajuda passa a ser reabrível, orientada por módulo e integrada ao progresso operacional do workspace."
      badge="Nova rota"
      metrics={[
        { label: 'Artigos publicados', value: 0, icon: BookOpenText },
        { label: 'Módulos com ajuda', value: 0, icon: HelpCircle },
        { label: 'Etapas concluídas', value: 0, icon: CheckCircle2 },
      ]}
      checklist={[
        'Persistir visualizações por módulo com sw_help_views.',
        'Organizar artigos, categorias e passos de onboarding em PT-BR.',
        'Permitir reabertura da ajuda contextual sem bloquear o editor.',
      ]}
      nextActions={[
        'Criar a biblioteca de artigos e categorias usando sw_help_articles e sw_help_categories.',
        'Conectar progresso de onboarding em sw_onboarding_steps.',
        'Reusar o mesmo conteúdo no help sheet do shell e na central completa.',
      ]}
    />
  );
}
