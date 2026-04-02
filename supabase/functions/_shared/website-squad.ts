import {
  DEFAULT_SITE_CONSTITUTION,
  scanSourceFilesAgainstConstitution,
  summarizeConstitutionFindings,
  type DesignConstitution,
} from "../../../src/lib/siteDesignConstitution.ts";
import { BrandContext, createServiceClient, type JsonTaskMeta, runJsonTaskDetailed } from "./postgen.ts";

type TaskContext = {
  supabase: ReturnType<typeof createServiceClient>;
  workspaceId: string;
  prompt: string;
  brandContext: BrandContext;
  previousOutputs: Record<string, unknown>;
  workspaceSquad?: Record<string, unknown> | null;
  currentTaskInput?: Record<string, unknown>;
};

type ProjectRow = {
  id: string;
  name: string;
  description?: string | null;
  source_files_json?: Record<string, string> | null;
};

export type WebsiteSpecOutput = {
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

export type WebsitePlanOutput = {
  summary: string;
  phases: Array<{
    name: string;
    outcome: string;
    deliverables: string[];
  }>;
  priority_pages: string[];
};

export type WebsiteCopyOutput = {
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    primary_cta: string;
    secondary_cta: string;
  };
  sections: Array<{
    section: string;
    title: string;
    body: string;
    bullets: string[];
  }>;
  footer_note: string;
};

export type WebsiteDataContractOutput = {
  integrations: Array<{
    name: string;
    purpose: string;
    required_fields: string[];
  }>;
  forms: Array<{
    name: string;
    fields: string[];
    storage_target: string;
  }>;
};

export type WebsiteTaskGraphOutput = {
  tasks: Array<{
    id: string;
    owner: string;
    title: string;
    depends_on: string[];
    output: string;
  }>;
  critical_path: string[];
};

export type WebsiteBuildOutput = {
  summary: string;
  diagnostics: string[];
  files: Record<string, string>;
};

export type WebsiteQaOutput = {
  approved: boolean;
  summary: string;
  issues: string[];
  findings: Array<{
    file: string;
    pattern: string;
    severity: string;
    message: string;
  }>;
  handoff_summary: string;
};

const AI_PROVIDERS = ["groq", "openrouter", "gemini"];

const DEFAULT_PROJECT_FILES: Record<string, string> = {
  "/src/App.tsx": `export default function App() {
  return (
    <main
      style={{
        minHeight: "100vh",
        "--page-bg": "#f8fafc",
        "--page-surface": "#ffffff",
        "--page-border": "#e4e4e7",
        "--page-text": "#09090b",
        "--page-muted": "#52525b",
        background: "var(--page-bg)",
        color: "var(--page-text)",
        fontFamily: "Inter, system-ui, sans-serif",
      } as React.CSSProperties}
    >
      <section
        style={{
          maxWidth: 920,
          margin: "0 auto",
          padding: "72px 24px",
        }}
      >
        <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--page-muted)" }}>
          Site squad
        </p>
        <h1 style={{ margin: "12px 0 16px", fontSize: 52, lineHeight: 1.02 }}>
          Aprove a spec para gerar o site.
        </h1>
        <p style={{ margin: 0, maxWidth: 640, fontSize: 18, lineHeight: 1.7, color: "var(--page-muted)" }}>
          O fluxo spec-driven monta briefing, plano, tarefas e so entao executa o projeto multi-arquivo.
        </p>
      </section>
    </main>
  );
}
`,
  "/src/index.tsx": `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(<App />);
`,
};

const manualMeta = (): JsonTaskMeta => ({
  provider: null,
  model: null,
  isFallback: false,
  attempts: [],
});

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

const getConfig = (context: TaskContext) =>
  toRecord(context.currentTaskInput?.config);

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

