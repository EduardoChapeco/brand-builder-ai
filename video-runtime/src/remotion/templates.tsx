import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type MotionBrandBindings = {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  accentColor?: string;
  textColor?: string;
  headlineFont?: string;
  bodyFont?: string;
  accentFont?: string;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  watermarkText?: string | null;
};

export type MotionSlide = {
  title?: string;
  body?: string;
  accentColor?: string;
  imageUrl?: string | null;
};

export type MotionDataPoint = {
  label?: string;
  value?: number;
  suffix?: string;
  color?: string;
};

export type MotionLowerThird = {
  name?: string;
  title?: string;
  position?: "bottom-left" | "bottom-center";
};

export type MotionTemplateProps = {
  templateKey?: string;
  title?: string;
  subtitle?: string | null;
  ctaText?: string | null;
  tagline?: string | null;
  slides?: MotionSlide[];
  dataPoints?: MotionDataPoint[];
  lowerThird?: MotionLowerThird | null;
  brand?: MotionBrandBindings;
  dimensions?: {
    width?: number;
    height?: number;
  };
  durationInFrames?: number;
  fps?: number;
};

const withDefaultBrand = (brand: MotionBrandBindings | undefined): Required<MotionBrandBindings> => ({
  primaryColor: brand?.primaryColor || "#7C3AED",
  secondaryColor: brand?.secondaryColor || "#0F172A",
  backgroundColor: brand?.backgroundColor || "#09090B",
  accentColor: brand?.accentColor || "#F59E0B",
  textColor: brand?.textColor || "#F8FAFC",
  headlineFont: brand?.headlineFont || "Inter",
  bodyFont: brand?.bodyFont || "Inter",
  accentFont: brand?.accentFont || "Inter",
  logoUrl: brand?.logoUrl || null,
  logoDarkUrl: brand?.logoDarkUrl || null,
  watermarkText: brand?.watermarkText || null,
});

const animatedGradient = (frame: number, speed = 0.6) => {
  const angle = (frame * speed) % 360;
  return `linear-gradient(${angle}deg, rgba(124,58,237,0.95), rgba(15,23,42,0.88) 38%, rgba(245,158,11,0.9) 100%)`;
};

const FrameShell = ({
  children,
  brand,
}: {
  children: React.ReactNode;
  brand: Required<MotionBrandBindings>;
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: animatedGradient(frame),
        color: brand.textColor,
        fontFamily: brand.bodyFont,
        overflow: "hidden",
      }}
    >
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at top left, rgba(255,255,255,0.18), transparent 30%), radial-gradient(circle at bottom right, rgba(255,255,255,0.12), transparent 28%)",
          mixBlendMode: "screen",
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

const LowerThirdOverlay = ({
  lowerThird,
  brand,
}: {
  lowerThird: MotionLowerThird;
  brand: Required<MotionBrandBindings>;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    fps,
    frame,
    config: { damping: 14, stiffness: 120 },
  });
  const translateX = interpolate(progress, [0, 1], [-180, 0]);
  const bottom = lowerThird.position === "bottom-center" ? 64 : 48;
  const left = lowerThird.position === "bottom-center" ? "50%" : "5%";
  const transform = lowerThird.position === "bottom-center"
    ? `translateX(-50%) translateX(${translateX}px)`
    : `translateX(${translateX}px)`;

  return (
    <div
      style={{
        position: "absolute",
        left,
        bottom,
        transform,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "18px 24px",
        minWidth: 380,
        borderRadius: 24,
        background: "rgba(0,0,0,0.55)",
        border: `1px solid ${brand.accentColor}55`,
        boxShadow: "0 16px 40px rgba(0,0,0,0.28)",
      }}
    >
      <span style={{ fontSize: 28, fontWeight: 700 }}>{lowerThird.name || "Nome"}</span>
      <span style={{ fontSize: 18, color: "rgba(255,255,255,0.74)" }}>{lowerThird.title || "Cargo"}</span>
    </div>
  );
};

