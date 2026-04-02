import AppSectionLabel from "@/components/shared/AppSectionLabel";
import SubtleBadge from "@/components/shared/SubtleBadge";
import type { MotionStudioSequence } from "@/components/video/VideoStudioRemotionTemplates";
import { cn } from "@/lib/utils";

const formatFrames = (value: number) => `${value}f`;

export default function VideoStudioRemotionTimeline({
  sequences,
  totalFrames,
  currentFrame,
  selectedSequenceId,
  onSelectSequence,
  onJumpToFrame,
}: {
  sequences: MotionStudioSequence[];
  totalFrames: number;
  currentFrame: number;
  selectedSequenceId: string | null;
  onSelectSequence: (sequenceId: string) => void;
  onJumpToFrame: (frame: number) => void;
}) {
  const tracks = Array.from(new Set(sequences.map((sequence) => sequence.track))).sort((left, right) => left - right);
  const selectedSequence = sequences.find((sequence) => sequence.id === selectedSequenceId) || null;
  const playhead = totalFrames > 0 ? Math.max(0, Math.min(100, (currentFrame / totalFrames) * 100)) : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <AppSectionLabel>Sequence timeline</AppSectionLabel>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Click any sequence to jump the player and inspect the current beat.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SubtleBadge variant="outline">Playhead {formatFrames(currentFrame)}</SubtleBadge>
          <SubtleBadge variant="outline">Total {formatFrames(totalFrames)}</SubtleBadge>
        </div>
      </div>

      <div className="space-y-4">
        {tracks.map((track) => (
          <div key={`track-${track}`} className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Track {track + 1}
            </p>
            <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3">
              <div
                className="pointer-events-none absolute bottom-0 top-0 w-px bg-[var(--workspace-brand)]/70"
                style={{ left: `${playhead}%` }}
              />
              <div className="relative h-16">
                {sequences
                  .filter((sequence) => sequence.track === track)
                  .map((sequence) => {
                    const left = (sequence.startFrame / totalFrames) * 100;
                    const width = (sequence.durationInFrames / totalFrames) * 100;
                    const isSelected = sequence.id === selectedSequenceId;

                    return (
                      <button
                        key={sequence.id}
                        type="button"
                        onClick={() => {
                          onSelectSequence(sequence.id);
                          onJumpToFrame(sequence.startFrame);
                        }}
                        className={cn(
                          "absolute top-2 h-12 overflow-hidden rounded-xl border px-3 text-left transition-all",
                          isSelected
                            ? "border-[var(--workspace-brand-border)] bg-[var(--workspace-brand-soft)]"
                            : "border-[var(--border)] bg-[var(--surface-card)] hover:border-[var(--border-strong)]",
                        )}
                        style={{ left: `${left}%`, width: `${Math.max(width, 8)}%` }}
                      >
                        <div className="truncate text-xs font-semibold text-[var(--text-primary)]">{sequence.label}</div>
                        <div className="truncate text-[11px] text-[var(--text-secondary)]">
                          {formatFrames(sequence.startFrame)} - {formatFrames(sequence.startFrame + sequence.durationInFrames)}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedSequence ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedSequence.label}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {selectedSequence.headline || selectedSequence.body || "This sequence currently carries layout state only."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SubtleBadge variant="outline">Track {selectedSequence.track + 1}</SubtleBadge>
              <SubtleBadge variant="outline">{formatFrames(selectedSequence.durationInFrames)}</SubtleBadge>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
