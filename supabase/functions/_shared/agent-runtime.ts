import { getContentTaskPlan } from "./agent-registry.ts";
import { BrandContext, JsonTaskMeta, createServiceClient, getBrandContext } from "./postgen.ts";
import { FinalPostOutput, runContentDesigner, runContentQa, runContentStrategist, runContentWriter, runSimlabValidator, runTrendResearcher } from "./content-squad.ts";
import { assertReadyTemplateAgentsSupported, getAgentStatusLabel } from "./agent-capabilities.ts";
import {
  ensureApprovedWebsiteSpecForBuild,
  runSiteBuilderExecutor,
  runSiteCopyArchitect,
  runSiteDataContractPlanner,
  runSiteDesignSystemGuardian,
  runSiteInformationArchitect,
  runSiteQualityReviewer,
  runSiteRepoPlanner,
  runSiteSpecAnalyst,
  type WebsiteBuildOutput,
  type WebsiteQaOutput,
} from "./website-squad.ts";

type AgentRunRow = {
  id: string;
  workspace_id: string;
  module_type: string;
  mode: string;
  original_prompt: string;
  status: string;
  identification?: Record<string, unknown> | null;
  assembled_prd?: string | null;
  final_prompt?: string | null;
  specialist_results?: Record<string, unknown> | null;
  squad_template_id?: string | null;
  workspace_squad_id?: string | null;
};

type AgentTaskRow = {
  id: string;
  prd_id: string;
  workspace_id: string;
  agent_id: string;
  status: string;
  task_order: number;
  depends_on_task_id?: string | null;
  input_payload?: Record<string, unknown> | null;
  output_payload?: Record<string, unknown> | null;
  attempt_count?: number | null;
  is_fallback?: boolean | null;
  error_msg?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
};

type WorkspaceSquadRow = {
  id: string;
  workspace_id: string;
  squad_template_id: string;
  name: string;
  status: string;
  goal?: string | null;
  benchmark_urls?: string[] | null;
  onboarding_answers?: Record<string, unknown> | null;
  config?: Record<string, unknown> | null;
};

type SquadTemplateRow = {
  id: string;
  module_type: string;
  runtime_status: string;
  name: string;
};

type SquadTemplateAgentRow = {
  agent_id: string;
  role_label?: string | null;
  task_order: number;
  depends_on_agent_id?: string | null;
};

type RuntimeContext = {
  brandContext: BrandContext;
  workspaceSquad: WorkspaceSquadRow | null;
};

type AgentArtifactRow = {
  id: string;
  prd_id: string;
  workspace_id: string;
  source_task_id?: string | null;
  artifact_kind: string;
  version_number: number;
  payload: Record<string, unknown> | null;
  summary?: string | null;
  status: string;
  created_at: string;
  approved_at?: string | null;
};

export const getStatusLabel = (task: AgentTaskRow) => {
  const custom = typeof task.input_payload?.role_label === "string" ? task.input_payload.role_label.trim() : "";
  if (custom) return custom;
  return getAgentStatusLabel(task.agent_id);
};

const toRecord = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

const getCompletedOutputs = (tasks: AgentTaskRow[]) => {
  const outputs: Record<string, unknown> = {};
  for (const task of tasks) {
    if (task.status === "completed" && task.output_payload) {
      outputs[task.agent_id] = task.output_payload.result ?? task.output_payload;
    }
  }
  return outputs;
};

const findNextReadyTask = (tasks: AgentTaskRow[]) => {
  const completedIds = new Set(tasks.filter((task) => task.status === "completed").map((task) => task.id));
  return tasks.find((task) =>
    task.status === "queued" &&
    (!task.depends_on_task_id || completedIds.has(task.depends_on_task_id))
  ) || null;
};

const persistExecutionLog = async (
  supabase: ReturnType<typeof createServiceClient>,
  params: { workspaceId: string; prdId: string; agentId: string; meta: JsonTaskMeta; durationMs: number; success: boolean; errorMessage?: string | null },
) => {
  await supabase.from("agent_execution_log").insert({
    workspace_id: params.workspaceId,
    prd_id: params.prdId,
    agent_type: params.agentId,
    provider: params.meta.provider,
    model: params.meta.model,
    input_tokens: null,
    output_tokens: null,
    duration_ms: params.durationMs,
    success: params.success,
    error_msg: params.errorMessage || null,
  });
};

