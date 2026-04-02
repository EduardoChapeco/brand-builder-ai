import { BrainCircuit, Loader2, RefreshCcw, ShieldCheck, Sparkles } from "lucide-react";
import ActionBar from "@/components/shared/ActionBar";
import AppSectionLabel from "@/components/shared/AppSectionLabel";
import EmptyState from "@/components/shared/EmptyState";
import MetricCard from "@/components/shared/MetricCard";
import PageHeader from "@/components/shared/PageHeader";
import SectionCard from "@/components/shared/SectionCard";
import SubtleBadge from "@/components/shared/SubtleBadge";
import SimlabReviewPanel from "@/components/simlab/SimlabReviewPanel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import useSimlabRun from "@/hooks/useSimlabRun";

const formatDateTime = (value?: string | null) => {
  if (!value) return "Nao informado";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const statusTone = (status?: string | null) => {
  if (status === "completed") return "brand" as const;
  if (status === "failed" || status === "cancelled") return "outline" as const;
  return "outline" as const;
};

const SimLabPage = () => {
  const { workspace, briefing, isLoading: workspaceLoading } = useWorkspace();
  const {
    runs,
    personas,
    policies,
    selectedRunId,
    selectedRun,
    selectedInsight,
    selectedVariants,
    isLoading,
    isRefreshing,
    isPolling,
    error,
    setSelectedRunId,
    setIsPolling,
    refreshAll,
    refreshSelectedRun,
  } = useSimlabRun(workspace?.id);

  const activeRuns = runs.filter((run) => run.status === "queued" || run.status === "running").length;

  if (workspaceLoading) {
    return (
      <div className="page-layout">
        <div className="page-content no-scrollbar">
          <div className="page-inner py-6">
            <SectionCard className="flex min-h-[240px] items-center justify-center text-sm text-[var(--text-secondary)]">
              Carregando workspace...
            </SectionCard>
          </div>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="page-layout">
        <div className="page-content no-scrollbar">
          <div className="page-inner py-6">
            <SectionCard>
              <EmptyState
                title="Workspace nao carregado"
                description="Abra esta rota dentro de um workspace para consultar runs, personas e politicas do SimLab."
                icon={BrainCircuit}
              />
            </SectionCard>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-layout">
      <div className="page-content no-scrollbar">
        <div className="page-inner space-y-6 py-6">
          <PageHeader
            eyebrow="SimLab — Persona Engine"
            title="Simulação real da sua audiência"
            description={`Nossos agentes SimLab simulam personas reais com psicologia, vieses e heurísticas de decisão. Eles avaliam posts, Bio Links e artigos como seus clientes fariam — antes de você publicar. Workspace ativo: ${briefing?.company_name || workspace.name}.`}
            action={
              <>
                <Button
                  variant="outline"
                  className="h-11 rounded-xl px-5"
                  onClick={() => setIsPolling(!isPolling)}
                >
                  {isPolling ? "Pausar polling" : "Retomar polling"}
                </Button>
                <Button className="h-11 rounded-xl px-5" onClick={() => void refreshAll()} disabled={isRefreshing}>
                  {isRefreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                  {isRefreshing ? "Atualizando..." : "Atualizar"}
                </Button>
              </>
            }
          />

          <section className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Runs" value={runs.length} icon={Sparkles} />
            <MetricCard label="Ativos" value={activeRuns} icon={Loader2} />
            <MetricCard label="Personas" value={personas.length} icon={BrainCircuit} />
            <MetricCard label="Policies" value={policies.length} icon={ShieldCheck} />
          </section>

          <ActionBar>
            <div>
              <AppSectionLabel>Motor de Validação Ativo</AppSectionLabel>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {selectedRun
                  ? `Analisando: ${selectedRun.module_type} — status ${selectedRun.status}. Selecione para ver o parecer completo das personas.`
                  : "Selecione uma simulação no histórico para ver o parecer das personas, variantes vencedoras e scores de impacto."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <SubtleBadge variant="outline">Workspace: {workspace.name}</SubtleBadge>
              <SubtleBadge variant={isPolling ? "brand" : "outline"}>
                Polling {isPolling ? "ativo" : "pausado"}
              </SubtleBadge>
            </div>
          </ActionBar>

          {error ? (
            <SectionCard className="border-rose-200 bg-rose-50/70 text-rose-800">
              <p className="text-sm leading-6">{error}</p>
            </SectionCard>
          ) : null}

          <Tabs defaultValue="runs" className="space-y-4">
            <TabsList className="h-auto w-full flex-wrap justify-start rounded-2xl bg-[var(--surface-card)] p-1">
              <TabsTrigger value="runs" className="rounded-xl px-4 py-2">Simulações</TabsTrigger>
              <TabsTrigger value="personas" className="rounded-xl px-4 py-2">Personas (Banco)</TabsTrigger>
              <TabsTrigger value="policies" className="rounded-xl px-4 py-2">Políticas de Validação</TabsTrigger>
            </TabsList>

            <TabsContent value="runs" className="space-y-4">
              {isLoading ? (
                <SectionCard className="flex min-h-[240px] items-center justify-center text-sm text-[var(--text-secondary)]">
                  Carregando runs do SimLab...
                </SectionCard>
              ) : runs.length === 0 ? (
                <SectionCard>
                  <EmptyState
                    title="Nenhuma simulação ainda"
                    description="Publique um Bio Link, salve um artigo no Blog Manager ou gere um post para o SimLab analisar automaticamente. As personas irão simular a reação do seu público antes da publicação."
                    icon={Sparkles}
                  />
                </SectionCard>
              ) : (
                <div className="grid gap-4 xl:grid-cols-[320px,minmax(0,1fr)]">
                  <SectionCard className="overflow-hidden p-0">
                    <div className="border-b border-[var(--border)] px-5 py-4">
                      <AppSectionLabel>Histórico de Simulações</AppSectionLabel>
                    </div>
                    <ScrollArea className="h-[620px]">
                      <div className="space-y-3 p-4">
                        {runs.map((run) => (
                          <button
                            key={run.id}
                            type="button"
                            onClick={() => setSelectedRunId(run.id)}
                            className="w-full rounded-2xl border p-4 text-left transition-all"
                            style={{
                              borderColor: selectedRunId === run.id ? "var(--primary)" : "var(--border)",
                              background: selectedRunId === run.id ? "var(--primary-muted)" : "var(--surface-card)",
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{run.objective}</p>
                                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                  {run.module_type} • {run.stimulus_type}
                                </p>
                              </div>
                              <SubtleBadge variant={statusTone(run.status)}>{run.status}</SubtleBadge>
                            </div>
                            <p className="mt-3 text-xs text-[var(--text-muted)]">{formatDateTime(run.updated_at || run.created_at)}</p>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </SectionCard>

                  <SectionCard className="space-y-5">
                    {selectedRun ? (
                      <>
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <AppSectionLabel>Run selecionado</AppSectionLabel>
                              <h2 className="mt-2 text-[clamp(24px,3vw,36px)] font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                                {selectedRun.objective}
                              </h2>
                              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                                {selectedRun.module_type} • {selectedRun.stimulus_type}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <SubtleBadge variant={statusTone(selectedRun.status)}>{selectedRun.status}</SubtleBadge>
                              {selectedRun.verdict ? <SubtleBadge>{selectedRun.verdict}</SubtleBadge> : null}
                            </div>
                          </div>

                          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Criado em</p>
                              <p className="mt-2 text-sm text-[var(--text-primary)]">{formatDateTime(selectedRun.created_at)}</p>
                            </div>
                            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Atualizado em</p>
                              <p className="mt-2 text-sm text-[var(--text-primary)]">{formatDateTime(selectedRun.updated_at)}</p>
                            </div>
                            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Concluido em</p>
                              <p className="mt-2 text-sm text-[var(--text-primary)]">{formatDateTime(selectedRun.completed_at)}</p>
                            </div>
                          </div>
                        </div>

                        <SimlabReviewPanel
                          run={selectedRun}
                          insight={selectedInsight}
                          variants={selectedVariants}
                          onRefresh={() => void refreshSelectedRun()}
                          loading={selectedRun.status === "queued" || selectedRun.status === "running"}
                          error={selectedRun.failure_reason || null}
                        />

                        <div className="grid gap-4 lg:grid-cols-2">
                          <SectionCard>
                            <AppSectionLabel>Variantes</AppSectionLabel>
                            <div className="mt-4 space-y-3">
                              {selectedVariants.length > 0 ? selectedVariants.map((variant) => (
                                <div key={variant.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="font-semibold text-[var(--text-primary)]">{variant.label || variant.variant_key}</p>
                                      <p className="mt-1 text-xs text-[var(--text-secondary)]">Score: {variant.score ?? "n/a"}</p>
                                    </div>
                                    {variant.is_winner ? <SubtleBadge variant="brand">Winner</SubtleBadge> : null}
                                  </div>
                                </div>
                              )) : (
                                <p className="mt-4 text-sm text-[var(--text-secondary)]">Nenhuma variante estruturada neste run.</p>
                              )}
                            </div>
                          </SectionCard>

                          <SectionCard>
                            <AppSectionLabel>Payload bruto</AppSectionLabel>
                            <pre className="mt-4 max-h-[320px] overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-xs leading-6 text-[var(--text-secondary)]">
                              {JSON.stringify(
                                {
                                  run: selectedRun,
                                  insight: selectedInsight,
                                  variants: selectedVariants,
                                },
                                null,
                                2,
                              )}
                            </pre>
                          </SectionCard>
                        </div>
                      </>
                    ) : (
                      <EmptyState
                        title="Selecione uma simulação"
                        description="Escolha uma simulação no histórico à esquerda para ver o parecer detalhado: quais personas aprovaram, quais rejeitaram e por quê."
                        icon={Sparkles}
                      />
                    )}
                  </SectionCard>
                </div>
              )}
            </TabsContent>

            <TabsContent value="personas">
              <SectionCard className="space-y-4">
                <AppSectionLabel>Banco de Personas Digitais</AppSectionLabel>
                <p className="text-sm leading-6 text-[var(--text-secondary)] max-w-[720px]">
                  Cada persona é um modelo psicológico de um perfil real de cliente. O SimLab as usa para simular reações autênticas ao seu conteúdo, identificando pontos de fricção antes de você publicar.
                </p>
                {personas.length === 0 ? (
                  <EmptyState
                    title="Personas não carregadas"
                    description="As personas do sistema (seedadas pelo SimLab) e suas personas customizadas aparecem aqui. Verifique se o workspace está configurado e tente atualizar."
                    icon={BrainCircuit}
                  />
                ) : (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {personas.map((persona) => (
                      <article key={persona.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{persona.persona_group}</p>
                            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                              {persona.display_name}
                            </h3>
                            <p className="mt-2 text-sm text-[var(--text-secondary)]">{persona.persona_code}</p>
                          </div>
                          <div className="flex gap-2">
                            {persona.is_system ? <SubtleBadge variant="brand">System</SubtleBadge> : null}
                            <SubtleBadge variant="outline">{persona.status}</SubtleBadge>
                          </div>
                        </div>

                        {persona.current_version?.summary ? (
                          <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{persona.current_version.summary}</p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </SectionCard>
            </TabsContent>

            <TabsContent value="policies">
              <SectionCard className="space-y-4">
                <AppSectionLabel>Políticas de Validação por Módulo</AppSectionLabel>
                <p className="text-sm leading-6 text-[var(--text-secondary)] max-w-[720px]">
                  As políticas definem os critérios que as personas usam para validar cada tipo de conteúdo: Bio Link, Blog, Posts e Personagens de Marca. Você pode criar políticas customizadas por workspace.
                </p>
                {policies.length === 0 ? (
                  <EmptyState
                    title="Políticas não carregadas"
                    description="As políticas padrão e as customizadas por workspace aparecem aqui quando o SimLab estiver configurado."
                    icon={ShieldCheck}
                  />
                ) : (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {policies.map((policy) => (
                      <article key={policy.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{policy.policy_key}</p>
                            <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{policy.module_type}</h3>
                          </div>
                          <div className="flex gap-2">
                            {policy.is_default ? <SubtleBadge variant="brand">Default</SubtleBadge> : null}
                            <SubtleBadge variant="outline">{policy.is_active ? "active" : "inactive"}</SubtleBadge>
                          </div>
                        </div>

                        <pre className="mt-4 max-h-[220px] overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-4 text-xs leading-6 text-[var(--text-secondary)]">
                          {JSON.stringify(policy.policy_json, null, 2)}
                        </pre>
                      </article>
                    ))}
                  </div>
                )}
              </SectionCard>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default SimLabPage;