const SocialPostTemplate = ({ props, vertical = false }: { props: MotionTemplateProps; vertical?: boolean }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const brand = withDefaultBrand(props.brand);
  const titleScale = spring({
    fps,
    frame,
    config: { damping: 14, stiffness: 160, mass: 0.6 },
  });
  const subtitleOpacity = interpolate(frame, [12, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ctaOpacity = interpolate(frame, [28, 58], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <FrameShell brand={brand}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "100%",
          padding: vertical ? "120px 84px" : "88px 84px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div
            style={{
              fontSize: 16,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              opacity: 0.72,
            }}
          >
            Cerebro Motion
          </div>
          {brand.logoUrl ? (
            <Img
              src={brand.logoUrl}
              style={{ width: 120, height: 120, objectFit: "contain" }}
            />
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontFamily: brand.headlineFont,
              fontSize: vertical ? 120 : 92,
              fontWeight: 800,
              lineHeight: 0.92,
              letterSpacing: "-0.05em",
              transform: `scale(${0.85 + titleScale * 0.15})`,
              transformOrigin: "left center",
              maxWidth: vertical ? "82%" : "74%",
            }}
          >
            {props.title || "Headline que prende atencao"}
          </div>
          <div
            style={{
              maxWidth: vertical ? "80%" : "62%",
              fontSize: vertical ? 32 : 28,
              lineHeight: 1.35,
              color: "rgba(255,255,255,0.82)",
              opacity: subtitleOpacity,
            }}
          >
            {props.subtitle || "Subtitulo com contexto, prova e motivo para agir agora."}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18, opacity: ctaOpacity }}>
          <div
            style={{
              background: brand.accentColor,
              color: "#111827",
              fontFamily: brand.accentFont,
              fontWeight: 700,
              fontSize: 28,
              borderRadius: 999,
              padding: "18px 32px",
              boxShadow: `0 18px 45px ${brand.accentColor}55`,
            }}
          >
            {props.ctaText || "Saiba mais"}
          </div>
          <div style={{ fontSize: 18, opacity: 0.56 }}>
            {brand.watermarkText || "brand-ready motion"}
          </div>
        </div>
      </div>
      {props.lowerThird ? <LowerThirdOverlay lowerThird={props.lowerThird} brand={brand} /> : null}
    </FrameShell>
  );
};

const AnimatedCarouselTemplate = ({ props }: { props: MotionTemplateProps }) => {
  const brand = withDefaultBrand(props.brand);
  const slides = props.slides && props.slides.length > 0
    ? props.slides
    : [{ title: props.title || "Slide 1", body: props.subtitle || "Contexto do carrossel" }];
  const { durationInFrames = 180 } = props;
  const slideDuration = Math.max(50, Math.floor(durationInFrames / slides.length));

  return (
    <FrameShell brand={brand}>
      {slides.map((slide, index) => (
        <Sequence key={`${slide.title || "slide"}-${index}`} from={index * slideDuration} durationInFrames={slideDuration}>
          <CarouselSlide slide={slide} brand={brand} />
        </Sequence>
      ))}
    </FrameShell>
  );
};

const CarouselSlide = ({
  slide,
  brand,
}: {
  slide: MotionSlide;
  brand: Required<MotionBrandBindings>;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, 10, 44, 58], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [0, 20], [80, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const progress = spring({ frame, fps, config: { damping: 14, stiffness: 110 } });
  const scale = interpolate(progress, [0, 1], [0.92, 1]);

  return (
    <div
      style={{
        height: "100%",
        display: "grid",
        gridTemplateColumns: slide.imageUrl ? "1.1fr 0.9fr" : "1fr",
        gap: 36,
        alignItems: "center",
        padding: "88px 84px",
        opacity,
        transform: `translateY(${y}px) scale(${scale})`,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 18, letterSpacing: "0.26em", textTransform: "uppercase", opacity: 0.64 }}>
          Animated Carousel
        </div>
        <div style={{ fontFamily: brand.headlineFont, fontSize: 84, fontWeight: 800, lineHeight: 0.94, letterSpacing: "-0.05em" }}>
          {slide.title || "Headline do slide"}
        </div>
        <div style={{ maxWidth: 760, fontSize: 28, lineHeight: 1.38, color: "rgba(255,255,255,0.8)" }}>
          {slide.body || "Texto complementar do slide animado."}
        </div>
      </div>
      {slide.imageUrl ? (
        <div
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Img
            src={slide.imageUrl}
            style={{
              width: "100%",
              maxHeight: 920,
              objectFit: "cover",
              borderRadius: 40,
              border: "1px solid rgba(255,255,255,0.18)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.32)",
            }}
          />
        </div>
      ) : null}
    </div>
  );
};

const LogoRevealTemplate = ({ props }: { props: MotionTemplateProps }) => {
  const brand = withDefaultBrand(props.brand);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = spring({ fps, frame, config: { damping: 12, stiffness: 120, mass: 0.75 } });
  const subtitleOpacity = interpolate(frame, [30, 58], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <FrameShell brand={brand}>
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 28,
          textAlign: "center",
        }}
      >
        <div
          style={{
            transform: `scale(${0.82 + reveal * 0.18})`,
            opacity: reveal,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
          }}
        >
          {brand.logoUrl ? (
            <Img src={brand.logoUrl} style={{ width: 260, height: 260, objectFit: "contain" }} />
          ) : null}
          <div style={{ fontSize: 88, fontFamily: brand.headlineFont, fontWeight: 800, letterSpacing: "-0.05em" }}>
            {props.title || brand.watermarkText || "Brand Reveal"}
          </div>
        </div>
        <div style={{ fontSize: 28, opacity: subtitleOpacity, color: "rgba(255,255,255,0.78)" }}>
          {props.tagline || props.subtitle || "Motion identity pronta para intro, outro e hero."}
        </div>
      </div>
    </FrameShell>
  );
};

