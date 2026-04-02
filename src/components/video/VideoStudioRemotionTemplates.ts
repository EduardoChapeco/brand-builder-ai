export type MotionStudioRatio = "9:16" | "1:1" | "16:9";

export type MotionStudioFieldKind =
  | "text"
  | "textarea"
  | "number"
  | "color"
  | "boolean"
  | "select"
  | "asset";

export type MotionStudioFieldGroup = "Setup" | "Copy" | "Timing" | "Look" | "Assets";

export type MotionStudioFieldOption = {
  label: string;
  value: string;
};

export type MotionStudioFieldDefinition = {
  id: string;
  label: string;
  kind: MotionStudioFieldKind;
  group: MotionStudioFieldGroup;
  description?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  options?: MotionStudioFieldOption[];
  assetKinds?: string[];
};

export type MotionStudioSequenceKind =
  | "badge"
  | "hook"
  | "statement"
  | "proof"
  | "quote"
  | "feature"
  | "cta";

export type MotionStudioSequence = {
  id: string;
  label: string;
  kind: MotionStudioSequenceKind;
  startFrame: number;
  durationInFrames: number;
  track: number;
  eyebrow?: string;
  headline?: string;
  body?: string;
  accentText?: string;
  ctaLabel?: string;
};

export type MotionStudioGuardrailIssue = {
  level: "error" | "warning";
  label: string;
  message: string;
  fieldId?: string;
};

export type MotionStudioCommandPatch = {
  summary: string;
  changes: string[];
  nextValues: Record<string, unknown>;
};

export type MotionStudioTemplateDefinition = {
  id: string;
  label: string;
  description: string;
  accentColor: string;
  supportedRatios: MotionStudioRatio[];
  fps: number;
  defaultValues: Record<string, unknown>;
  guardrailNotes: string[];
  fieldDefinitions: MotionStudioFieldDefinition[];
  buildPrompt: (values: Record<string, unknown>) => string;
  buildSequences: (values: Record<string, unknown>) => MotionStudioSequence[];
  validate: (values: Record<string, unknown>) => MotionStudioGuardrailIssue[];
};

type LayerSnapshot = {
  kind: "template_state";
  template_id: string;
  template_label: string;
  prompt_original: string;
  props: Record<string, unknown>;
  ratio: MotionStudioRatio;
  fps: number;
  duration_in_frames: number;
};

type SequenceSnapshot = MotionStudioSequence & {
  kind: "sequence";
};

const ratioOptions: MotionStudioFieldOption[] = [
  { label: "9:16", value: "9:16" },
  { label: "1:1", value: "1:1" },
  { label: "16:9", value: "16:9" },
];

const backgroundModeOptions: MotionStudioFieldOption[] = [
  { label: "Gradient", value: "gradient" },
  { label: "Asset", value: "asset" },
];

const asString = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
const asNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const asBoolean = (value: unknown, fallback = false) => (typeof value === "boolean" ? value : fallback);

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const asRatio = (value: unknown, fallback: MotionStudioRatio): MotionStudioRatio => {
  if (value === "9:16" || value === "1:1" || value === "16:9") return value;
  return fallback;
};

const commonSetupFields: MotionStudioFieldDefinition[] = [
  {
    id: "ratio",
    label: "Aspect ratio",
    kind: "select",
    group: "Setup",
    options: ratioOptions,
    description: "Used for the local Remotion preview and canonical render props.",
  },
  {
    id: "backgroundMode",
    label: "Background mode",
    kind: "select",
    group: "Assets",
    options: backgroundModeOptions,
    description: "Gradient stays local. Asset keeps preview and render props aligned.",
  },
  {
    id: "backgroundAssetId",
    label: "Background asset",
    kind: "asset",
    group: "Assets",
    assetKinds: ["video", "generated_video", "image", "generated_image"],
    description: "Optional image or video asset from the workspace library.",
  },
];

const validateCopyLength = (
  value: string,
  limit: number,
  label: string,
  fieldId: string,
): MotionStudioGuardrailIssue | null => {
  if (value.trim().length <= limit) return null;
  return {
    level: "warning",
    label,
    fieldId,
    message: `${label} is above ${limit} characters and may become unreadable in the composition.`,
  };
};

const validateRequiredText = (
  value: string,
  label: string,
  fieldId: string,
): MotionStudioGuardrailIssue | null => {
  if (value.trim()) return null;
  return {
    level: "error",
    label,
    fieldId,
    message: `${label} is required before saving or rendering this composition.`,
  };
};

