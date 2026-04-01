export type AgentModuleType = "content_post";

export type RegisteredAgent = {
  id: string;
  label: string;
  role: "strategy" | "copy" | "design" | "qa";
  moduleTypes: AgentModuleType[];
  promptVersion: number;
  personaStyle: string;
  promptTemplate: string;
  capabilities: string[];
  allowedTools: string[];
};

export type AgentTaskPlan = {
  id: string;
  agentId: string;
  taskOrder: number;
  dependsOnTaskId?: string | null;
  inputPayload: Record<string, unknown>;
};

export const AGENT_REGISTRY: Record<string, RegisteredAgent> = {
  content_strategist: {
    id: "content_strategist",
    label: "Content Strategist",
    role: "strategy",
    moduleTypes: ["content_post"],
    promptVersion: 1,
    personaStyle: "Direct, concise and strategic.",
    promptTemplate: "Defines content structure, format, slide arc, CTA and template direction.",
    capabilities: ["content.strategy", "social.hooks", "content.structure"],
    allowedTools: ["llm"],
  },
  content_writer: {
    id: "content_writer",
    label: "Content Writer",
    role: "copy",
    moduleTypes: ["content_post"],
    promptVersion: 1,
    personaStyle: "Sharp, social-first and brand-consistent.",
    promptTemplate: "Writes slide copy, caption and hashtags for the approved strategy.",
    capabilities: ["content.copy", "captions", "hashtags"],
    allowedTools: ["llm"],
  },
  content_designer: {
    id: "content_designer",
    label: "Content Designer",
    role: "design",
    moduleTypes: ["content_post"],
    promptVersion: 1,
    personaStyle: "Modern, restrained and production-oriented.",
    promptTemplate: "Generates self-contained HTML slides from strategy and approved copy.",
    capabilities: ["html5.social.design", "layout", "brand.visuals"],
    allowedTools: ["llm"],
  },
  content_qa: {
    id: "content_qa",
    label: "Content QA",
    role: "qa",
    moduleTypes: ["content_post"],
    promptVersion: 1,
    personaStyle: "Strict, skeptical and production-focused.",
    promptTemplate: "Reviews strategy, copy and design, then assembles the final payload.",
    capabilities: ["quality.review", "brand.consistency", "payload.assembly"],
    allowedTools: ["llm"],
  },
};

export const getRegisteredAgent = (agentId: string) => AGENT_REGISTRY[agentId] || null;

export const getContentTaskPlan = (
  prompt: string,
  config: Record<string, unknown> = {},
): AgentTaskPlan[] => {
  const strategistId = crypto.randomUUID();
  const writerId = crypto.randomUUID();
  const designerId = crypto.randomUUID();
  const qaId = crypto.randomUUID();

  return [
    {
      id: strategistId,
      agentId: "content_strategist",
      taskOrder: 1,
      inputPayload: {
        prompt,
        config,
      },
    },
    {
      id: writerId,
      agentId: "content_writer",
      taskOrder: 2,
      dependsOnTaskId: strategistId,
      inputPayload: {
        prompt,
      },
    },
    {
      id: designerId,
      agentId: "content_designer",
      taskOrder: 3,
      dependsOnTaskId: writerId,
      inputPayload: {
        prompt,
      },
    },
    {
      id: qaId,
      agentId: "content_qa",
      taskOrder: 4,
      dependsOnTaskId: designerId,
      inputPayload: {
        prompt,
      },
    },
  ];
};
