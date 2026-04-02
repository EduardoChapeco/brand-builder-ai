export const SUPPORTED_AGENT_IDS = new Set([
  "content_strategist",
  "content_writer",
  "content_designer",
  "simlab_validator",
  "content_qa",
  "trend_researcher",
  "site_spec_analyst",
  "site_information_architect",
  "site_design_system_guardian",
  "site_copy_architect",
  "site_data_contract_planner",
  "site_repo_planner",
  "site_builder_executor",
  "site_quality_reviewer",
]);

export const isSupportedAgentId = (agentId: string) => SUPPORTED_AGENT_IDS.has(agentId);

export const getAgentStatusLabel = (agentId: string) => {
  const labels: Record<string, string> = {
    trend_researcher: "Radar de tendencias",
    content_strategist: "Definindo estrategia",
    content_writer: "Escrevendo copy",
    content_designer: "Montando layout HTML",
    simlab_validator: "Validando com SimLab",
    content_qa: "Revisando e montando payload final",
    site_spec_analyst: "Refinando prompt e montando spec",
    site_information_architect: "Planejando arquitetura do site",
    site_design_system_guardian: "Aplicando constituicao visual",
    site_copy_architect: "Escrevendo copy estrutural",
    site_data_contract_planner: "Modelando dados e integracoes",
    site_repo_planner: "Definindo grafo de tarefas",
    site_builder_executor: "Gerando projeto multi-arquivo",
    site_quality_reviewer: "Executando QA visual e tecnico",
  };

  return labels[agentId] || agentId;
};

export const assertReadyTemplateAgentsSupported = (
  templateName: string,
  runtimeStatus: string,
  agentIds: string[],
) => {
  if (runtimeStatus !== "ready") return;

  const unsupported = agentIds.find((agentId) => !isSupportedAgentId(agentId));
  if (unsupported) {
    throw new Error(`O template "${templateName}" usa o agente ${unsupported}, que ainda nao possui handler real de execucao.`);
  }
};