const validateBackgroundSelection = (values: Record<string, unknown>) => {
  if (asString(values.backgroundMode, "gradient") !== "asset") return null;
  if (asString(values.backgroundAssetId)) return null;
  return {
    level: "error",
    label: "Background asset",
    fieldId: "backgroundAssetId",
    message: "Asset background mode requires a selected image or video asset.",
  } satisfies MotionStudioGuardrailIssue;
};

const validateDurationRange = (
  values: Record<string, unknown>,
  min: number,
  max: number,
): MotionStudioGuardrailIssue | null => {
  const duration = asNumber(values.durationFrames, min);
  if (duration >= min && duration <= max) return null;
  return {
    level: "error",
    label: "Duration",
    fieldId: "durationFrames",
    message: `Duration must stay between ${min} and ${max} frames for this template.`,
  };
};

const buildLaunchBurstSequences = (values: Record<string, unknown>): MotionStudioSequence[] => {
  const duration = clamp(asNumber(values.durationFrames, 180), 120, 360);
  const hook = clamp(asNumber(values.hookFrames, 42), 24, duration - 72);
  const cta = clamp(asNumber(values.ctaFrames, 36), 24, duration - hook - 24);
  const remainder = Math.max(duration - hook - cta, 36);
  const statement = Math.round(remainder * 0.58);
  const proof = Math.max(remainder - statement, 18);
  const headline = asString(values.headline);
  const body = asString(values.supportingText);
  const ctaLabel = asString(values.ctaText, "Book the demo");

  return [
    {
      id: "badge",
      label: "Brand badge",
      kind: "badge",
      startFrame: 0,
      durationInFrames: duration,
      track: 1,
      eyebrow: asString(values.eyebrow, "Motion Studio"),
      accentText: asString(values.proofText, "Guardrailed preview"),
    },
    {
      id: "hook",
      label: "Hook",
      kind: "hook",
      startFrame: 0,
      durationInFrames: hook,
      track: 0,
      eyebrow: asString(values.eyebrow, "Motion Studio"),
      headline,
      body,
    },
    {
      id: "statement",
      label: "Core statement",
      kind: "statement",
      startFrame: hook,
      durationInFrames: statement,
      track: 0,
      headline,
      body,
      accentText: asString(values.proofText, "3 edits. 1 render. 0 guesswork."),
    },
    {
      id: "proof",
      label: "Proof strip",
      kind: "proof",
      startFrame: hook + statement,
      durationInFrames: proof,
      track: 0,
      headline: asString(values.proofText, "Proof point"),
      body,
      accentText: "Canonical render path",
    },
    {
      id: "cta",
      label: "CTA",
      kind: "cta",
      startFrame: duration - cta,
      durationInFrames: cta,
      track: 0,
      headline,
      body,
      ctaLabel,
    },
  ];
};

const buildProofStackSequences = (values: Record<string, unknown>): MotionStudioSequence[] => {
  const duration = clamp(asNumber(values.durationFrames, 210), 150, 420);
  const hook = clamp(asNumber(values.hookFrames, 36), 24, duration - 96);
  const proof = clamp(asNumber(values.proofFrames, 42), 24, duration - hook - 48);
  const cta = clamp(asNumber(values.ctaFrames, 36), 24, duration - hook - proof - 24);
  const middle = Math.max(duration - hook - proof - cta, 24);
  const featureA = Math.round(middle * 0.5);
  const featureB = Math.max(middle - featureA, 12);
  const bullets = [asString(values.bulletOne), asString(values.bulletTwo), asString(values.bulletThree)]
    .filter(Boolean)
    .join(" | ");

  return [
    {
      id: "badge",
      label: "Proof label",
      kind: "badge",
      startFrame: 0,
      durationInFrames: duration,
      track: 1,
      eyebrow: "Proof stack",
      accentText: asString(values.proofMetric, "27%"),
    },
    {
      id: "hook",
      label: "Hook",
      kind: "hook",
      startFrame: 0,
      durationInFrames: hook,
      track: 0,
      headline: asString(values.headline),
      body: asString(values.supportingText),
    },
    {
      id: "feature-a",
      label: "Feature sequence",
      kind: "feature",
      startFrame: hook,
      durationInFrames: featureA,
      track: 0,
      headline: asString(values.bulletOne, "First proof point"),
      body: bullets,
    },
    {
      id: "feature-b",
      label: "Feature detail",
      kind: "feature",
      startFrame: hook + featureA,
      durationInFrames: featureB,
      track: 0,
      headline: asString(values.bulletTwo, "Second proof point"),
      body: asString(values.bulletThree, bullets),
    },
    {
      id: "proof",
      label: "Metric reveal",
      kind: "proof",
      startFrame: hook + featureA + featureB,
      durationInFrames: proof,
      track: 0,
      headline: asString(values.proofMetric, "27%"),
      body: asString(values.proofLabel, "lift in response rate"),
      accentText: asString(values.supportingText),
    },
    {
      id: "cta",
      label: "CTA",
      kind: "cta",
      startFrame: duration - cta,
      durationInFrames: cta,
      track: 0,
      headline: asString(values.headline),
      body: asString(values.supportingText),
      ctaLabel: asString(values.ctaText, "See the workflow"),
    },
  ];
};

