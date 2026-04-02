import { RefObject } from "react";
import { FastForward, Pause, Play, RefreshCcw, Rewind } from "lucide-react";
import { Player, type PlayerRef } from "@remotion/player";
import { Button } from "@/components/ui/button";
import AppSectionLabel from "@/components/shared/AppSectionLabel";
import SectionCard from "@/components/shared/SectionCard";
import SubtleBadge from "@/components/shared/SubtleBadge";
import VideoStudioRemotionComposition from "@/components/video/VideoStudioRemotionComposition";
import VideoStudioRemotionTimeline from "@/components/video/VideoStudioRemotionTimeline";

type MotionStudioMiddlePanelProps = {
  playerRef: RefObject<PlayerRef>;
  playerConfig: any;
  dirty: boolean;
  selectedTemplate: any;
  values: Record<string, unknown>;
  sequences: any[];
  visualAssetMap: Record<string, any>;
  currentFrame: number;
  isPlaying: boolean;
  stepFrame: (delta: number) => void;
  jumpToFrame: (frame: number) => void;
  selectedSequenceId: string | null;
  setSelectedSequenceId: (id: string | null) => void;
  selectedSequence: any;
};

export default function MotionStudioMiddlePanel({
  playerRef,
  playerConfig,
  dirty,
  selectedTemplate,
  values,
  sequences,
  visualAssetMap,
  currentFrame,
  isPlaying,
  stepFrame,
  jumpToFrame,
  selectedSequenceId,
  setSelectedSequenceId,
  selectedSequence,
}: MotionStudioMiddlePanelProps) {
  return (
    <div className="space-y-6">
      <SectionCard className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <AppSectionLabel>Remotion preview</AppSectionLabel>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
              Live guarded composition
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Local preview is driven by the selected template, current props and saved asset references.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SubtleBadge variant="outline">{playerConfig.ratio}</SubtleBadge>
            <SubtleBadge variant="outline">{playerConfig.fps} fps</SubtleBadge>
            <SubtleBadge variant={dirty ? "brand" : "outline"}>{dirty ? "Unsaved changes" : "Synced revision"}</SubtleBadge>
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[#050505]">
          <Player
            ref={playerRef}
            component={VideoStudioRemotionComposition}
            durationInFrames={playerConfig.durationInFrames}
            compositionWidth={playerConfig.width}
            compositionHeight={playerConfig.height}
            fps={playerConfig.fps}
            inputProps={{
              templateLabel: selectedTemplate.label,
              values,
              sequences,
              assets: visualAssetMap,
            }}
            controls
            acknowledgeRemotionLicense
            className="w-full"
            style={{ width: "100%", aspectRatio: `${playerConfig.width}/${playerConfig.height}` }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => playerRef.current?.pauseAndReturnToPlayStart()}>
            <RefreshCcw size={14} />
            Restart
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={() => stepFrame(-15)}>
            <Rewind size={14} />
            -15f
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={() => playerRef.current?.toggle()}>
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            Toggle
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={() => stepFrame(15)}>
            <FastForward size={14} />
            +15f
          </Button>
          {selectedSequence ? (
            <Button variant="outline" className="rounded-xl" onClick={() => jumpToFrame(selectedSequence.startFrame)}>
              Jump to selected
            </Button>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard>
        <VideoStudioRemotionTimeline
          sequences={sequences}
          totalFrames={playerConfig.durationInFrames}
          currentFrame={currentFrame}
          selectedSequenceId={selectedSequenceId}
          onSelectSequence={setSelectedSequenceId}
          onJumpToFrame={jumpToFrame}
        />
      </SectionCard>
    </div>
  );
}
