import { BrandContext, createServiceClient, runJsonTaskDetailed } from "./postgen.ts";
import { dispatchSimlabRun } from "./simlab.ts";

export type TrendResearcherOutput = {
  angle: string;
  recommended_window: string;
  chosen_signal: {
    source_type: "news_item" | "viral_pattern" | "benchmark";
    title: string;
    url: string | null;
    reason: string;
  };
  supporting_points: string[];
  references: string[];
};

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

export type SimlabValidationOutput = {
  run_id: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  verdict: "approved" | "revise" | "blocked" | null;
  summary: string | null;
  insight: Record<string, unknown> | null;
  variant_count: number;
};

type TaskContext = {
  supabase: ReturnType<typeof createServiceClient>;
  workspaceId: string;
  prompt: string;
  brandContext: BrandContext;
  previousOutputs: Record<string, unknown>;
  workspaceSquad?: Record<string, unknown> | null;
  currentTaskInput?: Record<string, unknown>;
};

type NewsSignal = {
  title: string;
  description: string | null;
  source_url: string;
  relevance_score: number | null;
  relevance_reason: string | null;
};

type ViralSignal = {
  hook_formula: string | null;
  visual_style: string | null;
  content_type: string | null;
  emotional_trigger: string | null;
  source_url: string | null;
};

const AI_PROVIDERS = ["groq", "openrouter", "gemini"];

const clampSlides = (value: number, min: number, max: number) => Math.max(min, Math.min(Number(value) || min, max));

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

