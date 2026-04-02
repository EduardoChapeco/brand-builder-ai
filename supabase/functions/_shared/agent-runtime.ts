import { getContentTaskPlan } from "./agent-registry.ts";
import { BrandContext, JsonTaskMeta, createServiceClient, getBrandContext } from "./postgen.ts";
import { FinalPostOutput, runContentDesigner, runContentQa, runContentStrategist, runContentWriter, runSimlabValidator, runTrendResearcher } from "./content-squad.ts";

type AgentRunRow = {
  id: string;
  workspace_id: string;
  module_type: string;
  mode: string;
  original_prompt: string;
  status: string;
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

const SUPPORTED_AGENT_IDS = new Set([
  "content_strategist",
  "content_writer",
  "content_designer",
  "simlab_validator",
  "content_qa",
  "trend_researcher",
]);

export const getStatusLabel = (task: AgentTaskRow) => {
  const custom = typeof task.input_payload?.role_label === "string" ? task.input_payload.role_label.trim() : "";
  if (custom) return custom;

  const labels: Record<string, string> = {
    trend_researcher: "Radar de tendencias",
    content_strategist: "Definindo estrategia",
    content_writer: "Escrevendo copy",
    content_designer: "Montando layout HTML",
    simlab_validator: "Validando com SimLab",
    content_qa: "Revisando e montando payload final",
  };
  return labels[task.agent_id] || task.agent_id;
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
    if (!defaultSquad) {
      return { moduleType: null, squadTemplateId: null, workspaceSquadId: null, tasks: [] as Array<Record<string, unknown>> };
    }

    params = {
      ...params,
      workspaceSquadId: defaultSquad.id,
      squadTemplateId: defaultSquad.squad_template_id,
    };
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

  const unsupported = runtimeAgents.find((agent) => !SUPPORTED_AGENT_IDS.has(agent.agent_id));
  if (unsupported) {
    throw new Error(`O agente ${unsupported.agent_id} ainda nao possui handler real de execucao.`);
  }

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

  if (allCompleted && run.module_type === "content_post" && finalPost && qaApproved) {
    await persistContentArtifact(supabase, run, finalPost, qa);
  }

  const qaRejected = run.module_type === "content_post" && allCompleted && finalPost && !qaApproved;

  const payload = {
    status: hasFailure || qaRejected ? "failed" : allCompleted ? "completed" : run.status,
    specialist_results: outputs,
    fragments: tasks.map((task) => ({ agent_id: task.agent_id, status: task.status, task_id: task.id })),
    assembled_prd: typeof qa.summary === "string" ? qa.summary : null,
    qa_score: typeof qa.approved === "boolean" ? (qa.approved ? 92 : 48) : null,
    final_prompt: finalPost?.title || run.original_prompt,
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

      await supabase
        .from("agent_tasks")
        .update({
          status: "completed",
          output_payload: { result, meta },
          is_fallback: false,
          finished_at: new Date().toISOString(),
        })
        .eq("id", nextTask.id);

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
  const specialistResults = toRecord(run.specialist_results);
  return {
    prd_id: run.id,
    status: run.status,
    module_type: run.module_type,
    original_prompt: run.original_prompt,
    assembled_prd: run.assembled_prd,
    final_prompt: run.final_prompt,
    specialist_results: specialistResults,
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