const buildFounderNoteSequences = (values: Record<string, unknown>): MotionStudioSequence[] => {
  const duration = clamp(asNumber(values.durationFrames, 195), 150, 360);
  const hook = clamp(asNumber(values.hookFrames, 30), 20, duration - 108);
  const quoteFrames = clamp(asNumber(values.quoteFrames, 78), 48, duration - hook - 48);
  const cta = clamp(asNumber(values.ctaFrames, 30), 24, duration - hook - quoteFrames - 18);
  const statement = Math.max(duration - hook - quoteFrames - cta, 18);

  return [
    {
      id: "badge",
      label: "Author badge",
      kind: "badge",
      startFrame: 0,
      durationInFrames: duration,
      track: 1,
      eyebrow: asString(values.authorName, "Founder"),
      accentText: asString(values.authorRole, "Perspective"),
    },
    {
      id: "hook",
      label: "Hook",
      kind: "hook",
      startFrame: 0,
      durationInFrames: hook,
      track: 0,
      headline: asString(values.headline),
      body: asString(values.supportingText),
    },
    {
      id: "quote",
      label: "Quote",
      kind: "quote",
      startFrame: hook,
      durationInFrames: quoteFrames,
      track: 0,
      headline: asString(values.quoteText),
      body: `${asString(values.authorName, "Founder")} | ${asString(values.authorRole, "Brand lead")}`,
    },
    {
      id: "statement",
      label: "Positioning",
      kind: "statement",
      startFrame: hook + quoteFrames,
      durationInFrames: statement,
      track: 0,
      headline: asString(values.headline),
      body: asString(values.supportingText),
      accentText: asBoolean(values.captionsEnabled, true) ? "Caption-safe layout" : "Clean layout",
    },
    {
      id: "cta",
      label: "CTA",
      kind: "cta",
      startFrame: duration - cta,
      durationInFrames: cta,
      track: 0,
      headline: asString(values.headline),
      body: asString(values.supportingText),
      ctaLabel: asString(values.ctaText, "Start the review"),
    },
  ];
};