const loadProject = async (
  supabase: ReturnType<typeof createServiceClient>,
  projectId: string | null,
  workspaceId: string,
) => {
  if (!projectId) return null;

  const { data, error } = await supabase
    .from("projects")
    .select("id,name,description,source_files_json")
    .eq("id", projectId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw error;
  return data as ProjectRow | null;
};

const loadApprovedSpec = async (
  supabase: ReturnType<typeof createServiceClient>,
  prdId: string,
  workspaceId: string,
) => {
  const { data, error } = await supabase
    .from("agent_artifacts")
    .select("*")
    .eq("prd_id", prdId)
    .eq("workspace_id", workspaceId)
    .eq("artifact_kind", "spec")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? (data.payload as unknown as WebsiteSpecOutput) : null;
};

const ensureWebsiteSpec = (raw: unknown): WebsiteSpecOutput => {
  const record = toRecord(raw);
  const visualDirection = toRecord(record.visual_direction);

  const pages = Array.isArray(record.pages)
    ? record.pages.map((page, index) => {
        const pageRecord = toRecord(page);
        return {
          name: requireString(pageRecord.name, `pages[${index}].name`),
          slug: requireString(pageRecord.slug, `pages[${index}].slug`),
          sections: requireStringArray(pageRecord.sections, `pages[${index}].sections`),
        };
      })
    : [];

  if (pages.length === 0) {
    throw new Error("A spec precisa conter ao menos uma pagina.");
  }

  const primaryCta = toRecord(record.primary_cta);
  return {
    site_type: requireString(record.site_type, "site_type"),
    audience: requireString(record.audience, "audience"),
    goal: requireString(record.goal, "goal"),
    value_proposition: requireString(record.value_proposition, "value_proposition"),
    pages,
    primary_cta: {
      label: requireString(primaryCta.label, "primary_cta.label"),
      intent: requireString(primaryCta.intent, "primary_cta.intent"),
    },
    content_requirements: requireStringArray(record.content_requirements, "content_requirements"),
    data_requirements: requireStringArray(record.data_requirements, "data_requirements", 0),
    integrations: requireStringArray(record.integrations, "integrations", 0),
    visual_direction: {
      tone: requireString(visualDirection.tone, "visual_direction.tone"),
      palette: requireStringArray(visualDirection.palette, "visual_direction.palette"),
      typography: requireString(visualDirection.typography, "visual_direction.typography"),
      notes: requireStringArray(visualDirection.notes, "visual_direction.notes", 0),
    },
    constraints: requireStringArray(record.constraints, "constraints", 0),
  };
};

const ensureWebsitePlan = (raw: unknown): WebsitePlanOutput => {
  const record = toRecord(raw);
  const phases = Array.isArray(record.phases)
    ? record.phases.map((phase, index) => {
        const phaseRecord = toRecord(phase);
        return {
          name: requireString(phaseRecord.name, `phases[${index}].name`),
          outcome: requireString(phaseRecord.outcome, `phases[${index}].outcome`),
          deliverables: requireStringArray(phaseRecord.deliverables, `phases[${index}].deliverables`),
        };
      })
    : [];

  if (phases.length === 0) {
    throw new Error("O plano precisa conter ao menos uma fase.");
  }

  return {
    summary: requireString(record.summary, "summary"),
    phases,
    priority_pages: requireStringArray(record.priority_pages, "priority_pages"),
  };
};

const ensureWebsiteCopy = (raw: unknown): WebsiteCopyOutput => {
  const record = toRecord(raw);
  const hero = toRecord(record.hero);
  const sections = Array.isArray(record.sections)
    ? record.sections.map((section, index) => {
        const sectionRecord = toRecord(section);
        return {
          section: requireString(sectionRecord.section, `sections[${index}].section`),
          title: requireString(sectionRecord.title, `sections[${index}].title`),
          body: requireString(sectionRecord.body, `sections[${index}].body`),
          bullets: requireStringArray(sectionRecord.bullets, `sections[${index}].bullets`, 0),
        };
      })
    : [];

  return {
    hero: {
      eyebrow: requireString(hero.eyebrow, "hero.eyebrow"),
      title: requireString(hero.title, "hero.title"),
      description: requireString(hero.description, "hero.description"),
      primary_cta: requireString(hero.primary_cta, "hero.primary_cta"),
      secondary_cta: requireString(hero.secondary_cta, "hero.secondary_cta"),
    },
    sections,
    footer_note: requireString(record.footer_note, "footer_note"),
  };
};

const ensureWebsiteDataContract = (raw: unknown): WebsiteDataContractOutput => {
  const record = toRecord(raw);
  const integrations = Array.isArray(record.integrations)
    ? record.integrations.map((item, index) => {
        const integration = toRecord(item);
        return {
          name: requireString(integration.name, `integrations[${index}].name`),
          purpose: requireString(integration.purpose, `integrations[${index}].purpose`),
          required_fields: requireStringArray(integration.required_fields, `integrations[${index}].required_fields`, 0),
        };
      })
    : [];
  const forms = Array.isArray(record.forms)
    ? record.forms.map((item, index) => {
        const form = toRecord(item);
        return {
          name: requireString(form.name, `forms[${index}].name`),
          fields: requireStringArray(form.fields, `forms[${index}].fields`),
          storage_target: requireString(form.storage_target, `forms[${index}].storage_target`),
        };
      })
    : [];

  return {
    integrations,
    forms,
  };
};

const ensureTaskGraph = (raw: unknown): WebsiteTaskGraphOutput => {
  const record = toRecord(raw);
  const tasks = Array.isArray(record.tasks)
    ? record.tasks.map((item, index) => {
        const task = toRecord(item);
        return {
          id: requireString(task.id, `tasks[${index}].id`),
          owner: requireString(task.owner, `tasks[${index}].owner`),
          title: requireString(task.title, `tasks[${index}].title`),
          depends_on: requireStringArray(task.depends_on, `tasks[${index}].depends_on`, 0),
          output: requireString(task.output, `tasks[${index}].output`),
        };
      })
    : [];

  if (tasks.length === 0) {
    throw new Error("O task graph precisa conter ao menos uma tarefa.");
  }

  return {
    tasks,
    critical_path: requireStringArray(record.critical_path, "critical_path"),
  };
};

const ensureBuildOutput = (raw: unknown): WebsiteBuildOutput => {
  const record = toRecord(raw);
  const filesRecord = toRecord(record.files);
  const files = Object.entries(filesRecord).reduce<Record<string, string>>((acc, [path, value]) => {
    if (typeof value === "string" && value.trim().length > 0) {
      acc[path] = value;
    }
    return acc;
  }, {});

  if (Object.keys(files).length === 0) {
    throw new Error("A geracao do projeto nao retornou arquivos validos.");
  }

  return {
    summary: requireString(record.summary, "summary"),
    diagnostics: requireStringArray(record.diagnostics, "diagnostics", 0),
    files,
  };
};

const buildSystemPreamble = (constitution: DesignConstitution) => `
Constituicao visual obrigatoria:
- Use variaveis CSS semanticas e evite hardcodes.
- Nao use sombras utilitarias ou box-shadow em superficies padrao.
- Nao use preto/branco hardcoded como base visual.
- Componentes exigidos no app: ${constitution.requiredComponents.join(", ")}.
- Estados obrigatorios no modulo: ${constitution.requiredStates.join(", ")}.
Padroes proibidos: ${constitution.forbiddenPatterns.join(", ")}.
`.trim();

export const runSiteSpecAnalyst = async (context: TaskContext) => {
  const config = getConfig(context);
  const { result, meta } = await runJsonTaskDetailed<WebsiteSpecOutput>(
    context.supabase,
    context.workspaceId,
    `Voce transforma um pedido de site em uma spec profissional e concreta.
Responda apenas JSON valido com:
{
  "site_type":"string",
  "audience":"string",
  "goal":"string",
  "value_proposition":"string",
  "pages":[{"name":"string","slug":"string","sections":["string"]}],
  "primary_cta":{"label":"string","intent":"string"},
  "content_requirements":["string"],
  "data_requirements":["string"],
  "integrations":["string"],
  "visual_direction":{"tone":"string","palette":["string"],"typography":"string","notes":["string"]},
  "constraints":["string"]
}
${buildSystemPreamble(DEFAULT_SITE_CONSTITUTION)}
${context.brandContext.system_context}`,
    `Prompt original: ${context.prompt}

Contexto adicional:
${JSON.stringify({
  project_id: typeof config.project_id === "string" ? config.project_id : null,
  website_id: typeof config.website_id === "string" ? config.website_id : null,
  build_target: typeof config.build_target === "string" ? config.build_target : "project_vfs",
})}`,
    AI_PROVIDERS,
  );

  return { result: ensureWebsiteSpec(result), meta };
};

export const runSiteInformationArchitect = async (context: TaskContext) => {
  const spec = ensureWebsiteSpec(context.previousOutputs.site_spec_analyst);
  const { result, meta } = await runJsonTaskDetailed<WebsitePlanOutput>(
    context.supabase,
    context.workspaceId,
    `Voce recebe uma spec aprovada e devolve um plano de execucao para um site multi-arquivo.
Responda JSON valido com:
{
  "summary":"string",
  "phases":[{"name":"string","outcome":"string","deliverables":["string"]}],
  "priority_pages":["string"]
}
Foque em ordem de entrega, risco e impacto.`,
    `Spec aprovada:
${JSON.stringify(spec)}`,
    AI_PROVIDERS,
  );

  return { result: ensureWebsitePlan(result), meta };
};

export const runSiteDesignSystemGuardian = async (context: TaskContext) => {
  const spec = ensureWebsiteSpec(context.previousOutputs.site_spec_analyst);
  const constitution: DesignConstitution = {
    ...DEFAULT_SITE_CONSTITUTION,
    summary: `Constituicao visual para ${spec.site_type} com tom ${spec.visual_direction.tone}.`,
    guidance: [
      ...DEFAULT_SITE_CONSTITUTION.guidance,
      `Paleta sugerida: ${spec.visual_direction.palette.join(", ") || "usar tokens neutros"}.`,
      `Tipografia esperada: ${spec.visual_direction.typography}.`,
    ],
  };

  return { result: constitution, meta: manualMeta() };
};

export const runSiteCopyArchitect = async (context: TaskContext) => {
  const spec = ensureWebsiteSpec(context.previousOutputs.site_spec_analyst);
  const { result, meta } = await runJsonTaskDetailed<WebsiteCopyOutput>(
    context.supabase,
    context.workspaceId,
    `Voce escreve o pacote de copy para um site a partir da spec.
Responda JSON valido com:
{
  "hero":{"eyebrow":"string","title":"string","description":"string","primary_cta":"string","secondary_cta":"string"},
  "sections":[{"section":"string","title":"string","body":"string","bullets":["string"]}],
  "footer_note":"string"
}
Texto em portugues do Brasil, claro e orientado a conversao.`,
    `Spec aprovada:
${JSON.stringify(spec)}`,
    AI_PROVIDERS,
  );

  return { result: ensureWebsiteCopy(result), meta };
};

export const runSiteDataContractPlanner = async (context: TaskContext) => {
  const spec = ensureWebsiteSpec(context.previousOutputs.site_spec_analyst);
  const { result, meta } = await runJsonTaskDetailed<WebsiteDataContractOutput>(
    context.supabase,
    context.workspaceId,
    `Voce mapeia formularios, integracoes e contratos de dados de um site.
Responda JSON valido com:
{
  "integrations":[{"name":"string","purpose":"string","required_fields":["string"]}],
  "forms":[{"name":"string","fields":["string"],"storage_target":"string"}]
}
Se nao houver integracao necessaria, retorne arrays vazios.`,
    `Spec aprovada:
${JSON.stringify(spec)}`,
    AI_PROVIDERS,
  );

  return { result: ensureWebsiteDataContract(result), meta };
};

export const runSiteRepoPlanner = async (context: TaskContext) => {
  const spec = ensureWebsiteSpec(context.previousOutputs.site_spec_analyst);
  const plan = ensureWebsitePlan(context.previousOutputs.site_information_architect);
  const { result, meta } = await runJsonTaskDetailed<WebsiteTaskGraphOutput>(
    context.supabase,
    context.workspaceId,
    `Voce transforma uma spec e um plano em um grafo curto de tarefas de execucao.
Responda JSON valido com:
{
  "tasks":[{"id":"string","owner":"string","title":"string","depends_on":["string"],"output":"string"}],
  "critical_path":["string"]
}
Use owners entre: design, copy, data, repo, builder, qa.`,
    `Spec:
${JSON.stringify(spec)}

Plano:
${JSON.stringify(plan)}`,
    AI_PROVIDERS,
  );

  return { result: ensureTaskGraph(result), meta };
};

export const runSiteBuilderExecutor = async (context: TaskContext) => {
  const config = getConfig(context);
  const spec = ensureWebsiteSpec(context.previousOutputs.site_spec_analyst);
  const plan = ensureWebsitePlan(context.previousOutputs.site_information_architect);
  const copy = ensureWebsiteCopy(context.previousOutputs.site_copy_architect);
  const dataContract = ensureWebsiteDataContract(context.previousOutputs.site_data_contract_planner);
  const taskGraph = ensureTaskGraph(context.previousOutputs.site_repo_planner);
  const constitution = context.previousOutputs.site_design_system_guardian as DesignConstitution;
  const projectId = typeof config.project_id === "string" ? config.project_id : null;
  const project = await loadProject(context.supabase, projectId, context.workspaceId);
  const baseFiles = project?.source_files_json && Object.keys(project.source_files_json).length > 0
    ? project.source_files_json
    : DEFAULT_PROJECT_FILES;

  const { result, meta } = await runJsonTaskDetailed<WebsiteBuildOutput>(
    context.supabase,
    context.workspaceId,
    `Voce edita um projeto React + TypeScript multi-arquivo que sera renderizado no Sandpack.
Responda apenas JSON valido:
{
  "summary":"string",
  "diagnostics":["string"],
  "files":{"/src/App.tsx":"string","/src/index.tsx":"string"}
}
Regras obrigatorias:
- retorne apenas arquivos completos a criar ou sobrescrever
- mantenha o projeto compilavel
- use React funcional simples, sem dependencias extras
- use variaveis CSS semanticas locais (var(--...)) para cores e espacamentos
- nao use box-shadow, shadow-* ou preto/branco hardcoded como base visual
- respeite a constituicao visual e o task graph aprovados
- produza um site coerente ja no primeiro output, sem placeholders vazios`,
    `Prompt original:
${context.prompt}

Spec aprovada:
${JSON.stringify(spec)}

Plano:
${JSON.stringify(plan)}

Copy:
${JSON.stringify(copy)}

Contratos de dados:
${JSON.stringify(dataContract)}

Task graph:
${JSON.stringify(taskGraph)}

Constituicao visual:
${JSON.stringify(constitution)}

Arquivos atuais:
${JSON.stringify(baseFiles).slice(0, 28000)}`,
    AI_PROVIDERS,
  );

  return { result: ensureBuildOutput(result), meta };
};

export const runSiteQualityReviewer = async (context: TaskContext) => {
  const buildOutput = ensureBuildOutput(context.previousOutputs.site_builder_executor);
  const findings = scanSourceFilesAgainstConstitution(
    buildOutput.files,
    context.previousOutputs.site_design_system_guardian as DesignConstitution,
  );
  const approved = findings.every((item) => item.severity !== "error");
  const summary = approved
    ? "Projeto aprovado pelo QA visual e tecnico."
    : summarizeConstitutionFindings(findings);

  const issues = findings.map((item) => `${item.file}: ${item.message}`);

  return {
    result: {
      approved,
      summary,
      issues,
      findings,
      handoff_summary: approved
        ? `Projeto pronto para preview com ${Object.keys(buildOutput.files).length} arquivo(s) atualizado(s).`
        : "O projeto precisa de ajustes antes de ir para o preview final.",
    } satisfies WebsiteQaOutput,
    meta: manualMeta(),
  };
};

export const ensureApprovedWebsiteSpecForBuild = async (
  supabase: ReturnType<typeof createServiceClient>,
  workspaceId: string,
  sourcePrdId: string | null,
) => {
  if (!sourcePrdId) {
    throw new Error("website_build exige source_prd_id de uma spec aprovada.");
  }

  const approvedSpec = await loadApprovedSpec(supabase, sourcePrdId, workspaceId);
  if (!approvedSpec) {
    throw new Error("Nao existe spec aprovada para iniciar o website_build.");
  }

  return approvedSpec;
};
