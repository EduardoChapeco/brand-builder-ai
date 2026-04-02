import type { Json } from "@/integrations/supabase/types";

export type AgentArtifactKind =
  | "spec"
  | "plan"
  | "task_graph"
  | "design_constitution"
  | "qa_report"
  | "handoff_summary";

export type AgentArtifactRecord = {
  id: string;
  prd_id: string;
  artifact_kind: AgentArtifactKind;
  payload: Json | null;
  status: string;
  summary: string | null;
  created_at: string;
  approved_at?: string | null;
};

export type WebsiteSpec = {
  site_type: string;
  audience: string;
  goal: string;
  value_proposition: string;
  pages: Array<{
    name: string;
    slug: string;
    sections: string[];
  }>;
  primary_cta: {
    label: string;
    intent: string;
  };
  content_requirements: string[];
  data_requirements: string[];
  integrations: string[];
  visual_direction: {
    tone: string;
    palette: string[];
    typography: string;
    notes: string[];
  };
  constraints: string[];
};

export type WebsitePlan = {
  summary: string;
  phases: Array<{
    name: string;
    outcome: string;
    deliverables: string[];
  }>;
  priority_pages: string[];
};

export type WebsiteTaskGraph = {
  tasks: Array<{
    id: string;
    owner: string;
    title: string;
    depends_on: string[];
    output: string;
  }>;
  critical_path: string[];
};

export type WebsiteQaReport = {
  approved: boolean;
  summary: string;
  issues: string[];
  handoff_summary: string;
};

const toRecord = (value: Json | null | undefined) =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, Json>) : null;

export const getLatestArtifact = (
  artifacts: AgentArtifactRecord[],
  artifactKind: AgentArtifactKind,
) =>
  artifacts
    .filter((artifact) => artifact.artifact_kind === artifactKind)
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())[0] || null;

export const readWebsiteSpec = (artifact: AgentArtifactRecord | null): WebsiteSpec | null => {
  const payload = toRecord(artifact?.payload);
  if (!payload) return null;
  return payload as unknown as WebsiteSpec;
};

export const readWebsitePlan = (artifact: AgentArtifactRecord | null): WebsitePlan | null => {
  const payload = toRecord(artifact?.payload);
  if (!payload) return null;
  return payload as unknown as WebsitePlan;
};

export const readWebsiteTaskGraph = (artifact: AgentArtifactRecord | null): WebsiteTaskGraph | null => {
  const payload = toRecord(artifact?.payload);
  if (!payload) return null;
  return payload as unknown as WebsiteTaskGraph;
};

export const readWebsiteQaReport = (artifact: AgentArtifactRecord | null): WebsiteQaReport | null => {
  const payload = toRecord(artifact?.payload);
  if (!payload) return null;
  return payload as unknown as WebsiteQaReport;
};