const requireString = (value: unknown, field: string) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Campo obrigatorio ausente ou invalido: ${field}.`);
  }
  return value.trim();
};

const requireStringArray = (value: unknown, field: string, minLength = 1) => {
  const items = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : [];
  if (items.length < minLength) {
    throw new Error(`Array obrigatorio ausente ou invalido: ${field}.`);
  }
  return items;
};

const ensureTrendResearch = (raw: unknown): TrendResearcherOutput => {
  const record = toRecord(raw);
  const chosenSignal = toRecord(record.chosen_signal);
  const sourceType = requireString(chosenSignal.source_type, "chosen_signal.source_type");
  if (!["news_item", "viral_pattern", "benchmark"].includes(sourceType)) {
    throw new Error("chosen_signal.source_type invalido.");
  }

  return {
    angle: requireString(record.angle, "angle"),
    recommended_window: requireString(record.recommended_window, "recommended_window"),
    chosen_signal: {
      source_type: sourceType as TrendResearcherOutput["chosen_signal"]["source_type"],
      title: requireString(chosenSignal.title, "chosen_signal.title"),
      url: typeof chosenSignal.url === "string" && chosenSignal.url.trim().length > 0 ? chosenSignal.url.trim() : null,
      reason: requireString(chosenSignal.reason, "chosen_signal.reason"),
    },
    supporting_points: requireStringArray(record.supporting_points, "supporting_points"),
    references: requireStringArray(record.references, "references"),
  };
};

const ensureStrategy = (raw: unknown): StrategyOutput => {
  const record = toRecord(raw);
  const format = requireString(record.format, "format");
  if (!["single", "carousel"].includes(format)) {
    throw new Error("format invalido.");
  }

  const slidesCount = format === "single"
    ? 1
    : clampSlides(typeof record.slides_count === "number" ? record.slides_count : 4, 4, 8);

  const structure = Array.isArray(record.slide_structure)
    ? record.slide_structure.map((item, index) => {
        const slide = toRecord(item);
        return {
          index,
          type: requireString(slide.type, `slide_structure[${index}].type`),
          key_message: requireString(slide.key_message, `slide_structure[${index}].key_message`),
        };
      })
    : [];

  if (structure.length !== slidesCount) {
    throw new Error("slide_structure nao corresponde ao numero de slides.");
  }

  return {
    format: format as StrategyOutput["format"],
    slides_count: slidesCount,
    template: requireString(record.template, "template"),
    theme: requireString(record.theme, "theme"),
    slide_structure: structure,
    cta: requireString(record.cta, "cta"),
    title: requireString(record.title, "title"),
  };
};

const ensureWriter = (raw: unknown, strategy: StrategyOutput): WriterOutput => {
  const record = toRecord(raw);
  const slides = Array.isArray(record.slides)
    ? record.slides.map((item, index) => {
        const slide = toRecord(item);
        return {
          index,
          headline: requireString(slide.headline, `slides[${index}].headline`),
          body: requireString(slide.body, `slides[${index}].body`),
          cta: typeof slide.cta === "string" && slide.cta.trim().length > 0 ? slide.cta.trim() : null,
        };
      })
    : [];

  if (slides.length !== strategy.slides_count) {
    throw new Error("Quantidade de slides do redator nao corresponde a estrategia.");
  }

  return {
    slides,
    caption: requireString(record.caption, "caption"),
    hashtags: requireString(record.hashtags, "hashtags"),
  };
};

const ensureDesigner = (raw: unknown, strategy: StrategyOutput): DesignerOutput => {
  const record = toRecord(raw);
  const slidesHtml = requireStringArray(record.slides_html, "slides_html", strategy.slides_count);
  if (slidesHtml.length !== strategy.slides_count) {
    throw new Error("Quantidade de slides HTML nao corresponde a estrategia.");
  }
  return {
    slides_html: slidesHtml,
    template: requireString(record.template, "template"),
  };
};

const ensureQa = (raw: unknown, strategy: StrategyOutput): QaOutput => {
  const record = toRecord(raw);
  const finalPost = toRecord(record.final_post);
  const format = requireString(finalPost.format, "final_post.format");
  if (!["single", "carousel"].includes(format)) {
    throw new Error("final_post.format invalido.");
  }

  const slidesHtml = requireStringArray(finalPost.slides_html, "final_post.slides_html", strategy.slides_count);

  return {
    approved: Boolean(record.approved),
    summary: requireString(record.summary, "summary"),
    issues: Array.isArray(record.issues)
      ? record.issues.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [],
    final_post: {
      title: requireString(finalPost.title, "final_post.title"),
      format: format as FinalPostOutput["format"],
      slides_html: slidesHtml,
      caption: requireString(finalPost.caption, "final_post.caption"),
      hashtags: requireString(finalPost.hashtags, "final_post.hashtags"),
      template: requireString(finalPost.template, "final_post.template"),
      slides_count: slidesHtml.length,
    },
  };
};

const ensureSimlabValidation = (raw: unknown): SimlabValidationOutput => {
  const record = toRecord(raw);
  const status = requireString(record.status, "status");
  if (!["queued", "running", "completed", "failed", "cancelled"].includes(status)) {
    throw new Error("status de simlab_validation invalido.");
  }

  const verdictRaw = record.verdict;
  const verdict = typeof verdictRaw === "string" && ["approved", "revise", "blocked"].includes(verdictRaw)
    ? verdictRaw as SimlabValidationOutput["verdict"]
    : null;

  return {
    run_id: requireString(record.run_id, "run_id"),
    status: status as SimlabValidationOutput["status"],
    verdict,
    summary: typeof record.summary === "string" ? record.summary : null,
    insight: toRecord(record.insight),
    variant_count: typeof record.variant_count === "number" ? record.variant_count : 0,
  };
};

const assembleFinalPost = (
  strategy: StrategyOutput,
  writer: WriterOutput,
  designer: DesignerOutput,
): FinalPostOutput => ({
  title: strategy.title,
  format: strategy.format,
  slides_html: designer.slides_html,
  caption: writer.caption,
  hashtags: writer.hashtags,
  template: designer.template,
  slides_count: designer.slides_html.length,
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

const loadTrendInputs = async (context: TaskContext) => {
  const squad = toRecord(context.workspaceSquad);
  const onboardingAnswers = toRecord(squad.onboarding_answers);
  const benchmarkUrls = Array.isArray(onboardingAnswers.benchmark_urls)
    ? onboardingAnswers.benchmark_urls.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  const [{ data: newsItems, error: newsError }, { data: viralAnalyses, error: viralError }] = await Promise.all([
    context.supabase
      .from("news_items")
      .select("title,description,source_url,relevance_score,relevance_reason")
      .eq("workspace_id", context.workspaceId)
      .order("relevance_score", { ascending: false })
      .order("fetched_at", { ascending: false })
      .limit(6),
    context.supabase
      .from("viral_analyses")
      .select("hook_formula,visual_style,content_type,emotional_trigger,source_url")
      .eq("workspace_id", context.workspaceId)
      .order("analyzed_at", { ascending: false })
      .limit(6),
  ]);

  if (newsError) throw newsError;
  if (viralError) throw viralError;

  const normalizedNews = (newsItems || []) as NewsSignal[];
  const normalizedViral = (viralAnalyses || []) as ViralSignal[];

  if (normalizedNews.length === 0 && normalizedViral.length === 0 && benchmarkUrls.length === 0) {
    throw new Error("O squad de tendencias precisa de pelo menos uma noticia, analise viral ou benchmark configurado no workspace.");
  }

  return {
    benchmark_urls: benchmarkUrls,
    news_items: normalizedNews,
    viral_patterns: normalizedViral,
  };
};

export const runTrendResearcher = async (context: TaskContext) => {
  const trendInputs = await loadTrendInputs(context);
  const { result, meta } = await runJsonTaskDetailed<TrendResearcherOutput>(
    context.supabase,
    context.workspaceId,
    `You are PULSE - Senior Trend Researcher for a production content platform.
