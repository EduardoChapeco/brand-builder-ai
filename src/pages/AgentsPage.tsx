import { Bot, MessageSquare, ShieldCheck } from 'lucide-react';
import OperationalModulePlaceholder from '@/components/shared/OperationalModulePlaceholder';

export default function AgentsPage() {
  return (
    <OperationalModulePlaceholder
      eyebrow="Agents"
      title="Agents, memória e SimLab"
      description="Aqui ficam os agents operacionais do workspace, suas ferramentas, validação e simulações de comportamento antes da publicação."
      badge="Em convergência"
      metrics={[
        { label: 'Agents publicados', value: 0, icon: Bot },
        { label: 'Sessões registradas', value: 0, icon: MessageSquare },
        { label: 'Perfis SimLab', value: 0, icon: ShieldCheck },
      ]}
      checklist={[
        'Substituir o legado EngiosAi por agents do schema sw_agents.',
        'Persistir sessões, memória, comportamento e ferramentas habilitadas.',
        'Acoplar a validação SimLab ao mesmo fluxo do agent, sem telas separadas e desconectadas.',
      ]}
      nextActions={[
        'Criar o editor linear de agents com identidade, voz, memória, comportamento e ferramentas.',
        'Conectar a execução do agent à camada sw-agent-run e ao WebMCP.',
        'Migrar o SimLab para perfis sintéticos do workspace com relatórios reais.',
      ]}
    />
  );
}
