import type { CSSProperties } from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { MotionStudioSequence } from "@/components/video/VideoStudioRemotionTemplates";

type VisualAssetMap = Record<
  string,
  {
    publicUrl: string | null;
    assetType: string;
    label: string;
  }
>;

export type VideoStudioRemotionCompositionProps = {
  templateLabel: string;
  values: Record<string, unknown>;
  sequences: MotionStudioSequence[];
  assets: VisualAssetMap;
};

const asString = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
const asBoolean = (value: unknown, fallback = false) => (typeof value === "boolean" ? value : fallback);

const SequenceCard = ({
  sequence,
  accentColor,
  captionStrip,
}: {
  sequence: MotionStudioSequence;
  accentColor: string;
  captionStrip: boolean;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    fps,
    frame,
    config: { damping: 200, mass: 0.85, stiffness: 140 },
  });
  const fadeOut = interpolate(
    frame,
    [Math.max(sequence.durationInFrames - 10, 0), sequence.durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const opacity = enter * fadeOut;
  const translateY = interpolate(enter, [0, 1], [48, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cardStyle: CSSProperties = {
    opacity,
    transform: `translateY(${translateY}px) scale(${0.96 + enter * 0.04})`,
  };

  if (sequence.kind === "badge") {
    return (
      <AbsoluteFill style={{ justifyContent: "space-between", padding: 44, pointerEvents: "none" }}>
        <div className="flex items-start justify-between">
          <div
            className="rounded-full border border-white/15 bg-black/35 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur-xl"
            style={cardStyle}
          >
            {sequence.eyebrow || "Motion"}
          </div>
          {sequence.accentText ? (
            <div
              className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-black"
              style={{ ...cardStyle, backgroundColor: accentColor }}
            >
              {sequence.accentText}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: 44, pointerEvents: "none" }}>
      <div
        className="max-w-[72%] rounded-[32px] border border-white/12 bg-black/35 px-8 py-8 shadow-[0_18px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl"
        style={cardStyle}
      >
        {sequence.eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">{sequence.eyebrow}</p>
        ) : null}
        {sequence.headline ? (
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
            {sequence.headline}
          </h2>
        ) : null}
        {sequence.body ? (
          <p className="mt-4 max-w-3xl text-base leading-8 text-white/76 md:text-lg">{sequence.body}</p>
        ) : null}

        {sequence.kind === "proof" && sequence.accentText ? (
          <div className="mt-6 flex items-center gap-3">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: accentColor }} />
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-white/72">
              {sequence.accentText}
            </span>
          </div>
        ) : null}

        {sequence.kind === "cta" && sequence.ctaLabel ? (
          <div className="mt-8 inline-flex items-center gap-3 rounded-full px-5 py-3 text-sm font-semibold text-black" style={{ backgroundColor: accentColor }}>
            {sequence.ctaLabel}
          </div>
        ) : null}
      </div>

      {captionStrip && (sequence.body || sequence.headline) ? (
        <div className="pointer-events-none mt-auto flex justify-center px-10 pb-8">
          <div className="max-w-[82%] rounded-2xl border border-white/12 bg-black/45 px-4 py-3 text-sm leading-6 text-white/82 backdrop-blur-xl">
            {sequence.body || sequence.headline}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export default function VideoStudioRemotionComposition({
  templateLabel,
  values,
  sequences,
  assets,
}: VideoStudioRemotionCompositionProps) {
  const accentColor = asString(values.accentColor, "#F59E0B");
  const backgroundAssetId = asString(values.backgroundAssetId);
  const logoAssetId = asString(values.logoAssetId);
  const backgroundAsset = backgroundAssetId ? assets[backgroundAssetId] : undefined;
  const logoAsset = logoAssetId ? assets[logoAssetId] : undefined;
  const captionStrip = asBoolean(values.captionsEnabled, false);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at top right, ${accentColor}38, transparent 32%), linear-gradient(135deg, #08090c 0%, #10131b 54%, #060606 100%)`,
        overflow: "hidden",
      }}
    >
      {backgroundAsset?.publicUrl ? (
        backgroundAsset.assetType.includes("video") ? (
          <video
            src={backgroundAsset.publicUrl}
            muted
            loop
            autoPlay
            playsInline
            className="absolute inset-0 h-full w-full object-cover opacity-45"
          />
        ) : (
          <img
            src={backgroundAsset.publicUrl}
            alt={backgroundAsset.label}
            className="absolute inset-0 h-full w-full object-cover opacity-50"
          />
        )
      ) : null}

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,4,6,0.16)_0%,rgba(4,4,6,0.46)_40%,rgba(4,4,6,0.72)_100%)]" />
      <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.28) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />

      {logoAsset?.publicUrl && asBoolean(values.showLogo, false) ? (
        <div className="absolute right-10 top-10 z-20 overflow-hidden rounded-2xl border border-white/12 bg-black/25 p-2 backdrop-blur-xl">
          <img src={logoAsset.publicUrl} alt="Logo" className="h-10 w-10 rounded-xl object-cover" />
        </div>
      ) : null}

      <div className="absolute bottom-10 left-10 z-20 rounded-full border border-white/12 bg-black/35 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55 backdrop-blur-xl">
        {templateLabel}
      </div>

      {sequences.map((sequence) => (
        <Sequence key={sequence.id} from={sequence.startFrame} durationInFrames={sequence.durationInFrames}>
          <SequenceCard sequence={sequence} accentColor={accentColor} captionStrip={captionStrip && sequence.kind !== "badge"} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