RESPONSIBILITIES:
- Review only the provided workspace signals
- Select the most actionable signal for an immediate social content response
- Explain why the signal matters for this brand right now
- Never invent external facts not present in the supplied signals
OUTPUT CONTRACT (valid JSON only):
{
  "angle": "specific content angle in Brazilian Portuguese",
  "recommended_window": "timing recommendation",
  "chosen_signal": {
    "source_type": "news_item|viral_pattern|benchmark",
    "title": "signal title",
    "url": "string|null",
    "reason": "why this should be used now"
  },
  "supporting_points": ["short evidence point"],
  "references": ["URLs or source labels used in the decision"]
}
QUALITY RULES:
- Use only evidence supplied in the payload
- If there is no strong signal, fail instead of inventing one
- Respond ENTIRELY in Brazilian Portuguese
${context.brandContext.system_context}`,
    `Execution request: ${context.prompt}
Available signals:
${JSON.stringify(trendInputs, null, 2)}`,
    AI_PROVIDERS,
  );

  return { result: ensureTrendResearch(result), meta };
};

export const runContentStrategist = async (context: TaskContext) => {
  const research = toRecord(context.previousOutputs.trend_researcher);
  const researchBlock = Object.keys(research).length > 0
    ? `Research context:
${JSON.stringify(research, null, 2)}`
    : "Research context: none";

  const { result, meta } = await runJsonTaskDetailed<StrategyOutput>(
    context.supabase,
    context.workspaceId,
    `You are ATLAS - Principal Content Strategist at PostGen AI.
RESPONSIBILITIES:
- Define the best social format and content structure for this request
- Select the slide arc and CTA based on business intent
- Use research context when it exists
OUTPUT CONTRACT (valid JSON only):
{
  "format": "single|carousel",
  "slides_count": number,
  "template": "minimal-dark|editorial|bold-color|data-card|testimonial|clean-white",
  "theme": "string",
  "slide_structure": [{"index": 0, "type": "hook|agitation|insight|proof|cta|content", "key_message": "string"}],
  "cta": "specific CTA",
  "title": "scroll-stopping title"
}
QUALITY RULES:
- carousel must have 4 to 8 slides
- single must have exactly 1 slide
- No generic CTA
- Respond ENTIRELY in Brazilian Portuguese
${context.brandContext.system_context}`,
    `User request: ${context.prompt}