export const MOTION_STUDIO_TEMPLATES: MotionStudioTemplateDefinition[] = [
  {
    id: "launch-burst",
    label: "Launch Burst",
    description: "Fast hook, one sharp proof point and an end-frame CTA for launch-style motion cuts.",
    accentColor: "#F97316",
    supportedRatios: ["9:16", "1:1", "16:9"],
    fps: 30,
    defaultValues: {
      ratio: "9:16",
      durationFrames: 180,
      hookFrames: 42,
      ctaFrames: 36,
      backgroundMode: "gradient",
      backgroundAssetId: "",
      logoAssetId: "",
      showLogo: true,
      eyebrow: "Motion Studio",
      headline: "Launch the story before the feed skips it.",
      supportingText: "Frame one proof point, keep the pacing tight, and land the CTA without bloating the cut.",
      proofText: "3 edits. 1 render. 0 guesswork.",
      ctaText: "Book the demo",
      accentColor: "#F97316",
    },
    guardrailNotes: [
      "Keep the hook under 48 frames to preserve urgency.",
      "Prefer one proof statement instead of a stacked paragraph.",
      "Use asset mode only when the selected media is already approved.",
    ],
    fieldDefinitions: [
      ...commonSetupFields,
      { id: "headline", label: "Headline", kind: "textarea", group: "Copy", required: true },
      { id: "supportingText", label: "Supporting text", kind: "textarea", group: "Copy", required: true },
      { id: "proofText", label: "Proof text", kind: "text", group: "Copy" },
      { id: "ctaText", label: "CTA label", kind: "text", group: "Copy", required: true },
      { id: "showLogo", label: "Show logo chip", kind: "boolean", group: "Assets" },
      {
        id: "logoAssetId",
        label: "Logo asset",
        kind: "asset",
        group: "Assets",
        assetKinds: ["image", "generated_image"],
      },
      { id: "durationFrames", label: "Duration", kind: "number", group: "Timing", min: 120, max: 360, step: 6 },
      { id: "hookFrames", label: "Hook frames", kind: "number", group: "Timing", min: 24, max: 84, step: 6 },
      { id: "ctaFrames", label: "CTA frames", kind: "number", group: "Timing", min: 24, max: 72, step: 6 },
      { id: "accentColor", label: "Accent color", kind: "color", group: "Look" },
    ],
    buildPrompt: (values) =>
      `Launch Burst | ${asString(values.headline)} | ${asString(values.supportingText)} | ${asString(values.proofText)}`,
    buildSequences: buildLaunchBurstSequences,
    validate: (values) => {
      const issues = [
        validateRequiredText(asString(values.headline), "Headline", "headline"),
        validateRequiredText(asString(values.supportingText), "Supporting text", "supportingText"),
        validateRequiredText(asString(values.ctaText), "CTA label", "ctaText"),
        validateBackgroundSelection(values),
        validateDurationRange(values, 120, 360),
        validateCopyLength(asString(values.headline), 72, "Headline", "headline"),
        validateCopyLength(asString(values.supportingText), 180, "Supporting text", "supportingText"),
      ].filter(Boolean) as MotionStudioGuardrailIssue[];

      const duration = asNumber(values.durationFrames, 180);
      const hook = asNumber(values.hookFrames, 42);
      const cta = asNumber(values.ctaFrames, 36);
      if (hook + cta > duration - 30) {
        issues.push({
          level: "error",
          label: "Timing",
          fieldId: "hookFrames",
          message: "Hook and CTA frames leave no readable middle sequence. Reduce one of them or increase duration.",
        });
      }
      if (asBoolean(values.showLogo, false) && !asString(values.logoAssetId)) {
        issues.push({
          level: "warning",
          label: "Logo asset",
          fieldId: "logoAssetId",
          message: "Logo chip is enabled but no logo asset is selected.",
        });
      }
      return issues;
    },
  },
  {
    id: "proof-stack",
    label: "Proof Stack",
    description: "A structured motion stack for metrics, feature bullets and proof-driven CTA closes.",
    accentColor: "#0EA5E9",
    supportedRatios: ["1:1", "16:9", "9:16"],
    fps: 30,
    defaultValues: {
      ratio: "1:1",
      durationFrames: 210,
      hookFrames: 36,
      proofFrames: 42,
      ctaFrames: 36,
      backgroundMode: "gradient",
      backgroundAssetId: "",
      headline: "Show the proof before the pitch.",
      supportingText: "Use three proof beats, then escalate to a clean CTA once credibility is earned.",
      proofMetric: "27%",
      proofLabel: "lift in reply quality",
      bulletOne: "Guardrailed templates keep the timeline consistent.",
      bulletTwo: "Live preview stays aligned with the render payload.",
      bulletThree: "Each revision is saved as a composition snapshot.",
      ctaText: "See the workflow",
      accentColor: "#0EA5E9",
    },
    guardrailNotes: [
      "Metrics should stay under 6 characters for readability.",
      "Keep each proof bullet under one short sentence.",
      "This template works best when the CTA is no more than 20 characters.",
    ],
    fieldDefinitions: [
      ...commonSetupFields,
      { id: "headline", label: "Headline", kind: "textarea", group: "Copy", required: true },
      { id: "supportingText", label: "Supporting text", kind: "textarea", group: "Copy", required: true },
      { id: "proofMetric", label: "Proof metric", kind: "text", group: "Copy", required: true },
      { id: "proofLabel", label: "Proof label", kind: "text", group: "Copy", required: true },
      { id: "bulletOne", label: "Bullet one", kind: "text", group: "Copy", required: true },
      { id: "bulletTwo", label: "Bullet two", kind: "text", group: "Copy" },
      { id: "bulletThree", label: "Bullet three", kind: "text", group: "Copy" },
      { id: "ctaText", label: "CTA label", kind: "text", group: "Copy", required: true },
      { id: "durationFrames", label: "Duration", kind: "number", group: "Timing", min: 150, max: 420, step: 6 },
      { id: "hookFrames", label: "Hook frames", kind: "number", group: "Timing", min: 24, max: 72, step: 6 },
      { id: "proofFrames", label: "Proof frames", kind: "number", group: "Timing", min: 24, max: 84, step: 6 },
      { id: "ctaFrames", label: "CTA frames", kind: "number", group: "Timing", min: 24, max: 72, step: 6 },
      { id: "accentColor", label: "Accent color", kind: "color", group: "Look" },
    ],
    buildPrompt: (values) =>
      `Proof Stack | ${asString(values.headline)} | ${asString(values.proofMetric)} ${asString(values.proofLabel)}`,
    buildSequences: buildProofStackSequences,
    validate: (values) => {
      const issues = [
        validateRequiredText(asString(values.headline), "Headline", "headline"),
        validateRequiredText(asString(values.supportingText), "Supporting text", "supportingText"),
        validateRequiredText(asString(values.proofMetric), "Proof metric", "proofMetric"),
        validateRequiredText(asString(values.proofLabel), "Proof label", "proofLabel"),
        validateRequiredText(asString(values.bulletOne), "Bullet one", "bulletOne"),
        validateRequiredText(asString(values.ctaText), "CTA label", "ctaText"),
        validateBackgroundSelection(values),
        validateDurationRange(values, 150, 420),
        validateCopyLength(asString(values.supportingText), 190, "Supporting text", "supportingText"),
      ].filter(Boolean) as MotionStudioGuardrailIssue[];

      if (asString(values.proofMetric).trim().length > 6) {
        issues.push({
          level: "warning",
          label: "Proof metric",
          fieldId: "proofMetric",
          message: "Metrics longer than 6 characters will feel cramped in the proof panel.",
        });
      }
      return issues;
    },
  },
  {
    id: "founder-note",
    label: "Founder Note",
    description: "Quote-led motion layout for founder updates, narrative clips and POV-driven sequences.",
    accentColor: "#A855F7",
    supportedRatios: ["9:16", "16:9", "1:1"],
    fps: 30,
    defaultValues: {
      ratio: "9:16",
      durationFrames: 195,
      hookFrames: 30,
      quoteFrames: 78,
      ctaFrames: 30,
      backgroundMode: "gradient",
      backgroundAssetId: "",
      headline: "Ship the point of view, not just the footage.",
      supportingText: "Founder notes need enough breathing room for the quote, the context and the close.",
      quoteText: "Motion direction should reduce ambiguity, not create a second product.",
      authorName: "Brand strategist",
      authorRole: "Founder note",
      ctaText: "Start the review",
      captionsEnabled: true,
      accentColor: "#A855F7",
    },
    guardrailNotes: [
      "Quotes should stay under 120 characters whenever possible.",
      "Reserve at least 24 frames for the CTA.",
      "Disable captions only when the copy is already embedded in the scene.",
    ],
    fieldDefinitions: [
      ...commonSetupFields,
      { id: "headline", label: "Headline", kind: "textarea", group: "Copy", required: true },
      { id: "quoteText", label: "Quote", kind: "textarea", group: "Copy", required: true },
      { id: "supportingText", label: "Supporting text", kind: "textarea", group: "Copy", required: true },
      { id: "authorName", label: "Author name", kind: "text", group: "Copy", required: true },
      { id: "authorRole", label: "Author role", kind: "text", group: "Copy" },
      { id: "ctaText", label: "CTA label", kind: "text", group: "Copy", required: true },
      { id: "captionsEnabled", label: "Enable caption strip", kind: "boolean", group: "Look" },
      { id: "durationFrames", label: "Duration", kind: "number", group: "Timing", min: 150, max: 360, step: 6 },
      { id: "hookFrames", label: "Hook frames", kind: "number", group: "Timing", min: 20, max: 66, step: 6 },
      { id: "quoteFrames", label: "Quote frames", kind: "number", group: "Timing", min: 48, max: 120, step: 6 },
      { id: "ctaFrames", label: "CTA frames", kind: "number", group: "Timing", min: 24, max: 72, step: 6 },
      { id: "accentColor", label: "Accent color", kind: "color", group: "Look" },
    ],
    buildPrompt: (values) =>
      `Founder Note | ${asString(values.headline)} | ${asString(values.quoteText)} | ${asString(values.authorName)}`,
    buildSequences: buildFounderNoteSequences,
    validate: (values) => {
      const issues = [
        validateRequiredText(asString(values.headline), "Headline", "headline"),
        validateRequiredText(asString(values.quoteText), "Quote", "quoteText"),
        validateRequiredText(asString(values.supportingText), "Supporting text", "supportingText"),
        validateRequiredText(asString(values.authorName), "Author name", "authorName"),
        validateRequiredText(asString(values.ctaText), "CTA label", "ctaText"),
        validateBackgroundSelection(values),
        validateDurationRange(values, 150, 360),
        validateCopyLength(asString(values.quoteText), 120, "Quote", "quoteText"),
      ].filter(Boolean) as MotionStudioGuardrailIssue[];

      const duration = asNumber(values.durationFrames, 195);
      const hook = asNumber(values.hookFrames, 30);
      const quoteFrames = asNumber(values.quoteFrames, 78);
      const cta = asNumber(values.ctaFrames, 30);
      if (hook + quoteFrames + cta > duration - 18) {
        issues.push({
          level: "error",
          label: "Timing",
          fieldId: "quoteFrames",
          message: "Hook, quote and CTA frames leave no room for the positioning beat.",
        });
      }
      return issues;
    },
  },
];

