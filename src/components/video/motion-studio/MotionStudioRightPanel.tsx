import { AlertTriangle, Loader2, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AppSectionLabel from "@/components/shared/AppSectionLabel";
import SectionCard from "@/components/shared/SectionCard";
import SubtleBadge from "@/components/shared/SubtleBadge";
import VideoStudioRemotionPropsPanel from "@/components/video/VideoStudioRemotionPropsPanel";
import type { Tables } from "@/integrations/supabase/types";

type VideoProjectRow = Tables<"video_projects">;
type VideoJobRow = Tables<"video_jobs">;
type VideoAssetRow = Tables<"video_assets">;

type AssetOption = {
  id: string;
  label: string;
  assetType: string;
  publicUrl: string | null;
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "Not available";

  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

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

type MotionStudioRightPanelProps = {
  blockingIssues: any[];
  warningIssues: any[];
  issues: any[];
  selectedTemplate: any;
  values: Record<string, unknown>;
  updateValue: (fieldId: string, nextValue: unknown) => void;
  assetOptions: AssetOption[];
  projects: VideoProjectRow[];
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  isSavingRevision: boolean;
  persistRevision: () => Promise<any>;
  isQueueingRender: boolean;
  handleQueueRender: () => Promise<void>;
  renderJob: VideoJobRow | null;
  renderOutputAsset: VideoAssetRow | null;
  surfaceError: string | null;
};

export default function MotionStudioRightPanel({
  blockingIssues,
  warningIssues,
  issues,
  selectedTemplate,
  values,
  updateValue,
  assetOptions,
  projects,
  selectedProjectId,
  setSelectedProjectId,
  isSavingRevision,
  persistRevision,
  isQueueingRender,
  handleQueueRender,
  renderJob,
  renderOutputAsset,
  surfaceError,
}: MotionStudioRightPanelProps) {
  return (
    <div className="space-y-6">
      <SectionCard className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <AppSectionLabel>Guardrails</AppSectionLabel>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
              Template policy
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SubtleBadge className={blockingIssues.length > 0 ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>
              {blockingIssues.length > 0 ? `${blockingIssues.length} blocking` : "render-ready"}
            </SubtleBadge>
            {warningIssues.length > 0 ? (
              <SubtleBadge className="border-amber-200 bg-amber-50 text-amber-700">{warningIssues.length} warnings</SubtleBadge>
            ) : null}
          </div>
        </div>

        <div className="space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
          {selectedTemplate.guardrailNotes.map((note: string) => (
            <p key={note}>{note}</p>
          ))}
        </div>

        {issues.length > 0 ? (
          <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            {issues.map((issue) => (
              <p
                key={`${issue.level}-${issue.message}`}
                className={
                  issue.level === "error"
                    ? "text-sm leading-6 text-rose-700"
                    : "text-sm leading-6 text-amber-700"
                }
              >
                {issue.message}
              </p>
            ))}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard className="overflow-hidden p-0">
        <div className="border-b border-[var(--border)] px-6 py-5">
          <AppSectionLabel>Dynamic props</AppSectionLabel>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            Template controls
          </h2>
        </div>
        <ScrollArea className="h-[640px]">
          <div className="p-6">
            <VideoStudioRemotionPropsPanel
              template={selectedTemplate}
              values={values}
              issues={issues}
              assets={assetOptions}
              onChange={updateValue}
            />
          </div>
        </ScrollArea>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <AppSectionLabel>Canonical render</AppSectionLabel>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
              Save, queue and observe
            </h2>
          </div>
          <SubtleBadge variant="outline">layer-compositor + remotion-render</SubtleBadge>
        </div>

        <div className="space-y-3">
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            Each save creates a new `layer_composition` revision. Render always targets a saved revision and reuses the existing job flow.
          </p>

          <div className="space-y-2">
            <AppSectionLabel>Project binding</AppSectionLabel>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project binding</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => void persistRevision()} disabled={isSavingRevision || blockingIssues.length > 0}>
            {isSavingRevision ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save revision
          </Button>
          <Button className="rounded-xl" onClick={() => void handleQueueRender()} disabled={isQueueingRender || blockingIssues.length > 0}>
            {isQueueingRender ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Queue Remotion render
          </Button>
        </div>

        {renderJob ? (
          <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{(renderJob as any).job_type || renderJob.type || 'render'}</p>
              <SubtleBadge className={getStatusBadgeClass(renderJob.status)}>{renderJob.status}</SubtleBadge>
            </div>
            <div className="grid gap-2 text-sm text-[var(--text-secondary)]">
              <p>Job id: {renderJob.id}</p>
              <p>Started: {formatDateTime(renderJob.started_at)}</p>
              <p>Updated: {formatRelative(renderJob.updated_at)}</p>
              <p>Provider: {renderJob.provider_name || "video-runtime"}</p>
            </div>
            {renderJob.error_message ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {renderJob.error_message}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
            No render job queued from this surface yet.
          </div>
        )}

        {renderOutputAsset?.public_url ? (
          <div className="space-y-3">
            <AppSectionLabel>Latest output asset</AppSectionLabel>
            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-black">
              {renderOutputAsset.asset_type.includes("video") ? (
                <video src={renderOutputAsset.public_url} controls className="h-full w-full object-cover" />
              ) : (
                <img src={renderOutputAsset.public_url} alt={renderOutputAsset.file_name || "Render output"} className="h-full w-full object-cover" />
              )}
            </div>
          </div>
        ) : null}
      </SectionCard>

      {surfaceError ? (
        <SectionCard className="border-amber-200 bg-amber-50/80">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200 bg-white text-amber-700">
              <AlertTriangle size={18} />
            </div>
            <div>
              <AppSectionLabel>Surface status</AppSectionLabel>
              <p className="mt-2 text-sm leading-7 text-amber-900">{surfaceError}</p>
            </div>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