${researchBlock}`,
    AI_PROVIDERS,
  );

  return { result: ensureStrategy(result), meta };
};

export const runContentWriter = async (context: TaskContext) => {
  const strategy = ensureStrategy(context.previousOutputs.content_strategist);
  const { result, meta } = await runJsonTaskDetailed<WriterOutput>(
    context.supabase,
    context.workspaceId,
    `You are NOVA - Lead Copywriter at PostGen AI.
RESPONSIBILITIES:
- Write concise slide copy with real narrative progression
- Write a caption with a clear arc and strong opening line
- Keep the output brand-consistent and social-first
OUTPUT CONTRACT (valid JSON only):
{
  "slides": [{"index": 0, "headline": "string", "body": "string", "cta": "string|null"}],
  "caption": "string",
  "hashtags": "string"
}
QUALITY RULES:
- Provide exactly the same number of slides approved in strategy
- CTA only on the last slide
- Respond ENTIRELY in Brazilian Portuguese
${context.brandContext.system_context}`,
    `Approved strategy:
${JSON.stringify(strategy, null, 2)}`,
    AI_PROVIDERS,
  );

  return { result: ensureWriter(result, strategy), meta };
};

export const runContentDesigner = async (context: TaskContext) => {
  const strategy = ensureStrategy(context.previousOutputs.content_strategist);
  const writer = ensureWriter(context.previousOutputs.content_writer, strategy);
  const primaryColor = typeof context.brandContext.brandKit?.color_primary === "string" ? context.brandContext.brandKit.color_primary : "#7C3AED";
  const secondaryColor = typeof context.brandContext.brandKit?.color_secondary === "string" ? context.brandContext.brandKit.color_secondary : "#06B6D4";
  const fontHeadline = typeof context.brandContext.brandKit?.font_headline === "string" ? context.brandContext.brandKit.font_headline : "DM Sans";
  const templateGuide = buildTemplateGuide(strategy.template, primaryColor, secondaryColor);

  const { result, meta } = await runJsonTaskDetailed<DesignerOutput>(
    context.supabase,
    context.workspaceId,
    `You are VEGA - Senior Visual Designer at PostGen AI.
RESPONSIBILITIES:
- Convert approved copy into production-ready HTML slides
- Use only inline styles
- Respect brand kit and readability
OUTPUT CONTRACT (valid JSON only):
{
  "slides_html": ["<div style='...'>...</div>"],
  "template": "string"
}
TECHNICAL RULES:
- 540x540 px per slide
- No external CSS or images
- Brand primary color: ${primaryColor}
- Brand secondary color: ${secondaryColor}
- Headline font: ${fontHeadline}
- Template guide: ${templateGuide}
- Respond with JSON only
${context.brandContext.system_context}`,
    `Approved strategy:
${JSON.stringify(strategy, null, 2)}