export const MOTION_STUDIO_RATIO_DIMENSIONS: Record<MotionStudioRatio, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
};

export const getMotionStudioTemplate = (templateId: string) =>
  MOTION_STUDIO_TEMPLATES.find((template) => template.id === templateId) || MOTION_STUDIO_TEMPLATES[0];

export const createMotionStudioValues = (templateId: string) => {
  const template = getMotionStudioTemplate(templateId);
  return JSON.parse(JSON.stringify(template.defaultValues)) as Record<string, unknown>;
};

export const getMotionStudioPlayerConfig = (templateId: string, values: Record<string, unknown>) => {
  const template = getMotionStudioTemplate(templateId);
  const ratio = asRatio(values.ratio, template.supportedRatios[0]);
  const dimensions = MOTION_STUDIO_RATIO_DIMENSIONS[ratio];
  const durationInFrames = clamp(asNumber(values.durationFrames, 180), 90, 600);

  return {
    ratio,
    width: dimensions.width,
    height: dimensions.height,
    fps: template.fps,
    durationInFrames,
  };
};

export const buildMotionStudioLayers = (templateId: string, values: Record<string, unknown>) => {
  const template = getMotionStudioTemplate(templateId);
  const playerConfig = getMotionStudioPlayerConfig(templateId, values);
  const snapshot: LayerSnapshot = {
    kind: "template_state",
    template_id: template.id,
    template_label: template.label,
    prompt_original: template.buildPrompt(values),
    props: values,
    ratio: playerConfig.ratio,
    fps: playerConfig.fps,
    duration_in_frames: playerConfig.durationInFrames,
  };

  const sequenceSnapshots: SequenceSnapshot[] = template.buildSequences(values).map((sequence) => ({
    kind: "sequence",
    ...sequence,
  }));

  return [snapshot, ...sequenceSnapshots];
};