const loadLatestArtifacts = async (
  supabase: ReturnType<typeof createServiceClient>,
  prdId: string,
) => {
  const { data, error } = await supabase
    .from("agent_artifacts")
    .select("*")
    .eq("prd_id", prdId)
    .order("artifact_kind")
    .order("version_number", { ascending: false });

  if (error) throw error;
  return (data || []) as AgentArtifactRow[];
};

const persistArtifact = async (
  supabase: ReturnType<typeof createServiceClient>,
  params: {
    prdId: string;
    workspaceId: string;
    sourceTaskId?: string | null;
    artifactKind: string;
    payload: Record<string, unknown>;
    summary?: string | null;
    status?: string;
  },
) => {
  const { data: latest, error: latestError } = await supabase
    .from("agent_artifacts")
    .select("version_number")
    .eq("prd_id", params.prdId)
    .eq("artifact_kind", params.artifactKind)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) throw latestError;

  const { error } = await supabase.from("agent_artifacts").insert({
    prd_id: params.prdId,
    workspace_id: params.workspaceId,
    source_task_id: params.sourceTaskId || null,
    artifact_kind: params.artifactKind,
    version_number: (latest?.version_number || 0) + 1,
    payload: params.payload,
    summary: params.summary || null,
    status: params.status || "generated",
  });

  if (error) throw error;
};

const getArtifactSpecsForTask = (
  run: AgentRunRow,
  task: AgentTaskRow,
  result: Record<string, unknown>,
) => {
  if (run.module_type === "website_spec" && task.agent_id === "site_spec_analyst") {
    return [
      {
        artifactKind: "spec",
        payload: result,
        summary: typeof result.goal === "string" ? result.goal : "Spec do site gerada.",
        status: "pending_approval",
      },
    ];
  }

  if (run.module_type === "website_build") {
    if (task.agent_id === "site_information_architect") {
      return [{ artifactKind: "plan", payload: result, summary: typeof result.summary === "string" ? result.summary : "Plano do site." }];
    }
    if (task.agent_id === "site_design_system_guardian") {
      return [{ artifactKind: "design_constitution", payload: result, summary: typeof result.summary === "string" ? result.summary : "Constituicao visual do site." }];
    }
    if (task.agent_id === "site_repo_planner") {
      return [{ artifactKind: "task_graph", payload: result, summary: "Grafo de tarefas do site." }];
    }
    if (task.agent_id === "site_quality_reviewer") {
      const qaSummary = typeof result.summary === "string" ? result.summary : "QA do site.";
      const handoffSummary = typeof result.handoff_summary === "string" ? result.handoff_summary : qaSummary;
      return [
        { artifactKind: "qa_report", payload: result, summary: qaSummary, status: (result.approved === true ? "approved" : "rejected") },
        { artifactKind: "handoff_summary", payload: { summary: handoffSummary }, summary: handoffSummary, status: (result.approved === true ? "approved" : "rejected") },
      ];
    }
  }

  return [];
};

