import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import type { ScrollSection } from "@/lib/video-studio";
import { resolveScrollSectionMotionContract } from "@/lib/video-studio";

const SectionWrapper = ({
  effect,
  pin = false,
  children,
}: {
  effect: string;
  pin?: boolean;
  children: ReactNode;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const yParallax = useTransform(scrollYProgress, [0, 1], [90, -90]);
  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0.2, 1, 1, 0.4]);
  const scale = useTransform(scrollYProgress, [0, 0.35, 1], [0.92, 1, 1.04]);
  const rotateX = useTransform(scrollYProgress, [0, 0.4, 1], [8, 0, -6]);
  const translateX = useTransform(scrollYProgress, [0, 1], [0, -220]);
  const wrapperClassName = pin || effect === "sticky" ? "sticky top-8" : undefined;
  const wrapperStyle = effect === "tilt_3d" ? { perspective: "1400px" } : undefined;
  let inner: ReactNode = children;

  if (effect === "parallax") {
    inner = <motion.div style={{ y: yParallax }}>{children}</motion.div>;
  } else if (effect === "sticky") {
    inner = children;
  } else if (effect === "reveal") {
    inner = <motion.div style={{ opacity, scale }}>{children}</motion.div>;
  } else if (effect === "horizontal") {
    inner = <motion.div style={{ x: translateX }}>{children}</motion.div>;
  } else if (effect === "scale_fade") {
    inner = <motion.div style={{ scale, opacity }}>{children}</motion.div>;
  } else if (effect === "tilt_3d") {
    inner = <motion.div style={{ rotateX, scale, transformOrigin: "top center" }}>{children}</motion.div>;
  }

  return (
    <div ref={ref} className={wrapperClassName} style={wrapperStyle}>
      {inner}
    </div>
  );
};

export default function MotionSectionRenderer({
  section,
  backgroundVideoUrl,
  backgroundImageUrl,
  compact = false,
}: {
  section: ScrollSection;
  backgroundVideoUrl?: string | null;
  backgroundImageUrl?: string | null;
  compact?: boolean;
}) {
  const content = section.content || {};
  const presentation = useMemo(
    () => resolveScrollSectionMotionContract(section, { backgroundVideoUrl, backgroundImageUrl }),
    [backgroundImageUrl, backgroundVideoUrl, section],
  );
  const theme = presentation.composition.theme;
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: wrapperRef, offset: ["start end", "end start"] });
  const scrubProgress = useTransform(scrollYProgress, [0, 1], [0, 1]);

  useEffect(() => {
    if (section.scroll_effect_type !== "video_scrub") return;
    return scrubProgress.on("change", (value) => {
      const video = videoRef.current;
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
      video.currentTime = video.duration * value;
    });
  }, [scrubProgress, section.scroll_effect_type]);

  const backgroundStyle = useMemo(() => {
    if (presentation.backgroundKind === "image" && backgroundImageUrl) {
      return {
        background: `linear-gradient(135deg, rgba(3,7,18,0.72), rgba(9,9,11,0.5)), url(${backgroundImageUrl}) center/cover`,
        backgroundBlendMode: presentation.composition.background.blend_mode as CSSProperties["backgroundBlendMode"],
      };
    }

    return {
      background: `radial-gradient(circle at top right, ${theme.accent}33, transparent 45%), linear-gradient(135deg, ${theme.secondary}, ${theme.primary}22)`,
    };
  }, [backgroundImageUrl, presentation.backgroundKind, presentation.composition.background.blend_mode, theme.accent, theme.primary, theme.secondary]);

  return (
    <div ref={wrapperRef} className={compact ? "min-h-[380px]" : "min-h-[560px]"}>
      <SectionWrapper effect={section.scroll_effect_type} pin={presentation.composition.transition.pin}>
        <section
          className="relative overflow-hidden rounded-[32px] border border-white/10"
          style={backgroundStyle}
        >
          {presentation.backgroundKind === "video" && backgroundVideoUrl ? (
              <video
                ref={videoRef}
                src={backgroundVideoUrl}
                className="absolute inset-0 h-full w-full object-cover"
                autoPlay={presentation.composition.transition.media_mode !== "timeline"}
                muted
                loop={presentation.composition.transition.media_mode !== "timeline"}
                playsInline
                style={{ opacity: presentation.composition.background.opacity }}
              />
            ) : null}

          <div className="relative z-10 grid min-h-[inherit] gap-8 px-8 py-12 md:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] md:px-12 md:py-16">
            <div className="flex flex-col justify-between gap-8">
              <div className="space-y-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
                  {section.scroll_effect_type.replace("_", " ")}
                </p>
                <h3
                  className="max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl"
                  style={{ fontFamily: theme.headline_font || "inherit" }}
                >
                  {String(content.headline || section.name)}
                </h3>
                <p
                  className="max-w-2xl text-base leading-8 text-white/75 md:text-lg"
                  style={{ fontFamily: theme.body_font || "inherit" }}
                >
                  {String(content.body || "")}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="rounded-full px-5 py-3 text-sm font-semibold text-black"
                  style={{ backgroundColor: theme.accent || "#F59E0B" }}
                >
                  {String(content.cta || "Saiba mais")}
                </button>
                <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white/65">
                  motion section
                </span>
              </div>
            </div>

            <div className="flex items-end justify-end">
              <div className="w-full max-w-sm rounded-[28px] border border-white/15 bg-black/25 p-5 backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Renderer Config</p>
                <div className="mt-4 space-y-3 text-sm text-white/70">
                  <div className="flex items-center justify-between gap-4">
                    <span>Effect</span>
                    <span className="font-medium text-white">{presentation.effectLabel}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Media mode</span>
                    <span className="font-medium text-white">{presentation.composition.transition.media_mode}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Background</span>
                    <span className="font-medium text-white">{presentation.backgroundKind}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Composition</span>
                    <span className="font-medium text-white">v{presentation.composition.version}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Transition</span>
                    <span className="font-medium text-white">{presentation.transitionLabel}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Primary</span>
                    <span className="font-medium text-white">{theme.primary || "#7C3AED"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Accent</span>
                    <span className="font-medium text-white">{theme.accent || "#F59E0B"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </SectionWrapper>
    </div>
  );
}