export const parseMotionStudioLayers = (layers: unknown) => {
  if (!Array.isArray(layers)) return null;

  const snapshot = layers.find(
    (entry): entry is LayerSnapshot =>
      Boolean(entry) &&
      typeof entry === "object" &&
      !Array.isArray(entry) &&
      (entry as LayerSnapshot).kind === "template_state" &&
      typeof (entry as LayerSnapshot).template_id === "string",
  );

  if (!snapshot) return null;

  const sequences = layers.filter(
    (entry): entry is SequenceSnapshot =>
      Boolean(entry) &&
      typeof entry === "object" &&
      !Array.isArray(entry) &&
      (entry as SequenceSnapshot).kind === "sequence" &&
      typeof (entry as SequenceSnapshot).id === "string",
  );

  return {
    templateId: snapshot.template_id,
    values: snapshot.props || {},
    sequences,
    promptOriginal: snapshot.prompt_original,
    ratio: snapshot.ratio,
    fps: snapshot.fps,
    durationInFrames: snapshot.duration_in_frames,
  };
};

export const validateMotionStudioDraft = (templateId: string, values: Record<string, unknown>) =>
  getMotionStudioTemplate(templateId).validate(values);

export const buildMotionStudioPrompt = (templateId: string, values: Record<string, unknown>) =>
  getMotionStudioTemplate(templateId).buildPrompt(values);

