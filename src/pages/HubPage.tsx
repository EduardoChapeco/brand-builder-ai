import { Bot, FileText, Globe, Link2, Video, Wallet } from 'lucide-react';
import OperationalModulePlaceholder from '@/components/shared/OperationalModulePlaceholder';

export default function HubPage() {
  return (
    <OperationalModulePlaceholder
      eyebrow="Hub Simwork"
      title="Criadores e operações centrais"
      description="O Hub concentra os fluxos de criação ativos do workspace e organiza os próximos passos entre Sites, Bio Links, Conteúdo, Vídeo e Agents."
      badge="Operacional"
      metrics={[
        { label: 'Fluxos ativos', value: 5, icon: Globe },
        { label: 'Módulos prontos', value: 7, icon: Bot },
        { label: 'Pendências de setup', value: 3, icon: Wallet },
      ]}
      checklist={[
        'Exibir os módulos do workspace com status real, último item editado e ação principal.',
        'Servir como entrada única para criação de Sites, Bio Links, Posts, Vídeo, Agents e Editorial.',
        'Remover qualquer navegação redundante que force o usuário a descobrir o produto por tentativa e erro.',
      ]}
      nextActions={[
        'Conectar contadores reais de Sites, Bio Links, Posts, Vídeos e Agents.',
        'Ligar cada card do Hub ao schema sw_* correspondente.',
        'Exibir alertas operacionais do workspace diretamente no catálogo de módulos.',
      ]}
    />
  );
}