const HeroBackgroundTemplate = ({ props }: { props: MotionTemplateProps }) => {
  const brand = withDefaultBrand(props.brand);
  const frame = useCurrentFrame();
  const offset = interpolate(frame, [0, props.durationInFrames || 240], [0, 220]);

  return (
    <FrameShell brand={brand}>
      <AbsoluteFill
        style={{
          background:
            `radial-gradient(circle at 15% 20%, ${brand.accentColor}55, transparent 20%), radial-gradient(circle at 85% 28%, ${brand.primaryColor}66, transparent 26%), radial-gradient(circle at 50% 75%, ${brand.secondaryColor}88, transparent 22%)`,
          transform: `translate3d(${offset}px, ${offset * -0.35}px, 0) scale(1.12)`,
          filter: "blur(24px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "center" }}>
          <div style={{ fontSize: 18, letterSpacing: "0.26em", textTransform: "uppercase", opacity: 0.54 }}>Motion Site</div>
          <div style={{ fontFamily: brand.headlineFont, fontSize: 86, fontWeight: 800, letterSpacing: "-0.05em" }}>
            {props.title || "Hero Background"}
          </div>
          <div style={{ maxWidth: 980, fontSize: 28, lineHeight: 1.38, color: "rgba(255,255,255,0.78)" }}>
            {props.subtitle || "Loop animado para hero, transicoes e secoes sticky do site."}
          </div>
        </div>
      </div>
    </FrameShell>
  );
};

const DataSummaryTemplate = ({ props }: { props: MotionTemplateProps }) => {
  const brand = withDefaultBrand(props.brand);
  const points = props.dataPoints && props.dataPoints.length > 0
    ? props.dataPoints
    : [{ label: "Engajamento", value: 42 }, { label: "CTR", value: 18 }];

  return (
    <FrameShell brand={brand}>
      <div style={{ padding: "72px 84px", display: "flex", flexDirection: "column", height: "100%", gap: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 18, letterSpacing: "0.24em", textTransform: "uppercase", opacity: 0.6 }}>
            Data Summary
          </div>
          <div style={{ fontFamily: brand.headlineFont, fontSize: 84, fontWeight: 800, lineHeight: 0.95, letterSpacing: "-0.05em" }}>
            {props.title || "Resultados do periodo"}
          </div>
          <div style={{ fontSize: 28, color: "rgba(255,255,255,0.78)" }}>
            {props.subtitle || "KPIs animados para relatorio, SimLab ou insight video."}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 24, marginTop: 16 }}>
          {points.slice(0, 4).map((point, index) => (
            <DataCard key={`${point.label || "point"}-${index}`} point={point} brand={brand} delay={index * 12} />
          ))}
        </div>
      </div>
    </FrameShell>
  );
};

const DataCard = ({
  point,
  brand,
  delay,
}: {
  point: MotionDataPoint;
  brand: Required<MotionBrandBindings>;
  delay: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    fps,
    frame: Math.max(0, frame - delay),
    config: { damping: 14, stiffness: 120 },
  });
  const value = interpolate(progress, [0, 1], [0, point.value || 0]);
  const barWidth = interpolate(progress, [0, 1], [0, 100]);

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.34)",
        borderRadius: 28,
        padding: 32,
        border: "1px solid rgba(255,255,255,0.14)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{ fontSize: 18, opacity: 0.72 }}>{point.label || "KPI"}</div>
      <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: "-0.05em" }}>
        {Math.round(value)}
        {point.suffix || ""}
      </div>
      <div style={{ height: 12, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${barWidth}%`,
            borderRadius: 999,
            background: point.color || brand.accentColor,
            boxShadow: `0 10px 22px ${(point.color || brand.accentColor)}55`,
          }}
        />
      </div>
    </div>
  );
};

const UnknownTemplate = ({ props }: { props: MotionTemplateProps }) => {
  const brand = withDefaultBrand(props.brand);
  return (
    <FrameShell brand={brand}>
      <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 18, maxWidth: 900 }}>
          <div style={{ fontSize: 22, letterSpacing: "0.22em", textTransform: "uppercase", opacity: 0.56 }}>
            Unsupported Template
          </div>
          <div style={{ fontFamily: brand.headlineFont, fontSize: 84, fontWeight: 800, letterSpacing: "-0.05em" }}>
            {props.title || props.templateKey || "Template nao encontrado"}
          </div>
          <div style={{ fontSize: 28, color: "rgba(255,255,255,0.76)" }}>
            O runtime recebeu um template ainda nao registrado no bundle Remotion do Video Studio.
          </div>
        </div>
      </div>
    </FrameShell>
  );
};

export const MotionTemplate = (props: MotionTemplateProps) => {
  switch (props.templateKey) {
    case "social_post":
      return <SocialPostTemplate props={props} />;
    case "story_vertical":
      return <SocialPostTemplate props={props} vertical />;
    case "animated_carousel":
      return <AnimatedCarouselTemplate props={props} />;
    case "logo_reveal":
      return <LogoRevealTemplate props={props} />;
    case "hero_background":
      return <HeroBackgroundTemplate props={props} />;
    case "data_summary":
      return <DataSummaryTemplate props={props} />;
    default:
      return <UnknownTemplate props={props} />;
  }
};