export const buildMotionStudioSequences = (templateId: string, values: Record<string, unknown>) =>
  getMotionStudioTemplate(templateId).buildSequences(values);

export const draftMotionStudioCommandPatch = (
  templateId: string,
  values: Record<string, unknown>,
  command: string,
): MotionStudioCommandPatch | null => {
  const normalized = command.trim().toLowerCase();
  if (!normalized) return null;

  const nextValues = { ...values };
  const changes: string[] = [];

  const applyDurationDelta = (delta: number) => {
    const current = asNumber(nextValues.durationFrames, 180);
    nextValues.durationFrames = clamp(current + delta, 90, 600);
    changes.push(delta > 0 ? `Extended duration by ${delta} frames.` : `Tightened duration by ${Math.abs(delta)} frames.`);
  };

  if (normalized.includes("faster") || normalized.includes("mais rapido") || normalized.includes("mais rapida")) {
    applyDurationDelta(-24);
  }

  if (normalized.includes("slower") || normalized.includes("mais lento") || normalized.includes("mais longa")) {
    applyDurationDelta(24);
  }

  const ratioMatch = normalized.match(/\b(9:16|1:1|16:9)\b/);
  if (ratioMatch) {
    nextValues.ratio = ratioMatch[1];
    changes.push(`Switched aspect ratio to ${ratioMatch[1]}.`);
  }

  const headlineMatch = command.match(/headline\s*:\s*(.+)$/i);
  if (headlineMatch?.[1]) {
    nextValues.headline = headlineMatch[1].trim();
    changes.push("Updated headline.");
  }

  const ctaMatch = command.match(/cta\s*:\s*(.+)$/i);
  if (ctaMatch?.[1]) {
    nextValues.ctaText = ctaMatch[1].trim();
    changes.push("Updated CTA label.");
  }

  const hookDeltaMatch = normalized.match(/hook\s*([+-]\d+)/);
  if (hookDeltaMatch?.[1]) {
    const delta = Number(hookDeltaMatch[1]);
    if (Number.isFinite(delta) && "hookFrames" in nextValues) {
      nextValues.hookFrames = clamp(asNumber(nextValues.hookFrames, 36) + delta, 18, 140);
      changes.push(`Adjusted hook frames by ${delta}.`);
    }
  }

  const ctaDeltaMatch = normalized.match(/cta\s*([+-]\d+)/);
  if (ctaDeltaMatch?.[1]) {
    const delta = Number(ctaDeltaMatch[1]);
    if (Number.isFinite(delta) && "ctaFrames" in nextValues) {
      nextValues.ctaFrames = clamp(asNumber(nextValues.ctaFrames, 30) + delta, 18, 140);
      changes.push(`Adjusted CTA frames by ${delta}.`);
    }
  }

  if (normalized.includes("logo off") || normalized.includes("disable logo")) {
    nextValues.showLogo = false;
    changes.push("Disabled the logo chip.");
  }

  if (normalized.includes("logo on") || normalized.includes("enable logo")) {
    nextValues.showLogo = true;
    changes.push("Enabled the logo chip.");
  }

  if (normalized.includes("tighten copy")) {
    const targetKey = templateId === "founder-note" ? "quoteText" : "supportingText";
    const raw = asString(nextValues[targetKey]);
    if (raw.length > 0) {
      nextValues[targetKey] = raw.slice(0, 120).trim();
      changes.push(`Trimmed ${targetKey} to a tighter preview length.`);
    }
  }

  const accentMap: Record<string, string> = {
    amber: "#F59E0B",
    orange: "#F97316",
    cyan: "#06B6D4",
    emerald: "#10B981",
    violet: "#8B5CF6",
    rose: "#F43F5E",
  };

  const accentKey = Object.keys(accentMap).find((key) => normalized.includes(key));
  if (accentKey) {
    nextValues.accentColor = accentMap[accentKey];
    changes.push(`Shifted accent color to ${accentKey}.`);
  }

  if (changes.length === 0) return null;

  return {
    summary: "Guardrailed edit patch drafted from the command bar.",
    changes,
    nextValues,
  };
};
