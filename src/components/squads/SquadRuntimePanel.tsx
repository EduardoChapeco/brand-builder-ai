import { ChevronLeft, ChevronRight, Loader2, Play, Sparkles } from "lucide-react";
import AppSectionLabel from "@/components/shared/AppSectionLabel";
import EmptyState from "@/components/shared/EmptyState";
import SectionCard from "@/components/shared/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AgentTaskStatus, AgentStatusPayload, Catalog, PostData, WorkspaceSquad, Template } from "./types";

type SquadRuntimePanelProps = {
  catalog: Catalog;
  executionSquadId: string | null;
  setExecutionSquadId: (id: string | null) => void;
  selectedExecutionSquad: WorkspaceSquad | null;
  selectedExecutionTemplate: Template | null;
  executionBrief: string;
  setExecutionBrief: (brief: string) => void;
  launchRun: () => void;
  launchingRun: boolean;
  activeRunId: string | null;
  runStatus: AgentStatusPayload["status"] | null;
  visibleTasks: AgentTaskStatus[];
  taskStatusLabel: Record<AgentTaskStatus["status"], string>;
  runSummary: string | null;
  runPost: PostData | null;
  previewSlide: number;
  setPreviewSlide: (val: number | ((curr: number) => number)) => void;
};

export default function SquadRuntimePanel({
  catalog, executionSquadId, setExecutionSquadId, selectedExecutionSquad,
  selectedExecutionTemplate, executionBrief, setExecutionBrief, launchRun,
  launchingRun, activeRunId, runStatus, visibleTasks, taskStatusLabel,
  runSummary, runPost, previewSlide, setPreviewSlide
}: SquadRuntimePanelProps) {
  return (
    <SectionCard className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <AppSectionLabel>Runtime execution</AppSectionLabel>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
            Run a configured squad
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            This page now launches the real squad runtime, polls persisted tasks, and shows the final artifact
            returned by QA.
          </p>
        </div>
        {selectedExecutionSquad?.template ? (
          <div className="flex flex-wrap gap-2">
            <Badge>{selectedExecutionSquad.template.runtime_status}</Badge>
            <Badge variant="outline">{selectedExecutionSquad.template.module_type}</Badge>
          </div>
        ) : null}
      </div>

      {catalog.workspace_squads.length === 0 ? (
        <EmptyState
          title="No operational squad yet"
          description="Finish the onboarding above to configure the first real squad for this workspace."
          icon={Sparkles}
        />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Active squad
              </label>
              <select
                value={executionSquadId || ""}
                onChange={(event) => setExecutionSquadId(event.target.value || null)}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-card)] px-3 text-sm text-[var(--text-primary)]"
              >
                {catalog.workspace_squads.map((squad) => (
                  <option key={squad.id} value={squad.id}>
                    {squad.name}
                  </option>
                ))}
              </select>

              {selectedExecutionSquad ? (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedExecutionSquad.name}</p>
                    {selectedExecutionSquad.is_default ? <Badge>Default</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {selectedExecutionSquad.goal || "No goal described yet."}
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Channel
                      </p>
                      <p className="mt-2 text-sm text-[var(--text-primary)]">{selectedExecutionSquad.channel || "-"}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Cadence
                      </p>
                      <p className="mt-2 text-sm text-[var(--text-primary)]">{selectedExecutionSquad.cadence || "-"}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Approval
                      </p>
                      <p className="mt-2 text-sm text-[var(--text-primary)]">{selectedExecutionSquad.approval_mode || "-"}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Execution brief
              </label>
              <Textarea
                value={executionBrief}
                onChange={(event) => setExecutionBrief(event.target.value)}
                placeholder="Describe the deliverable, context, timing, and exact business outcome this squad should produce now."
                className="min-h-[180px] rounded-xl border-[var(--border)] bg-[var(--surface-card)]"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[var(--text-muted)]">
                  The run creates real rows in `agent_prds`, `agent_tasks`, and persists the final post in
                  `posts_v2` when QA approves it.
                </p>
                <Button
                  onClick={() => void launchRun()}
                  disabled={
                    launchingRun ||
                    Boolean(activeRunId) ||
                    !selectedExecutionTemplate ||
                    selectedExecutionTemplate.runtime_status !== "ready"
                  }
                  className="h-11 rounded-xl px-5"
                >
                  {launchingRun ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  {launchingRun ? "Launching..." : "Run squad"}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <AppSectionLabel>Current run</AppSectionLabel>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Execution telemetry</h3>
                </div>
                {runStatus ? <Badge variant="outline">{runStatus}</Badge> : null}
              </div>

              {visibleTasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--text-muted)]">
                  Start a run to watch persisted tasks move across the squad chain.
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4"
                    >
                      {task.status === "completed" ? (
                        <span className="text-emerald-600">OK</span>
                      ) : task.status === "running" ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[var(--workspace-brand)]" />
                      ) : task.status === "failed" ? (
                        <span className="text-rose-600">ERR</span>
                      ) : (
                        <span className="inline-block h-2 w-2 rounded-full bg-[var(--text-muted)]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{task.label}</p>
                        <p className="text-xs text-[var(--text-muted)]">{taskStatusLabel[task.status]}</p>
                        {task.error_msg ? <p className="mt-2 text-xs text-rose-600">{task.error_msg}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {runSummary ? (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    QA summary
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{runSummary}</p>
                </div>
              ) : null}
            </div>

            <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <AppSectionLabel>Final artifact</AppSectionLabel>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Post preview</h3>
                </div>
                {runPost ? <Badge variant="outline">{previewSlide + 1} / {runPost.slides_html.length}</Badge> : null}
              </div>

              {!runPost ? (
                <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--text-muted)]">
                  The final artifact appears here only when the real QA step returns a valid payload.
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{runPost.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {runPost.format === "carousel" ? "Carousel" : "Single"} · {runPost.template}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPreviewSlide((current) => Math.max(0, current - 1))}
                        disabled={previewSlide === 0}
                      >
                        <ChevronLeft size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          setPreviewSlide((current) => Math.min(runPost.slides_html.length - 1, current + 1))
                        }
                        disabled={previewSlide === runPost.slides_html.length - 1}
                      >
                        <ChevronRight size={16} />
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-card)]">
                    <div className="mx-auto" style={{ width: 352, height: 352, overflow: "hidden" }}>
                      <div
                        style={{
                          width: 540,
                          height: 540,
                          transform: `scale(${352 / 540})`,
                          transformOrigin: "top left",
                        }}
                      >
                        <div dangerouslySetInnerHTML={{ __html: runPost.slides_html[previewSlide] }} />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      Caption
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                      {runPost.caption}
                    </p>
                    {runPost.hashtags ? <p className="mt-3 text-xs text-[var(--text-muted)]">{runPost.hashtags}</p> : null}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
