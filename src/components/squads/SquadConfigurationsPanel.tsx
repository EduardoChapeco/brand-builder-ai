import { Bot, Sparkles } from "lucide-react";
import AppSectionLabel from "@/components/shared/AppSectionLabel";
import EmptyState from "@/components/shared/EmptyState";
import SectionCard from "@/components/shared/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Catalog, WorkspaceSquad } from "./types";

type SquadConfigurationsPanelProps = {
  catalog: Catalog;
  loading: boolean;
  setExecutionSquadId: (id: string | null) => void;
  setExecutionBrief: (brief: string) => void;
  makeDefault: (squad: WorkspaceSquad) => Promise<void>;
  editSquad: (squad: WorkspaceSquad) => void;
  blueprintCount: number;
};

export default function SquadConfigurationsPanel({
  catalog, loading, setExecutionSquadId, setExecutionBrief,
  makeDefault, editSquad, blueprintCount
}: SquadConfigurationsPanelProps) {
  return (
    <div className="space-y-6">
      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <AppSectionLabel>Workspace squads</AppSectionLabel>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
              Active configurations
            </h2>
          </div>
          <Badge variant="outline">{catalog.workspace_squads.length} configured</Badge>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-sm text-[var(--text-muted)]">
            Loading squads...
          </div>
        ) : catalog.workspace_squads.length === 0 ? (
          <EmptyState
            title="No configured squad"
            description="Use the onboarding above to create the first operational squad for this workspace."
            icon={Sparkles}
          />
        ) : (
          <div className="space-y-3">
            {catalog.workspace_squads.map((squad) => (
              <div key={squad.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{squad.name}</h3>
                      {squad.is_default ? <Badge>Default</Badge> : null}
                      <Badge variant="outline">{squad.template?.runtime_status || squad.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {squad.goal || "No operational goal described."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {squad.template?.runtime_status === "ready" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setExecutionSquadId(squad.id);
                          setExecutionBrief("");
                        }}
                      >
                        Run here
                      </Button>
                    ) : null}
                    {!squad.is_default ? (
                      <Button variant="outline" size="sm" onClick={() => void makeDefault(squad)}>
                        Set default
                      </Button>
                    ) : null}
                    <Button size="sm" onClick={() => editSquad(squad)}>
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard className="space-y-4">
        <div>
          <AppSectionLabel>Imported catalog</AppSectionLabel>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
            Specialized agents
          </h2>
        </div>

        <div className="space-y-2">
          {catalog.agents.map((agent) => (
            <div key={agent.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="flex items-center gap-2">
                <Bot size={15} />
                <p className="text-sm font-semibold text-[var(--text-primary)]">{agent.label}</p>
                <Badge variant="outline" className="ml-auto">
                  {agent.seniority}
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{agent.career_summary}</p>
            </div>
          ))}
        </div>

        {blueprintCount > 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-5 text-sm text-[var(--text-secondary)]">
            {blueprintCount} additional templates are mapped from external repositories, but remain non-runnable
            until a real production handler exists.
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
