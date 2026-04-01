import { BrandContext, createServiceClient, runJsonTaskDetailed } from "./postgen.ts";

export type StrategyOutput = {
  format: "single" | "carousel";
  slides_count: number;
  template: string;
  theme: string;
  slide_structure: Array<{ index: number; type: string; key_message: string }>;
  cta: string;
  title: string;
};

export type WriterOutput = {
  slides: Array<{ index: number; headline: string; body: string; cta: string | null }>;
  caption: string;
  hashtags: string;
};

export type DesignerOutput = {
  slides_html: string[];
  template: string;
};

export type FinalPostOutput = {
  title: string;
  format: "single" | "carousel";
  slides_html: string[];
  caption: string;
  hashtags: string;
  template: string;
  slides_count: number;
};

export type QaOutput = {
  approved: boolean;
  summary: string;
  issues: string[];
  final_post: FinalPostOutput;
};

type TaskContext = {
  supabase: ReturnType<typeof createServiceClient>;
  workspaceId: string;
  prompt: string;
  brandContext: BrandContext;
  previousOutputs: Record<string, unknown>;
};

const AI_PROVIDERS = ["groq", "openrouter", "gemini"];

const clampSlides = (value: number, fallback = 5) => Math.max(1, Math.min(Number(value) || fallback, 10));

const inferFormat = (prompt: string): "single" | "carousel" => {
  const normalized = prompt.toLowerCase();
  return normalized.includes("carrossel") || normalized.includes("carousel") ? "carousel" : "single";
};

const inferSlideCount = (prompt: string) => {
  const match = prompt.match(/(\d+)\s*(slides?|cards?)/i);
  if (!match) return inferFormat(prompt) === "carousel" ? 5 : 1;
  return clampSlides(Number(match[1]), 5);
};

const buildStrategyFallback = (prompt: string): StrategyOutput => {
  const format = inferFormat(prompt);
  const slidesCount = format === "single" ? 1 : inferSlideCount(prompt);
  const title = prompt.slice(0, 72) || "Novo post";

  return {
    format,
    slides_count: slidesCount,
    template: format === "single" ? "minimal-dark" : "editorial",
    theme: prompt,
    cta: "Saiba mais",
    title,
    slide_structure: Array.from({ length: slidesCount }, (_, index) => ({
      index,
      type: index === 0 ? "hook" : index === slidesCount - 1 ? "cta" : "content",
      key_message: index === 0 ? title : `Ponto ${index + 1}`,
    })),
  };
};

const buildWriterFallback = (strategy: StrategyOutput, brandName: string): WriterOutput => ({
  slides: strategy.slide_structure.map((slide) => ({
    index: slide.index,
    headline: slide.index === 0 ? strategy.title : slide.key_message,
    body: slide.index === strategy.slide_structure.length - 1
      ? "Feche com uma chamada direta, sem exagero e com clareza."
      : `Desenvolva ${slide.key_message.toLowerCase()} com uma frase curta e objetiva.`,
    cta: slide.index === strategy.slide_structure.length - 1 ? strategy.cta : null,
  })),
  caption: `${strategy.title}\n\nConteudo alinhado ao contexto da marca ${brandName}.`,
  hashtags: "#conteudo #marketing #postgen",
});

