import { ArrowRight, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import AppSectionLabel from "@/components/shared/AppSectionLabel";
import SectionCard from "@/components/shared/SectionCard";
import SubtleBadge from "@/components/shared/SubtleBadge";
import { MOTION_STUDIO_TEMPLATES, getMotionStudioTemplate, parseMotionStudioLayers } from "@/components/video/VideoStudioRemotionTemplates";
import type { Tables } from "@/integrations/supabase/types";

type LayerCompositionRow = Tables<"layer_compositions">;

const formatRelative = (value: string | null | undefined) => {
  if (!value) return "no update yet";

  const delta = new Date(value).getTime() - Date.now();
  if (Number.isNaN(delta)) return value;

  const minutes = Math.round(delta / 60000);
  const formatter = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) return formatter.format(hours, "hour");

  const days = Math.round(hours / 24);
  return formatter.format(days, "day");
};

const getStatusBadgeClass = (status?: string | null) => {
  if (status === "completed" || status === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "failed" || status === "cancelled") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "running" || status === "queued" || status === "processing") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  return "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)]";
};

const getCommandGuardrailSummary = (errorCount: number, warningCount: number) => {
  if (errorCount > 0) return `${errorCount} blocking guardrails`;
  if (warningCount > 0) return `${warningCount} warnings`;
  return "safe to apply";
};

type MotionStudioLeftPanelProps = {
  selectedTemplateId: string;
  handleSelectTemplate: (templateId: string) => void;
  commandInput: string;
  setCommandInput: (val: string) => void;
  handleDraftCommand: () => void;
  commandPending: boolean;
  commandError: string | null;
  draftPatch: any;
  draftPatchIssues: any[];
  handleApplyDraftPatch: () => void;
  filteredCompositions: LayerCompositionRow[];
  selectedCompositionId: string | null;
  applyCompositionSnapshot: (comp: LayerCompositionRow) => void;
};

export default function MotionStudioLeftPanel({
  selectedTemplateId,
  handleSelectTemplate,
  commandInput,
  setCommandInput,
  handleDraftCommand,
  commandPending,
  commandError,
  draftPatch,
  draftPatchIssues,
  handleApplyDraftPatch,
  filteredCompositions,
  selectedCompositionId,
  applyCompositionSnapshot,
}: MotionStudioLeftPanelProps) {
  return (
    <div className="space-y-6">
      <SectionCard className="space-y-4">
        <div>
          <AppSectionLabel>Template + Guardrails</AppSectionLabel>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
            Start from a real motion template
          </h2>
        </div>

        <div className="space-y-3">
          {MOTION_STUDIO_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => handleSelectTemplate(template.id)}
              className={
                template.id === selectedTemplateId
                  ? "w-full rounded-2xl border border-[var(--workspace-brand-border)] bg-[var(--workspace-brand-soft)] p-4 text-left"
                  : "w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-left transition-colors hover:border-[var(--border-strong)]"
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-[var(--text-primary)]">{template.label}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{template.description}</p>
                </div>
                <SubtleBadge variant="outline">{template.supportedRatios.join(" / ")}</SubtleBadge>
              </div>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <AppSectionLabel>Edit command</AppSectionLabel>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
              Guardrailed patch drafting
            </h2>
          </div>
          <SubtleBadge variant="outline">frontend-only</SubtleBadge>
        </div>

        <Textarea
          value={commandInput}
          onChange={(event) => setCommandInput(event.target.value)}
          placeholder='Examples: "faster 9:16", "headline: Stronger opening", "cta: Book now", "hook +12"'
          className="min-h-[120px] rounded-2xl"
        />

        <Button className="w-full rounded-xl" onClick={() => void handleDraftCommand()} disabled={commandPending}>
          {commandPending ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
          Draft patch
        </Button>

        {commandError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {commandError}
          </div>
        ) : null}

        {draftPatch ? (
          <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{draftPatch.summary}</p>
              <SubtleBadge variant="outline">
                {getCommandGuardrailSummary(
                  draftPatchIssues.filter((issue) => issue.level === "error").length,
                  draftPatchIssues.filter((issue) => issue.level === "warning").length,
                )}
              </SubtleBadge>
            </div>

            <ul className="space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
              {draftPatch.changes.map((change: string) => (
                <li key={change}>{change}</li>
              ))}
            </ul>

            {draftPatchIssues.length > 0 ? (
              <div className="space-y-2">
                {draftPatchIssues.map((issue) => (
                  <p
                    key={`${issue.level}-${issue.message}`}
                    className={
                      issue.level === "error"
                        ? "text-xs leading-5 text-rose-700"
                        : "text-xs leading-5 text-amber-700"
                    }
                  >
                    {issue.message}
                  </p>
                ))}
              </div>
            ) : null}

            <Button
              className="w-full rounded-xl"
              onClick={handleApplyDraftPatch}
              disabled={draftPatchIssues.some((issue) => issue.level === "error")}
            >
              Apply patch to preview
              <ArrowRight size={14} />
            </Button>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <AppSectionLabel>Saved revisions</AppSectionLabel>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
              Layer compositions
            </h2>
          </div>
          <SubtleBadge variant="outline">{filteredCompositions.length}</SubtleBadge>
        </div>

        {filteredCompositions.length === 0 ? (
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            No layer composition has been saved yet for this scope.
          </p>
        ) : (
          <ScrollArea className="h-[360px]">
            <div className="space-y-3">
              {filteredCompositions.map((composition) => {
                const parsed = parseMotionStudioLayers(composition.layers);
                const isSelected = composition.id === selectedCompositionId;

                return (
                  <button
                    key={composition.id}
                    type="button"
                    onClick={() => applyCompositionSnapshot(composition)}
                    className={
                      isSelected
                        ? "w-full rounded-2xl border border-[var(--workspace-brand-border)] bg-[var(--workspace-brand-soft)] p-4 text-left"
                        : "w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-left transition-colors hover:border-[var(--border-strong)]"
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {parsed?.templateId ? getMotionStudioTemplate(parsed.templateId).label : "Unknown template"}
                      </p>
                      <SubtleBadge className={getStatusBadgeClass(composition.status)}>{composition.status}</SubtleBadge>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                      {parsed?.promptOriginal || composition.prompt_original}
                    </p>
                    <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                      Updated {formatRelative(composition.updated_at)}
                    </p>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </SectionCard>
    </div>
  );
}
