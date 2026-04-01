import { getContentTaskPlan } from "./agent-registry.ts";
import {
  BrandContext,
  JsonTaskMeta,
  createServiceClient,
  getBrandContext,
} from "./postgen.ts";
import {
  FinalPostOutput,
  runContentDesigner,
  runContentQa,
  runContentStrategist,
  runContentWriter,
} from "./content-squad.ts";

type AgentRunRow = {
  id: string;
  workspace_id: string;
  module_type: string;
  mode: string;
  original_prompt: string;
  status: string;
  specialist_results?: Record<string, unknown> | null;
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
};

export const getStatusLabel = (agentId: string) => {
  const labels: Record<string, string> = {
    content_strategist: "Definindo estrategia",
    content_writer: "Escrevendo copy",
    content_designer: "Montando layout HTML",
    content_qa: "Revisando e montando payload final",
  };
  return labels[agentId] || agentId;
};

export const createAgentRun = async (
  supabase: ReturnType<typeof createServiceClient>,
  params: {
    workspaceId: string;
    moduleType: string;
    prompt: string;
    mode?: string;
    identification?: Record<string, unknown>;
    config?: Record<string, unknown>;
  },
) => {
  const { data: prd, error } = await supabase
    .from("agent_prds")
    .insert({
      workspace_id: params.workspaceId,
      module_type: params.moduleType,
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
    })
    .select("*")
    .single();

  if (error || !prd) throw error || new Error("Nao foi possivel criar agent_prd.");

  if (params.moduleType === "content_post") {
    const plan = getContentTaskPlan(params.prompt, params.config);
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
  }

  return prd;
};

const toRecord = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

const loadRunWithTasks = async (
  supabase: ReturnType<typeof createServiceClient>,
  prdId: string,
) => {
  const [{ data: run, error: runError }, { data: tasks, error: taskError }] = await Promise.all([
    supabase.from("agent_prds").select("*").eq("id", prdId).single(),
    supabase.from("agent_tasks").select("*").eq("prd_id", prdId).order("task_order"),
  ]);

  if (runError || !run) throw runError || new Error("Run nao encontrado.");
  if (taskError) throw taskError;

  return {
    run: run as AgentRunRow,
    tasks: (tasks || []) as AgentTaskRow[],
  };
};

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
  params: {
    workspaceId: string;
    prdId: string;
    agentId: string;
    meta: JsonTaskMeta;
    durationMs: number;
    success: boolean;
    errorMessage?: string | null;
  },
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

const runTaskHandler = async (
  task: AgentTaskRow,
  run: AgentRunRow,
  brandContext: BrandContext,
  previousOutputs: Record<string, unknown>,
) => {
  const context = {
    supabase: createServiceClient(),
    workspaceId: run.workspace_id,
    prompt: run.original_prompt,
    brandContext,
    previousOutputs,
  };

  if (task.agent_id === "content_strategist") return runContentStrategist(context);
  if (task.agent_id === "content_writer") return runContentWriter(context);
  if (task.agent_id === "content_designer") return runContentDesigner(context);
  if (task.agent_id === "content_qa") return runContentQa(context);

  throw new Error(`Agent handler nao implementado para ${task.agent_id}.`);
};

const finalizeRun = async (
  supabase: ReturnType<typeof createServiceClient>,
  run: AgentRunRow,
  tasks: AgentTaskRow[],
) => {
  const outputs = getCompletedOutputs(tasks);
  const qa = toRecord(outputs.content_qa);
  const finalPost = toRecord(qa.final_post) as unknown as FinalPostOutput;
  const hasFailure = tasks.some((task) => task.status === "failed");
  const allCompleted = tasks.length > 0 && tasks.every((task) => task.status === "completed");

  const payload = {
    status: hasFailure ? "failed" : allCompleted ? "completed" : run.status,
    specialist_results: outputs,
    fragments: tasks.map((task) => ({
      agent_id: task.agent_id,
      status: task.status,
      task_id: task.id,
    })),
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
  const brandContext = await getBrandContext(supabase, run.workspace_id);

  if (run.status === "queued") {
    await supabase.from("agent_prds").update({ status: "running" }).eq("id", run.id);
  }

  let currentTasks = tasks;
  while (true) {
    const nextTask = findNextReadyTask(currentTasks);
    if (!nextTask) break;

    await supabase
      .from("agent_tasks")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
        attempt_count: (nextTask.attempt_count || 0) + 1,
        error_msg: null,
      })
      .eq("id", nextTask.id)
      .eq("status", "queued");

    const startedAt = Date.now();

    try {
      const previousOutputs = getCompletedOutputs(currentTasks);
      const { result, meta } = await runTaskHandler(nextTask, run, brandContext, previousOutputs);

      await supabase
        .from("agent_tasks")
        .update({
          status: "completed",
          output_payload: {
            result,
            meta,
          },
          is_fallback: meta.isFallback,
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
        meta: {
          provider: null,
          model: null,
          isFallback: false,
          attempts: [],
        },
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

  return {
    run: updatedRun,
    tasks: refreshed.tasks,
  };
};

export const processQueuedRuns = async (
  supabase: ReturnType<typeof createServiceClient>,
  limit = 3,
) => {
  const { data, error } = await supabase
    .from("agent_prds")
    .select("id")
    .in("status", ["queued", "running"])
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
      label: getStatusLabel(task.agent_id),
      status: task.status,
      task_order: task.task_order,
      is_fallback: task.is_fallback,
      error_msg: task.error_msg,
      started_at: task.started_at || null,
      finished_at: task.finished_at || null,
    })),
  };
};
