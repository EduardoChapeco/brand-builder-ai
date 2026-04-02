export type Question = {
  id: string;
  step: "goal" | "operations" | "references";
  label: string;
  type: "text" | "textarea" | "select" | "url_list";
  required?: boolean;
  placeholder?: string;
  options?: string[];
};

export type RosterAgent = {
  id: string;
  agent_id: string;
  role_label: string;
  seniority: string;
  career_summary: string;
  checkpoint_policy: Record<string, unknown>;
};

export type Template = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  module_type: string;
  runtime_status: string;
  onboarding_questions: Question[];
  default_config: Record<string, unknown>;
  source_refs: Array<{ label: string; url: string }>;
  agents: RosterAgent[];
  agent_count: number;
};

export type WorkspaceSquad = {
  id: string;
  workspace_id: string;
  squad_template_id: string;
  name: string;
  status: string;
  goal: string | null;
  channel: string | null;
  cadence: string | null;
  approval_mode: string | null;
  onboarding_answers: Record<string, unknown>;
  config: Record<string, unknown>;
  is_default: boolean;
  template: {
    id: string;
    slug: string;
    name: string;
    module_type: string;
    runtime_status: string;
    agent_count: number;
  } | null;
};

export type Catalog = {
  agents: Array<{
    id: string;
    label: string;
    seniority: string;
    career_summary: string;
    ui_group: string;
  }>;
  templates: Template[];
  workspace_squads: WorkspaceSquad[];
};

export type PostData = {
  title: string;
  format: "single" | "carousel";
  slides_html: string[];
  caption: string;
  hashtags: string;
  template: string;
};

export type AgentTaskStatus = {
  id: string;
  agent_id: string;
  label: string;
  status: "queued" | "running" | "completed" | "failed";
  task_order: number;
  error_msg?: string | null;
};

export type AgentStatusPayload = {
  prd_id: string;
  status: "queued" | "running" | "completed" | "failed";
  module_type: string;
  original_prompt: string;
  assembled_prd?: string | null;
  final_prompt?: string | null;
  specialist_results?: Record<string, unknown> | null;
  tasks: AgentTaskStatus[];
};