const buildFallbackSlidesHtml = (
  writer: WriterOutput,
  strategy: StrategyOutput,
  brandContext: BrandContext,
) => {
  const primaryColor = typeof brandContext.brandKit?.color_primary === "string"
    ? brandContext.brandKit.color_primary
    : "#7C3AED";
  const secondaryColor = typeof brandContext.brandKit?.color_secondary === "string"
    ? brandContext.brandKit.color_secondary
    : "#06B6D4";
  const fontHeadline = typeof brandContext.brandKit?.font_headline === "string"
    ? brandContext.brandKit.font_headline
    : "DM Sans";

  return writer.slides.map((slide, index) => {
    const isFirst = index === 0;
    const isLast = index === writer.slides.length - 1;
    const background = isFirst || isLast
      ? `linear-gradient(135deg, ${primaryColor} 0%, #09090f 100%)`
      : "#111119";

    return `<div style="width:540px;height:540px;background:${background};display:flex;flex-direction:column;justify-content:center;padding:56px;position:relative;overflow:hidden;font-family:'${fontHeadline}',system-ui,sans-serif;color:#F8FAFC;">
  <div style="position:absolute;inset:auto -48px -48px auto;width:180px;height:180px;border-radius:999px;background:${secondaryColor}22;"></div>
  ${!isFirst ? `<div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:${secondaryColor};margin-bottom:16px;">Slide ${index + 1}</div>` : ""}
  <h1 style="margin:0 0 16px;font-size:${strategy.format === "single" ? 42 : isFirst ? 40 : 30}px;line-height:1.08;font-weight:800;">${slide.headline}</h1>
  <p style="margin:0;color:rgba(248,250,252,0.82);font-size:16px;line-height:1.6;">${slide.body}</p>
  ${slide.cta ? `<div style="margin-top:28px;display:inline-flex;align-items:center;justify-content:center;height:46px;padding:0 20px;border-radius:999px;background:#ffffff;color:${primaryColor};font-weight:700;">${slide.cta}</div>` : ""}
</div>`;
  });
};

const buildDesignerFallback = (
  strategy: StrategyOutput,
  writer: WriterOutput,
  brandContext: BrandContext,
): DesignerOutput => ({
  slides_html: buildFallbackSlidesHtml(writer, strategy, brandContext),
  template: strategy.template,
});

const buildQaFallback = (
  strategy: StrategyOutput,
  writer: WriterOutput,
  designer: DesignerOutput,
): QaOutput => ({
  approved: true,
  summary: "Fallback de QA aplicado para manter o payload compilavel.",
  issues: [],
  final_post: {
    title: strategy.title,
    format: strategy.format,
    slides_html: designer.slides_html,
    caption: writer.caption,
    hashtags: writer.hashtags,
    template: designer.template || strategy.template,
    slides_count: designer.slides_html.length,
  },
});

const buildTemplateGuide = (template: string, primaryColor: string, secondaryColor: string) => {
  const guide: Record<string, string> = {
    "minimal-dark": "Dark background, restrained composition, large headline, subtle gradients.",
    editorial: "Magazine feel, asymmetry, premium spacing and hierarchy.",
    "bold-color": `Primary brand color ${primaryColor}, white headline, aggressive contrast, geometric shapes.`,
    "data-card": "Dark grid, clear hierarchy for numbers, stat blocks and supporting text.",
    testimonial: "Large quote, supporting attribution, generous spacing.",
    "clean-white": `Clean white canvas, accent border using ${primaryColor}, light editorial density.`,
  };

  return guide[template] || `Use a modern social layout with ${primaryColor} and ${secondaryColor}.`;
};

const normalizeStrategy = (raw: StrategyOutput | null | undefined, prompt: string): StrategyOutput => {
  const fallback = buildStrategyFallback(prompt);
  if (!raw) return fallback;

  return {
    format: (raw.format === "single" ? "single" : "carousel") as "single" | "carousel",
    slides_count: clampSlides(raw.slides_count, fallback.slides_count),
    template: raw.template || fallback.template,
    theme: raw.theme || fallback.theme,
    cta: raw.cta || fallback.cta,
    title: raw.title || fallback.title,
    slide_structure: Array.isArray(raw.slide_structure) && raw.slide_structure.length
      ? raw.slide_structure.slice(0, clampSlides(raw.slides_count, fallback.slides_count))
      : fallback.slide_structure,
  };
};

const normalizeWriter = (raw: WriterOutput | null | undefined, strategy: StrategyOutput, brandContext: BrandContext) => {
  const brandName = typeof brandContext.briefing?.company_name === "string"
    ? brandContext.briefing.company_name
    : "a marca";
  const fallback = buildWriterFallback(strategy, brandName);
  if (!raw) return fallback;

  return {
    slides: Array.isArray(raw.slides) && raw.slides.length
      ? raw.slides.slice(0, strategy.slides_count).map((slide, index) => ({
        index,
        headline: slide?.headline || fallback.slides[index]?.headline || `Slide ${index + 1}`,
        body: slide?.body || fallback.slides[index]?.body || "",
        cta: typeof slide?.cta === "string" ? slide.cta : fallback.slides[index]?.cta || null,
      }))
      : fallback.slides,
    caption: raw.caption || fallback.caption,
    hashtags: raw.hashtags || fallback.hashtags,
  };
};

const normalizeDesigner = (
  raw: DesignerOutput | null | undefined,
  strategy: StrategyOutput,
  writer: WriterOutput,
  brandContext: BrandContext,
) => {
  const fallback = buildDesignerFallback(strategy, writer, brandContext);
  if (!raw || !Array.isArray(raw.slides_html) || raw.slides_html.length === 0) return fallback;
  return {
    slides_html: raw.slides_html.slice(0, strategy.slides_count),
    template: raw.template || strategy.template,
  };
};

const normalizeQa = (
  raw: QaOutput | null | undefined,
  strategy: StrategyOutput,
  writer: WriterOutput,
  designer: DesignerOutput,
) => {
  const fallback = buildQaFallback(strategy, writer, designer);
  if (!raw || !raw.final_post) return fallback;
  return {
    approved: raw.approved ?? true,
    summary: raw.summary || fallback.summary,
    issues: Array.isArray(raw.issues) ? raw.issues : [],
    final_post: {
      title: raw.final_post.title || fallback.final_post.title,
      format: raw.final_post.format === "single" ? "single" : "carousel",
      slides_html: Array.isArray(raw.final_post.slides_html) && raw.final_post.slides_html.length
        ? raw.final_post.slides_html
        : fallback.final_post.slides_html,
      caption: raw.final_post.caption || fallback.final_post.caption,
      hashtags: raw.final_post.hashtags || fallback.final_post.hashtags,
      template: raw.final_post.template || fallback.final_post.template,
      slides_count: raw.final_post.slides_count || fallback.final_post.slides_count,
    },
  };
};

export const runContentStrategist = async (context: TaskContext) => {
  const fallback = buildStrategyFallback(context.prompt);
  const { result, meta } = await runJsonTaskDetailed<StrategyOutput>(
    context.supabase,
    context.workspaceId,
    `You are ATLAS — Principal Content Strategist at PostGen AI.
PERSONA: 12 years experience in social media growth, former Head of Content at 3 scale-ups. Expert in funnel mapping, hook architecture, and Instagram/LinkedIn algorithm mechanics.
CERTIFICATIONS: Meta Blueprint, HubSpot Content Marketing, CXL Social Strategy.
RESPONSIBILITIES:
- Analyze the user intent and brand context to define the ideal content format and structure
- Select the slide arc (hook → tension → resolution → CTA) based on funnel stage
- Choose the correct template knowing each template's visual weight and scan-ability
- Define a CTA that generates measurable action, not generic engagement
OUTPUT CONTRACT (valid JSON only):
{
  "format": "single|carousel",
  "slides_count": number,
  "template": "minimal-dark|editorial|bold-color|data-card|testimonial|clean-white",
  "theme": "string describing the core visual and emotional theme",
  "slide_structure": [{"index": 0, "type": "hook|agitation|insight|proof|cta|content", "key_message": "string"}],
  "cta": "specific, action-oriented call to action",
  "title": "post title that would stop the scroll"
}
QUALITY RULES:
- A hook slide must create a pattern interrupt — question the obvious or present a paradox
- carousel format: minimum 4, maximum 8 slides for maximum retention
- single format: exactly 1 slide
- Respond ENTIRELY in Brazilian Portuguese
- No generic CTAs like "Saiba mais" — be specific to the content
${context.brandContext.system_context}`,
    `User request: ${context.prompt}`,
    AI_PROVIDERS,
    fallback,
  );

  return { result: normalizeStrategy(result, context.prompt), meta };
};

export const runContentWriter = async (context: TaskContext) => {
  const strategy = normalizeStrategy(context.previousOutputs.content_strategist as StrategyOutput | undefined, context.prompt);
  const brandName = typeof context.brandContext.briefing?.company_name === "string"
    ? context.brandContext.briefing.company_name
    : "a marca";
  const fallback = buildWriterFallback(strategy, brandName);
  const { result, meta } = await runJsonTaskDetailed<WriterOutput>(
    context.supabase,
    context.workspaceId,
    `You are NOVA — Lead Copywriter at PostGen AI.
PERSONA: Trained in direct response copywriting (Gary Halbert method), behavioral psychology (Cialdini's 7 principles), and social media micro-copy. Former copywriter for D2C brands and SaaS companies.
CERTIFICATIONS: AWAI Copywriting, CXL Conversion Copywriting, Meta Creative Strategy.
RESPONSIBILITIES:
- Write slide headlines that stop the thumb-scroll using the "curiosity gap" or "bold statement" techniques
- Craft body copy that is compressed, punchy, and creates emotional resonance within 2-3 lines
- Write captions using the AIDA framework (Attention → Interest → Desire → Action)
- Produce hashtags: 3 broad + 3 niche + 1 branded strategy
OUTPUT CONTRACT (valid JSON only):
{
  "slides": [{"index": 0, "headline": "string (max 60 chars)", "body": "string (max 120 chars)", "cta": "string|null"}],
  "caption": "string (using AIDA framework, 3-4 paragraphs)",
  "hashtags": "string (space-separated, 7-10 total)"
}
QUALITY RULES:
- Headlines must be scannable in under 2 seconds
- Body copy: zero filler words, every word must earn its place
- CTA only on last slide, make it specific and low-friction
- Caption: first line must hook without "Descubra" or "Conheça"
- Respond ENTIRELY in Brazilian Portuguese
${context.brandContext.system_context}`,
    `User request: ${context.prompt}
Approved strategy:
${JSON.stringify(strategy, null, 2)}`,
    AI_PROVIDERS,
    fallback,
  );

  return { result: normalizeWriter(result, strategy, context.brandContext), meta };
};

export const runContentDesigner = async (context: TaskContext) => {
  const strategy = normalizeStrategy(context.previousOutputs.content_strategist as StrategyOutput | undefined, context.prompt);
  const writer = normalizeWriter(
    context.previousOutputs.content_writer as WriterOutput | undefined,
    strategy,
    context.brandContext,
  );

  const primaryColor = typeof context.brandContext.brandKit?.color_primary === "string"
    ? context.brandContext.brandKit.color_primary
    : "#7C3AED";
  const secondaryColor = typeof context.brandContext.brandKit?.color_secondary === "string"
    ? context.brandContext.brandKit.color_secondary
    : "#06B6D4";
  const fontHeadline = typeof context.brandContext.brandKit?.font_headline === "string"
    ? context.brandContext.brandKit.font_headline
    : "DM Sans";
  const templateGuide = buildTemplateGuide(strategy.template, primaryColor, secondaryColor);
  const fallback = buildDesignerFallback(strategy, writer, context.brandContext);

  const { result, meta } = await runJsonTaskDetailed<DesignerOutput>(
    context.supabase,
    context.workspaceId,
    `You are VEGA — Senior Visual Designer at PostGen AI.
PERSONA: 10 years in digital design, expert in typographic hierarchy, color theory (WCAG AA minimum contrast), and social-first layout patterns. Trained at Figma, worked with Meta's creative acceleration team.
CERTIFICATIONS: Google UX Design Certificate, Motion Design (School of Motion), Brand Identity (Futur Pro Group).
RESPONSIBILITIES:
- Translate approved copy into production-ready, self-contained HTML5 slides
- Each slide is 540×540px — a perfect square for Instagram/LinkedIn feed
- Apply brand palette, typographic hierarchy, and visual breathing room
- Use subtle decorative elements (gradients, blurred shapes) to add depth without clutter
- Never use external images, external CSS, or class-based styles
OUTPUT CONTRACT (valid JSON only):
{
  "slides_html": ["<div style='width:540px;height:540px;...'>...</div>"],
  "template": "string"
}
TECHNICAL RULES:
- ALL CSS must be inline — no className, no <style> tags
- Slides must look finished and premium at 540×540px
- Minimum font size for body: 15px. Headlines: 28-46px based on slide importance
- Brand primary color: ${primaryColor}. Secondary: ${secondaryColor}. Headline font: ${fontHeadline}
- Template direction: ${strategy.template}. Visual guide: ${templateGuide}
- Add radial/linear gradient backgrounds, pill badges, decorative circles for depth
- Respond with JSON only — no markdown, no explanation
${context.brandContext.system_context}`,
    `Approved strategy:
${JSON.stringify(strategy, null, 2)}

Approved copy:
${JSON.stringify(writer, null, 2)}`,
    AI_PROVIDERS,
    fallback,
  );

  return { result: normalizeDesigner(result, strategy, writer, context.brandContext), meta };
};

export const runContentQa = async (context: TaskContext) => {
  const strategy = normalizeStrategy(context.previousOutputs.content_strategist as StrategyOutput | undefined, context.prompt);
  const writer = normalizeWriter(
    context.previousOutputs.content_writer as WriterOutput | undefined,
    strategy,
    context.brandContext,
  );
  const designer = normalizeDesigner(
    context.previousOutputs.content_designer as DesignerOutput | undefined,
    strategy,
    writer,
    context.brandContext,
  );
  const fallback = buildQaFallback(strategy, writer, designer);

  const { result, meta } = await runJsonTaskDetailed<QaOutput>(
    context.supabase,
    context.workspaceId,
    `You are IRIS — Quality Assurance Lead at PostGen AI.
PERSONA: Former editorial director at a digital media agency. Specialist in brand voice consistency, social content performance heuristics, and production quality review. Responsible for the final gate before any content goes live.
CERTIFICATIONS: Content Marketing Institute Certification, HubSpot Marketing Hub Expert.
RESPONSIBILITIES:
- Cross-check strategy → copy → design chain for consistency
- Flag any brand voice violations, logical gaps, or weak transitions
- Ensure the hook is strong enough to stop the scroll
- Ensure the CTA is specific and creates a clear next step
- Assemble the final production-ready post payload
OUTPUT CONTRACT (valid JSON only):
{
  "approved": true|false,
  "summary": "1-2 sentence quality summary",
  "issues": ["specific issue if any"],
  "final_post": {
    "title": "string",
    "format": "single|carousel",
    "slides_html": ["string"],
    "caption": "string",
    "hashtags": "string",
    "template": "string",
    "slides_count": number
  }
}
QA CHECKLIST:
- Hook captures a real pain point or curiosity gap?
- Copy is brand-consistent and free of generic filler?
- HTML slides are valid and self-contained?
- Caption follows a clear narrative arc?
- CTA is concrete (not just "Saiba mais")?
- If issues exist, document them but still return the best possible final_post
- Respond with valid JSON only — no markdown, no explanation
${context.brandContext.system_context}`,
    `User request: ${context.prompt}

Strategy:
${JSON.stringify(strategy, null, 2)}

Writer:
${JSON.stringify(writer, null, 2)}

Designer:
${JSON.stringify(designer, null, 2)}`,
    AI_PROVIDERS,
    fallback,
  );

  return { result: normalizeQa(result, strategy, writer, designer), meta };
};
