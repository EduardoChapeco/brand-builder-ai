import SectionCard from "@/components/shared/SectionCard";
import AppSectionLabel from "@/components/shared/AppSectionLabel";
import type { VideoJob, VideoExport, VideoSubtitleTrack, AIGeneratedVideo, ScrollSection } from "@/lib/video-studio";

const STATUS_CLASS: Record<string, string> = {
  queued: "bg-amber-500/10 text-amber-200",
  running: "bg-sky-500/10 text-sky-200",
  completed: "bg-emerald-500/10 text-emerald-200",
  failed: "bg-rose-500/10 text-rose-200",
  cancelled: "bg-zinc-500/10 text-zinc-200",
};

export default function VideoJobStatusCard({
  title = "Último job",
  job,
  exportInfo,
  subtitleTrack,
  generation,
  section,
  onRefresh,
}: {
  title?: string;
  job: VideoJob | null;
  exportInfo?: VideoExport | null;
  subtitleTrack?: VideoSubtitleTrack | null;
  generation?: AIGeneratedVideo | null;
  section?: ScrollSection | null;
  onRefresh?: () => void;
}) {
  if (!job) {
    return (
      <SectionCard className="space-y-3">
        <AppSectionLabel>{title}</AppSectionLabel>
        <p className="text-sm text-[var(--text-secondary)]">
          Nenhum job disparado nesta superfície ainda.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <AppSectionLabel>{title}</AppSectionLabel>
          <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{job.job_type}</h3>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASS[job.status] || STATUS_CLASS.queued}`}>
          {job.status}
        </div>
      </div>

      <div className="grid gap-3 text-sm text-[var(--text-secondary)] md:grid-cols-2">
        <div>
          <span className="font-medium text-[var(--text-primary)]">Provider:</span>{" "}
          {job.provider_name || "runtime/local"}
        </div>
        <div>
          <span className="font-medium text-[var(--text-primary)]">Started:</span>{" "}
          {job.started_at || "not started"}
        </div>
        {exportInfo ? (
          <div>
            <span className="font-medium text-[var(--text-primary)]">Export:</span>{" "}
            {exportInfo.export_preset} {exportInfo.width}x{exportInfo.height}
          </div>
        ) : null}
        {subtitleTrack ? (
          <div>
            <span className="font-medium text-[var(--text-primary)]">Subtitles:</span>{" "}
            {subtitleTrack.words_json.length} words
          </div>
        ) : null}
        {generation ? (
          <div>
            <span className="font-medium text-[var(--text-primary)]">Generation:</span>{" "}
            {generation.style_template || "custom"} / {generation.camera_movement || "static"}
          </div>
        ) : null}
        {section ? (
          <div>
            <span className="font-medium text-[var(--text-primary)]">Motion:</span>{" "}
            {section.scroll_effect_type}
          </div>
        ) : null}
      </div>

      {job.error_message ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {job.error_message}
        </div>
      ) : null}

      {onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          className="text-sm font-medium text-[var(--workspace-brand)] transition-opacity hover:opacity-80"
        >
          Atualizar status
        </button>
      ) : null}
    </SectionCard>
  );
}
