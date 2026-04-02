import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createServiceClient, safeJsonResponse } from "../_shared/postgen.ts";

const toArray = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

const byString = (value: unknown) => typeof value === "string" ? value : null;

const normalizeSourceRefs = (value: unknown) =>
  toArray<Record<string, unknown>>(value)
    .map((item) => ({
      label: byString(item.label) || "Fonte",
      url: byString(item.url) || "#",
    }))
    .filter((item) => item.url && item.url !== "#");

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id } = await req.json().catch(() => ({ workspace_id: null })) as {
      workspace_id?: string | null;
    };

    const supabase = createServiceClient();

    const [{ data: agents, error: agentsError }, { data: templates, error: templatesError }, { data: templateAgents, error: templateAgentsError }, workspaceSquadsResult] = await Promise.all([
      supabase
        .from("agent_registry")
        .select("id,label,role,module_types,capabilities,is_active,category,ui_group,seniority,career_summary,deliverables,source_refs,module_metadata")
        .eq("is_active", true)
        .order("ui_group")
        .order("label"),
      supabase
        .from("squad_templates")
        .select("*")
        .eq("is_active", true)
        .order("runtime_status")
        .order("name"),
      supabase
        .from("squad_template_agents")
        .select("*")
        .order("task_order"),
      workspace_id
        ? supabase
            .from("workspace_squads")
            .select("*")
            .eq("workspace_id", workspace_id)
            .order("is_default", { ascending: false })
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (agentsError) throw agentsError;
    if (templatesError) throw templatesError;
    if (templateAgentsError) throw templateAgentsError;
    if (workspaceSquadsResult.error) throw workspaceSquadsResult.error;

    const agentMap = new Map(
      (agents || []).map((agent) => [
        agent.id,
        {
          id: agent.id,
          label: agent.label,
          role: agent.role,
          modules: toArray<string>(agent.module_types),
          capabilities: toArray<string>(agent.capabilities),
          category: byString(agent.category) || "general",
          ui_group: byString(agent.ui_group) || "general",
          seniority: byString(agent.seniority) || "specialist",
          career_summary: byString(agent.career_summary) || "",
          deliverables: toArray<string>(agent.deliverables),
          source_refs: normalizeSourceRefs(agent.source_refs),
          runtime_status: byString((agent.module_metadata as Record<string, unknown> | null)?.runtime_status) || "ready",
        },
      ]),
    );

    const templateRows = (templates || []).map((template) => {
      const templateRoster = (templateAgents || [])
        .filter((item) => item.squad_template_id === template.id)
        .sort((left, right) => left.task_order - right.task_order)
        .map((item) => {
          const agent = agentMap.get(item.agent_id);
          return {
            id: item.id,
            agent_id: item.agent_id,
            label: agent?.label || item.agent_id,
            role: agent?.role || "specialist",
            seniority: agent?.seniority || "specialist",
            career_summary: agent?.career_summary || "",
            role_label: byString(item.role_label) || agent?.label || item.agent_id,
            task_order: item.task_order,
            step_kind: byString(item.step_kind) || "task",
            checkpoint_policy: item.checkpoint_policy || {},
            source_refs: agent?.source_refs || [],
          };
        });

      return {
        id: template.id,
        slug: template.slug,
        name: template.name,
        description: template.description,
        category: template.category,
        module_type: template.module_type,
        runtime_status: template.runtime_status,
        onboarding_questions: toArray<Record<string, unknown>>(template.onboarding_questions),
        default_config: (template.default_config as Record<string, unknown> | null) || {},
        source_refs: normalizeSourceRefs(template.source_refs),
        agents: templateRoster,
        agent_count: templateRoster.length,
      };
    });

    const workspaceSquads = (workspaceSquadsResult.data || []).map((squad) => {
      const template = templateRows.find((item) => item.id === squad.squad_template_id);
      return {
        id: squad.id,
        workspace_id: squad.workspace_id,
        squad_template_id: squad.squad_template_id,
        slug: squad.slug,
        name: squad.name,
        status: squad.status,
        goal: squad.goal,
        primary_outcome: squad.primary_outcome,
        channel: squad.channel,
        cadence: squad.cadence,
        approval_mode: squad.approval_mode,
        benchmark_urls: toArray<string>(squad.benchmark_urls),
        onboarding_answers: (squad.onboarding_answers as Record<string, unknown> | null) || {},
        config: (squad.config as Record<string, unknown> | null) || {},
        is_default: Boolean(squad.is_default),
        template: template
          ? {
              id: template.id,
              slug: template.slug,
              name: template.name,
              module_type: template.module_type,
              runtime_status: template.runtime_status,
              agent_count: template.agent_count,
            }
          : null,
      };
    });

    return safeJsonResponse({
      agents: Array.from(agentMap.values()),
      templates: templateRows,
      workspace_squads: workspaceSquads,
    });
  } catch (error) {
    return safeJsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