Approved copy:
${JSON.stringify(writer, null, 2)}`,
    AI_PROVIDERS,
  );

  return { result: ensureDesigner(result, strategy), meta };
};

export const runSimlabValidator = async (context: TaskContext) => {
  const strategy = ensureStrategy(context.previousOutputs.content_strategist);
  const writer = ensureWriter(context.previousOutputs.content_writer, strategy);
  const designer = ensureDesigner(context.previousOutputs.content_designer, strategy);
  const briefing = toRecord(context.brandContext.briefing);
  const squad = toRecord(context.workspaceSquad);
  const finalPost = assembleFinalPost(strategy, writer, designer);

  const dispatch = await dispatchSimlabRun(context.supabase, {
    workspaceId: context.workspaceId,
    validationType: "content",
    moduleType: "content_post",
    stimulusType: strategy.format === "carousel" ? "social_carousel" : "social_post",
    objective: context.prompt,
    audienceHint: typeof briefing.target_audience === "string" ? briefing.target_audience : null,
    variants: [{
      key: "primary_candidate",
      label: strategy.title,
      artifact: {
        final_post: finalPost,
        strategy,
        writer,
      },
    }],
    requestPayload: {
      prompt: context.prompt,
      workspace_squad_id: typeof squad.id === "string" ? squad.id : null,
      squad_goal: typeof squad.goal === "string" ? squad.goal : null,
    },
    contextPolicy: {
      approval_mode: typeof squad.approval_mode === "string" ? squad.approval_mode : null,
      require_approval: true,
    },
    requestedBy: "agent_runtime",
    waitForCompletion: true,
    timeoutMs: 95_000,
  });

  const result = ensureSimlabValidation({
    run_id: dispatch.run.id,
    status: dispatch.run.status,
    verdict: dispatch.run.verdict,
    summary: dispatch.insight?.executive_summary || dispatch.run.failure_reason || null,
    insight: dispatch.insight || null,
    variant_count: dispatch.variants.length,
  });

  if (result.status !== "completed") {
    throw new Error(result.summary || dispatch.run.failure_reason || "SimLab nao concluiu a validacao do artefato.");
  }

  return {
      result,
      meta: {
        provider: typeof dispatch.run.provider_name === "string" ? dispatch.run.provider_name : "simlab",
        model: typeof dispatch.run.model_name === "string" ? dispatch.run.model_name : "simlab-v2",
        isFallback: false,
        attempts: [{ provider: "simlab", status: "success" }],
      },
  };
};

export const runContentQa = async (context: TaskContext) => {
  const strategy = ensureStrategy(context.previousOutputs.content_strategist);
  const writer = ensureWriter(context.previousOutputs.content_writer, strategy);
  const designer = ensureDesigner(context.previousOutputs.content_designer, strategy);
  const finalPost = assembleFinalPost(strategy, writer, designer);
  const simlabValidation = context.previousOutputs.simlab_validator
    ? ensureSimlabValidation(context.previousOutputs.simlab_validator)
    : null;

  if (simlabValidation && simlabValidation.verdict !== "approved") {
    return {
      result: {
        approved: false,
        summary: simlabValidation.summary || "SimLab bloqueou a publicacao do artefato.",
        issues: [
          `SimLab verdict: ${simlabValidation.verdict || "indefinido"}`,
          ...(simlabValidation.summary ? [simlabValidation.summary] : []),
        ],
        final_post: finalPost,
      },
      meta: {
        provider: "simlab_gate",
        model: "simlab-v2",
        isFallback: false,
        attempts: [{ provider: "simlab_gate", status: "success" }],
      },
    };
  }

  const { result, meta } = await runJsonTaskDetailed<QaOutput>(
    context.supabase,
    context.workspaceId,
    `You are IRIS - Content QA Lead at PostGen AI.
RESPONSIBILITIES:
- Validate strategy, copy and design as one production chain
- Reject generic, incoherent or unfinished outputs
- Return the final payload only when it is publication-ready
OUTPUT CONTRACT (valid JSON only):
{
  "approved": true|false,
  "summary": "string",
  "issues": ["string"],
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
QUALITY RULES:
- Keep the same number of slides approved in strategy
- Never invent a final payload if prior artifacts are weak or incomplete
- Reject when SimLab verdict is not approved
- Respond with JSON only
${context.brandContext.system_context}`,
    `Strategy:
${JSON.stringify(strategy, null, 2)}

Writer:
${JSON.stringify(writer, null, 2)}

Designer:
${JSON.stringify(designer, null, 2)}

SimLab:
${JSON.stringify(simlabValidation, null, 2)}`,
    AI_PROVIDERS,
  );

  return { result: ensureQa(result, strategy), meta };
};