const resolveTemplateExecution = async (
  supabase: ReturnType<typeof createServiceClient>,
  params: { workspaceId: string; moduleType: string; prompt: string; config?: Record<string, unknown>; squadTemplateId?: string; workspaceSquadId?: string },
) => {
  const hasExplicitSelection = Boolean(params.squadTemplateId || params.workspaceSquadId);

  if (!params.squadTemplateId && !params.workspaceSquadId) {
    const { data: defaultSquad, error: defaultSquadError } = await supabase
      .from("workspace_squads")
      .select("id,squad_template_id")
      .eq("workspace_id", params.workspaceId)
      .eq("is_default", true)
      .maybeSingle();

    if (defaultSquadError) throw defaultSquadError;
    const defaultTemplate = defaultSquad
      ? await supabase
          .from("squad_templates")
          .select("module_type,runtime_status")
          .eq("id", defaultSquad.squad_template_id)
          .maybeSingle()
      : { data: null, error: null };

    if (defaultTemplate.error) throw defaultTemplate.error;
    if (
      defaultSquad &&
      defaultTemplate.data?.module_type === params.moduleType &&
      defaultTemplate.data?.runtime_status === "ready"
    ) {
      params = {
        ...params,
        workspaceSquadId: defaultSquad.id,
        squadTemplateId: defaultSquad.squad_template_id,
      };
    } else {
      const { data: systemTemplate, error: systemTemplateError } = await supabase
        .from("squad_templates")
        .select("id")
        .eq("module_type", params.moduleType)
        .eq("runtime_status", "ready")
        .eq("is_active", true)
        .order("is_system", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (systemTemplateError) throw systemTemplateError;
      if (!systemTemplate) {
        return { moduleType: null, squadTemplateId: null, workspaceSquadId: null, tasks: [] as Array<Record<string, unknown>> };
      }

      params = {
        ...params,
        squadTemplateId: systemTemplate.id,
      };
    }
  }

  const workspaceSquad = params.workspaceSquadId
    ? await supabase.from("workspace_squads").select("*").eq("id", params.workspaceSquadId).eq("workspace_id", params.workspaceId).single()
    : { data: null, error: null };
  if (workspaceSquad.error) throw workspaceSquad.error;

  const templateId = params.squadTemplateId || workspaceSquad.data?.squad_template_id;
  if (!templateId) throw new Error("Squad template nao informado.");

  const { data: template, error: templateError } = await supabase
    .from("squad_templates")
    .select("id,module_type,runtime_status,name")
    .eq("id", templateId)
    .single();

  if (templateError || !template) throw templateError || new Error("Template de squad nao encontrado.");
  if (template.runtime_status !== "ready") {
    throw new Error(`O template "${template.name}" ainda nao possui runtime de producao habilitado.`);
  }
  if (template.module_type !== params.moduleType) {
    if (hasExplicitSelection) {
      throw new Error(`O squad "${template.name}" nao executa o modulo ${params.moduleType}.`);
    }
    return { moduleType: null, squadTemplateId: null, workspaceSquadId: null, tasks: [] as Array<Record<string, unknown>> };
  }

  const { data: templateAgents, error: templateAgentsError } = await supabase
    .from("squad_template_agents")
    .select("agent_id,role_label,task_order,depends_on_agent_id")
    .eq("squad_template_id", template.id)
    .order("task_order");

  if (templateAgentsError) throw templateAgentsError;
  if (!templateAgents || templateAgents.length === 0) {
    throw new Error(`O template "${template.name}" nao possui agentes configurados.`);
  }

  let runtimeAgents = [...(templateAgents as SquadTemplateAgentRow[])];
  if (
    template.module_type === "content_post" &&
    !runtimeAgents.some((agent) => agent.agent_id === "simlab_validator")
  ) {
    const qaAgent = runtimeAgents.find((agent) => agent.agent_id === "content_qa");
    const designerAgent = runtimeAgents.find((agent) => agent.agent_id === "content_designer");
    if (qaAgent && designerAgent) {
      runtimeAgents = runtimeAgents.map((agent) =>
        agent.agent_id === "content_qa"
          ? { ...agent, task_order: agent.task_order + 1, depends_on_agent_id: "simlab_validator" }
          : agent,
      );
      runtimeAgents.push({
        agent_id: "simlab_validator",
        role_label: "SimLab Validator",
        task_order: qaAgent.task_order,
        depends_on_agent_id: designerAgent.agent_id,
      });
      runtimeAgents = runtimeAgents.sort((left, right) => left.task_order - right.task_order);
    }
  }

  assertReadyTemplateAgentsSupported(template.name, template.runtime_status, runtimeAgents.map((agent) => agent.agent_id));

  const taskIds = new Map<string, string>();
  for (const row of runtimeAgents) {
    taskIds.set(row.agent_id, crypto.randomUUID());
  }

  return {
    moduleType: template.module_type,
    squadTemplateId: template.id,
    workspaceSquadId: workspaceSquad.data?.id || params.workspaceSquadId || null,
    tasks: runtimeAgents.map((row) => ({
      id: taskIds.get(row.agent_id)!,
      agentId: row.agent_id,
      taskOrder: row.task_order,
      dependsOnTaskId: row.depends_on_agent_id ? taskIds.get(row.depends_on_agent_id) || null : null,
      inputPayload: {
        prompt: params.prompt,
        config: params.config || {},
        role_label: row.role_label || null,
        workspace_squad_id: workspaceSquad.data?.id || params.workspaceSquadId || null,
      },
    })),
  };
};

export const createAgentRun = async (
  supabase: ReturnType<typeof createServiceClient>,
  params: { workspaceId: string; moduleType: string; prompt: string; mode?: string; identification?: Record<string, unknown>; config?: Record<string, unknown>; squadTemplateId?: string; workspaceSquadId?: string },
) => {
  if (params.moduleType === "website_build") {
    const config = toRecord(params.config);
    const sourcePrdId = typeof config.source_prd_id === "string" ? config.source_prd_id : null;
    await ensureApprovedWebsiteSpecForBuild(supabase, params.workspaceId, sourcePrdId);
  }

  const templateExecution = await resolveTemplateExecution(supabase, {
    workspaceId: params.workspaceId,
    moduleType: params.moduleType,
    prompt: params.prompt,
    config: params.config,
    squadTemplateId: params.squadTemplateId,
    workspaceSquadId: params.workspaceSquadId,
  });
  const moduleType = templateExecution.moduleType || params.moduleType;

  const { data: prd, error } = await supabase
    .from("agent_prds")
    .insert({
      workspace_id: params.workspaceId,
      module_type: moduleType,
      mode: params.mode || "balanced",
      status: "queued",
      original_prompt: params.prompt,
      identification: {
        ...(params.identification || {}),
        config: params.config || {},
      },
      fragments: [],
      specialist_results: {},
      assembled_prd: null,
      qa_score: null,
      final_prompt: null,
      squad_template_id: templateExecution.squadTemplateId || params.squadTemplateId || null,
      workspace_squad_id: templateExecution.workspaceSquadId || params.workspaceSquadId || null,
    })
    .select("*")
    .single();

  if (error || !prd) throw error || new Error("Nao foi possivel criar agent_prd.");

  const plan = templateExecution.tasks.length > 0
    ? templateExecution.tasks
    : moduleType === "content_post"
      ? getContentTaskPlan(params.prompt, params.config)
      : [];

  if (plan.length === 0) {
    throw new Error(`Nao existe plano de execucao real para o modulo ${moduleType}.`);
  }

  const rows = plan.map((task) => ({
    id: task.id,
    prd_id: prd.id,
    workspace_id: params.workspaceId,
    agent_id: task.agentId,
    status: "queued",
    task_order: task.taskOrder,
    depends_on_task_id: task.dependsOnTaskId || null,
    input_payload: task.inputPayload,
    output_payload: null,
    attempt_count: 0,
    is_fallback: false,
  }));

  const { error: taskError } = await supabase.from("agent_tasks").insert(rows);
  if (taskError) throw taskError;

  return prd;
};

const loadRunWithTasks = async (supabase: ReturnType<typeof createServiceClient>, prdId: string) => {
  const [{ data: run, error: runError }, { data: tasks, error: taskError }] = await Promise.all([
    supabase.from("agent_prds").select("*").eq("id", prdId).single(),
    supabase.from("agent_tasks").select("*").eq("prd_id", prdId).order("task_order"),
  ]);

  if (runError || !run) throw runError || new Error("Run nao encontrado.");
  if (taskError) throw taskError;

  return { run: run as AgentRunRow, tasks: (tasks || []) as AgentTaskRow[] };
};

const loadRuntimeContext = async (
  supabase: ReturnType<typeof createServiceClient>,
  run: AgentRunRow,
): Promise<RuntimeContext> => {
  const brandContext = await getBrandContext(supabase, run.workspace_id);
  if (!run.workspace_squad_id) return { brandContext, workspaceSquad: null };

  const { data: workspaceSquad, error } = await supabase
    .from("workspace_squads")
    .select("*")
    .eq("id", run.workspace_squad_id)
    .eq("workspace_id", run.workspace_id)
    .maybeSingle();

  if (error) throw error;
  return { brandContext, workspaceSquad: workspaceSquad as WorkspaceSquadRow | null };
};

const runTaskHandler = async (
  task: AgentTaskRow,
  run: AgentRunRow,
  runtimeContext: RuntimeContext,
  previousOutputs: Record<string, unknown>,
) => {
  const context = {
    supabase: createServiceClient(),
    workspaceId: run.workspace_id,
    prompt: run.original_prompt,
    brandContext: runtimeContext.brandContext,
    previousOutputs,
    workspaceSquad: runtimeContext.workspaceSquad,
    currentTaskInput: task.input_payload || {},
  };

  if (task.agent_id === "trend_researcher") return runTrendResearcher(context);
  if (task.agent_id === "content_strategist") return runContentStrategist(context);
  if (task.agent_id === "content_writer") return runContentWriter(context);
  if (task.agent_id === "content_designer") return runContentDesigner(context);
  if (task.agent_id === "simlab_validator") return runSimlabValidator(context);
  if (task.agent_id === "content_qa") return runContentQa(context);
  if (task.agent_id === "site_spec_analyst") return runSiteSpecAnalyst(context);
  if (task.agent_id === "site_information_architect") return runSiteInformationArchitect(context);
  if (task.agent_id === "site_design_system_guardian") return runSiteDesignSystemGuardian(context);
  if (task.agent_id === "site_copy_architect") return runSiteCopyArchitect(context);
  if (task.agent_id === "site_data_contract_planner") return runSiteDataContractPlanner(context);
  if (task.agent_id === "site_repo_planner") return runSiteRepoPlanner(context);
  if (task.agent_id === "site_builder_executor") return runSiteBuilderExecutor(context);
  if (task.agent_id === "site_quality_reviewer") return runSiteQualityReviewer(context);

  throw new Error(`Agent handler nao implementado para ${task.agent_id}.`);
};

const persistContentArtifact = async (
  supabase: ReturnType<typeof createServiceClient>,
  run: AgentRunRow,
  finalPost: FinalPostOutput,
  qa: Record<string, unknown>,
) => {
  const { data: existing } = await supabase
    .from("posts_v2")
    .select("id")
    .eq("agent_prd_id", run.id)
    .maybeSingle();

  const payload = {
    workspace_id: run.workspace_id,
    title: finalPost.title,
    format: finalPost.format,
    slides_html: finalPost.slides_html,
    caption: finalPost.caption,
    hashtags: finalPost.hashtags,
    template_id: finalPost.template,
    slides_count: finalPost.slides_html.length,
    status: "generated",
    source_topic: run.original_prompt,
    agent_prd_id: run.id,
    workspace_squad_id: run.workspace_squad_id || null,
    generation_meta: {
      source: run.workspace_squad_id ? "workspace_squad_runtime" : "chat_squad_runtime",
      qa_summary: typeof qa.summary === "string" ? qa.summary : null,
      approved: qa.approved === true,
    },
  };

  if (existing?.id) {
    await supabase.from("posts_v2").update(payload).eq("id", existing.id);
    return;
  }

  await supabase.from("posts_v2").insert(payload);
};

const getRunConfig = (run: AgentRunRow) => {
  const identification = toRecord(run.identification);
  return toRecord(identification.config);
};

const persistWebsiteProject = async (
  supabase: ReturnType<typeof createServiceClient>,
  run: AgentRunRow,
  buildOutput: WebsiteBuildOutput,
  qa: WebsiteQaOutput,
) => {
  const config = getRunConfig(run);
  const projectId = typeof config.project_id === "string" ? config.project_id : null;
  const websiteId = typeof config.website_id === "string" ? config.website_id : null;
  const buildTarget = typeof config.build_target === "string" ? config.build_target : "project_vfs";
  const nextPayload = {
    workspace_id: run.workspace_id,
    website_id: websiteId,
    build_target: buildTarget,
    name: typeof config.project_name === "string" && config.project_name.trim().length > 0
      ? config.project_name.trim()
      : `Projeto ${new Date().toISOString().slice(0, 10)}`,
    description: qa.handoff_summary,
    status: "draft",
    entry_file: "/src/App.tsx",
    source_files_json: buildOutput.files,
    preview_meta: {
      last_summary: buildOutput.summary,
      last_updated_at: new Date().toISOString(),
      qa_summary: qa.summary,
      qa_approved: qa.approved,
    },
  };

  if (projectId) {
    const { error } = await supabase
      .from("projects")
      .update(nextPayload)
      .eq("id", projectId)
      .eq("workspace_id", run.workspace_id);

    if (error) throw error;
    return projectId;
  }

  const { data, error } = await supabase
    .from("projects")
    .insert(nextPayload)
    .select("id")
    .single();

  if (error || !data) throw error || new Error("Nao foi possivel persistir o projeto do website.");
  return data.id as string;
};

const finalizeRun = async (
  supabase: ReturnType<typeof createServiceClient>,
  run: AgentRunRow,
  tasks: AgentTaskRow[],
) => {
  const outputs = getCompletedOutputs(tasks);
  const qa = toRecord(outputs.content_qa);
  const finalPostRecord = toRecord(qa.final_post);
  const hasFailure = tasks.some((task) => task.status === "failed");
  const allCompleted = tasks.length > 0 && tasks.every((task) => task.status === "completed");
  const qaApproved = qa.approved === true;
  const finalPost = finalPostRecord && typeof finalPostRecord.title === "string"
    ? finalPostRecord as unknown as FinalPostOutput
    : null;
  const websiteBuildOutput = run.module_type === "website_build"
    ? outputs.site_builder_executor as WebsiteBuildOutput | undefined
    : undefined;
  const websiteQa = run.module_type === "website_build"
    ? outputs.site_quality_reviewer as WebsiteQaOutput | undefined
    : undefined;

  if (allCompleted && run.module_type === "content_post" && finalPost && qaApproved) {
    await persistContentArtifact(supabase, run, finalPost, qa);
  }

  if (allCompleted && run.module_type === "website_build" && websiteBuildOutput && websiteQa?.approved) {
    await persistWebsiteProject(supabase, run, websiteBuildOutput, websiteQa);
  }

  const qaRejected = run.module_type === "content_post" && allCompleted && finalPost && !qaApproved;
  const websiteRejected = run.module_type === "website_build" && allCompleted && websiteQa && !websiteQa.approved;
  const buildSummary = typeof websiteBuildOutput?.summary === "string" ? websiteBuildOutput.summary : null;
  const websiteQaSummary = typeof websiteQa?.summary === "string" ? websiteQa.summary : null;

  const payload = {
    status: hasFailure || qaRejected || websiteRejected ? "failed" : allCompleted ? "completed" : run.status,
    specialist_results: outputs,
    fragments: tasks.map((task) => ({ agent_id: task.agent_id, status: task.status, task_id: task.id })),
    assembled_prd:
      typeof qa.summary === "string"
        ? qa.summary
        : websiteQaSummary || buildSummary,
    qa_score:
      typeof qa.approved === "boolean"
        ? (qa.approved ? 92 : 48)
        : typeof websiteQa?.approved === "boolean"
          ? (websiteQa.approved ? 94 : 41)
          : null,
    final_prompt: finalPost?.title || buildSummary || run.original_prompt,
  };

  const { data: updated, error } = await supabase
    .from("agent_prds")
    .update(payload)
    .eq("id", run.id)
    .select("*")
    .single();

  if (error) throw error;
  return updated;
};

export const processAgentRun = async (
  supabase: ReturnType<typeof createServiceClient>,
  prdId: string,
) => {
  const { run, tasks } = await loadRunWithTasks(supabase, prdId);
  const runtimeContext = await loadRuntimeContext(supabase, run);

  if (run.status === "queued") {
    await supabase.from("agent_prds").update({ status: "running" }).eq("id", run.id);
  }

  let currentTasks = tasks;
  while (true) {
    const nextTask = findNextReadyTask(currentTasks);
    if (!nextTask) break;

    const { data: claimedTask } = await supabase
      .from("agent_tasks")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
        attempt_count: (nextTask.attempt_count || 0) + 1,
        error_msg: null,
      })
      .eq("id", nextTask.id)
      .eq("status", "queued")
      .select("id")
      .maybeSingle();

    if (!claimedTask) {
      currentTasks = (await loadRunWithTasks(supabase, prdId)).tasks;
      continue;
    }

    const startedAt = Date.now();

    try {
      const previousOutputs = getCompletedOutputs(currentTasks);
      const { result, meta } = await runTaskHandler(nextTask, run, runtimeContext, previousOutputs);
      const resultRecord = toRecord(result);

      await supabase
        .from("agent_tasks")
        .update({
          status: "completed",
          output_payload: { result: resultRecord, meta },
          is_fallback: false,
          finished_at: new Date().toISOString(),
        })
        .eq("id", nextTask.id);

      const artifactSpecs = getArtifactSpecsForTask(run, nextTask, resultRecord);
      for (const artifact of artifactSpecs) {
        await persistArtifact(supabase, {
          prdId: run.id,
          workspaceId: run.workspace_id,
          sourceTaskId: nextTask.id,
          artifactKind: artifact.artifactKind,
          payload: artifact.payload,
          summary: artifact.summary,
          status: artifact.status,
        });
      }

      await persistExecutionLog(supabase, {
        workspaceId: run.workspace_id,
        prdId: run.id,
        agentId: nextTask.agent_id,
        meta,
        durationMs: Date.now() - startedAt,
        success: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await supabase
        .from("agent_tasks")
        .update({
          status: "failed",
          error_msg: message,
          finished_at: new Date().toISOString(),
        })
        .eq("id", nextTask.id);

      await persistExecutionLog(supabase, {
        workspaceId: run.workspace_id,
        prdId: run.id,
        agentId: nextTask.agent_id,
        meta: { provider: null, model: null, isFallback: false, attempts: [] },
        durationMs: Date.now() - startedAt,
        success: false,
        errorMessage: message,
      });

      break;
    }

    currentTasks = (await loadRunWithTasks(supabase, prdId)).tasks;
  }

  const refreshed = await loadRunWithTasks(supabase, prdId);
  const updatedRun = await finalizeRun(supabase, refreshed.run, refreshed.tasks);
  return { run: updatedRun, tasks: refreshed.tasks };
};

export const processQueuedRuns = async (
  supabase: ReturnType<typeof createServiceClient>,
  limit = 3,
) => {
  const { data, error } = await supabase
    .from("agent_prds")
    .select("id")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(Math.max(1, limit));

  if (error) throw error;

  const results = [];
  for (const row of data || []) {
    results.push(await processAgentRun(supabase, row.id));
  }
  return results;
};

export const getAgentRunStatus = async (
  supabase: ReturnType<typeof createServiceClient>,
  prdId: string,
) => {
  const { run, tasks } = await loadRunWithTasks(supabase, prdId);
  const artifacts = await loadLatestArtifacts(supabase, prdId);
  const specialistResults = toRecord(run.specialist_results);
  return {
    prd_id: run.id,
    status: run.status,
    module_type: run.module_type,
    original_prompt: run.original_prompt,
    assembled_prd: run.assembled_prd,
    final_prompt: run.final_prompt,
    specialist_results: specialistResults,
    artifacts: artifacts.map((artifact) => ({
      id: artifact.id,
      prd_id: artifact.prd_id,
      artifact_kind: artifact.artifact_kind,
      payload: artifact.payload,
      summary: artifact.summary || null,
      status: artifact.status,
      version_number: artifact.version_number,
      created_at: artifact.created_at,
      approved_at: artifact.approved_at || null,
    })),
    tasks: tasks.map((task) => ({
      id: task.id,
      agent_id: task.agent_id,
      label: getStatusLabel(task),
      status: task.status,
      task_order: task.task_order,
      is_fallback: task.is_fallback,
      error_msg: task.error_msg,
      started_at: task.started_at || null,
      finished_at: task.finished_at || null,
    })),
  };
};
