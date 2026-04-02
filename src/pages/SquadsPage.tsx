import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Loader2,
  Play,
  Rocket,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import AppSectionLabel from "@/components/shared/AppSectionLabel";
import EmptyState from "@/components/shared/EmptyState";
import PageHeader from "@/components/shared/PageHeader";
import SectionCard from "@/components/shared/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";

type Question = {
  id: string;
  step: "goal" | "operations" | "references";
  label: string;
  type: "text" | "textarea" | "select" | "url_list";
  required?: boolean;
  placeholder?: string;
  options?: string[];
};

type RosterAgent = {
  id: string;
  agent_id: string;
  role_label: string;
  seniority: string;
  career_summary: string;
  checkpoint_policy: Record<string, unknown>;
};

type Template = {
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

type WorkspaceSquad = {
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

type Catalog = {
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

type PostData = {
  title: string;
  format: "single" | "carousel";
  slides_html: string[];
  caption: string;
  hashtags: string;
  template: string;
};

type AgentTaskStatus = {
  id: string;
  agent_id: string;
  label: string;
  status: "queued" | "running" | "completed" | "failed";
  task_order: number;
  error_msg?: string | null;
};

type AgentStatusPayload = {
  prd_id: string;
  status: "queued" | "running" | "completed" | "failed";
  module_type: string;
  original_prompt: string;
  assembled_prd?: string | null;
  final_prompt?: string | null;
  specialist_results?: Record<string, unknown> | null;
  tasks: AgentTaskStatus[];
};

const steps = [
  { id: "goal", label: "Direction", icon: Compass },
  { id: "operations", label: "Operation", icon: Rocket },
  { id: "references", label: "Guardrails", icon: ShieldCheck },
] as const;

const taskStatusLabel: Record<AgentTaskStatus["status"], string> = {
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const coercePostData = (value: unknown): PostData | null => {
  const record = toRecord(value);
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const format = record.format === "single" ? "single" : record.format === "carousel" ? "carousel" : null;
  const slidesHtml = Array.isArray(record.slides_html)
    ? record.slides_html.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  const caption = typeof record.caption === "string" ? record.caption : "";
  const hashtags = typeof record.hashtags === "string" ? record.hashtags : "";
  const template = typeof record.template === "string" ? record.template : "";

  if (!title || !format || slidesHtml.length === 0) return null;

  return {
    title,
    format,
    slides_html: slidesHtml,
    caption,
    hashtags,
    template,
  };
};

const SquadsPage = () => {
  const { workspace } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const setup = searchParams.get("setup") === "1";

  const [catalog, setCatalog] = useState<Catalog>({
    agents: [],
    templates: [],
    workspace_squads: [],
  });
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState<(typeof steps)[number]["id"]>("goal");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  const [executionSquadId, setExecutionSquadId] = useState<string | null>(null);
  const [executionBrief, setExecutionBrief] = useState("");
  const [launchingRun, setLaunchingRun] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<AgentStatusPayload["status"] | null>(null);
  const [runTasks, setRunTasks] = useState<AgentTaskStatus[]>([]);
  const [runSummary, setRunSummary] = useState<string | null>(null);
  const [runPost, setRunPost] = useState<PostData | null>(null);
  const [previewSlide, setPreviewSlide] = useState(0);

  const loadCatalog = useCallback(async () => {
    if (!workspace?.id) return;

    setLoading(true);
    const { data, error } = await supabase.functions.invoke("squad-catalog", {
      body: { workspace_id: workspace.id },
    });

    if (error) {
      toast.error("Nao foi possivel carregar o catalogo de squads");
      setLoading(false);
      return;
    }

    setCatalog((data as Catalog) || { agents: [], templates: [], workspace_squads: [] });
    setLoading(false);
  }, [workspace?.id]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (setup) setWizardOpen(true);
  }, [setup]);

  useEffect(() => {
    if (!loading && catalog.workspace_squads.length === 0) {
      setWizardOpen(true);
    }
  }, [catalog.workspace_squads.length, loading]);

  useEffect(() => {
    if (executionSquadId && catalog.workspace_squads.some((item) => item.id === executionSquadId)) {
      return;
    }

    const preferred =
      catalog.workspace_squads.find((item) => item.is_default) ||
      catalog.workspace_squads[0] ||
      null;

    setExecutionSquadId(preferred?.id || null);
  }, [catalog.workspace_squads, executionSquadId]);

  const selectedTemplate = useMemo(
    () => catalog.templates.find((item) => item.id === selectedTemplateId) || null,
    [catalog.templates, selectedTemplateId],
  );

  const readyTemplates = useMemo(
    () => catalog.templates.filter((item) => item.runtime_status === "ready"),
    [catalog.templates],
  );

  const blueprintCount = useMemo(
    () => catalog.templates.filter((item) => item.runtime_status !== "ready").length,
    [catalog.templates],
  );

  const selectedExecutionSquad = useMemo(
    () => catalog.workspace_squads.find((item) => item.id === executionSquadId) || null,
    [catalog.workspace_squads, executionSquadId],
  );

  const selectedExecutionTemplate = useMemo(
    () =>
      selectedExecutionSquad
        ? catalog.templates.find((item) => item.id === selectedExecutionSquad.squad_template_id) || null
        : null,
    [catalog.templates, selectedExecutionSquad],
  );

  const visibleTasks = runTasks.length
    ? runTasks
    : activeRunId
      ? [{
          id: "queued-run",
          agent_id: "orchestrator",
          label: "Preparing run",
          status: "queued" as const,
          task_order: 0,
          error_msg: null,
        }]
      : [];

  const selectTemplate = (template: Template, existing?: WorkspaceSquad) => {
    setSelectedTemplateId(template.id);
    setName(existing?.name || template.name);
    setAnswers({ ...template.default_config, ...(existing?.onboarding_answers || {}) });
    setIsDefault(existing?.is_default ?? catalog.workspace_squads.length === 0);
  };

  const resetWizard = () => {
    setEditingId(null);
    setSelectedTemplateId(null);
    setName("");
    setAnswers({});
    setIsDefault(catalog.workspace_squads.length === 0);
    setStep("goal");
  };

  const questionsForStep = (stepId: (typeof steps)[number]["id"]) =>
    selectedTemplate?.onboarding_questions.filter((item) => item.step === stepId) || [];

  const normalizeValue = (question: Question) => {
    const value = answers[question.id];
    return question.type === "url_list"
      ? Array.isArray(value)
        ? value.join("\n")
        : ""
      : typeof value === "string"
        ? value
        : "";
  };

  const setAnswer = (question: Question, raw: string) => {
    setAnswers((current) => ({
      ...current,
      [question.id]:
        question.type === "url_list"
          ? raw
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean)
          : raw,
    }));
  };

  const stepDone = (stepId: (typeof steps)[number]["id"]) =>
    (stepId !== "goal" || Boolean(selectedTemplate)) &&
    questionsForStep(stepId).every((question) => {
      if (!question.required) return true;
      const value = answers[question.id];
      return question.type === "url_list"
        ? Array.isArray(value) && value.length > 0
        : typeof value === "string" && value.trim().length > 0;
    });

  const renderQuestion = (question: Question) => {
    const value = normalizeValue(question);
    if (question.type === "select") {
      return (
        <select
          value={value}
          onChange={(event) => setAnswer(question, event.target.value)}
          className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-primary)]"
        >
          <option value="">Select...</option>
          {(question.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (question.type === "textarea" || question.type === "url_list") {
      return (
        <Textarea
          value={value}
          onChange={(event) => setAnswer(question, event.target.value)}
          placeholder={question.placeholder}
          className="min-h-[110px] rounded-xl border-[var(--border)] bg-[var(--surface-2)]"
        />
      );
    }

    return (
      <Input
        value={value}
        onChange={(event) => setAnswer(question, event.target.value)}
        placeholder={question.placeholder}
        className="h-11 rounded-xl border-[var(--border)] bg-[var(--surface-2)]"
      />
    );
  };

  const saveSquad = async () => {
    if (!workspace?.id || !selectedTemplate) return;
    if (!name.trim()) {
      toast.error("Define a squad name.");
      return;
    }

    const missing = selectedTemplate.onboarding_questions.find((question) => {
      if (!question.required) return false;
      const value = answers[question.id];
      return question.type === "url_list"
        ? !Array.isArray(value) || value.length === 0
        : typeof value !== "string" || value.trim().length === 0;
    });

    if (missing) {
      toast.error(`Fill "${missing.label}".`);
      return;
    }

    setSaving(true);
    const { error } = await supabase.functions.invoke("squad-upsert", {
      body: {
        workspace_id: workspace.id,
        workspace_squad_id: editingId,
        squad_template_id: selectedTemplate.id,
        name: name.trim(),
        onboarding_answers: answers,
        config: {
          template_slug: selectedTemplate.slug,
          runtime_status: selectedTemplate.runtime_status,
        },
        is_default: isDefault,
        status: "configured",
      },
    });
    setSaving(false);

    if (error) {
      toast.error("Nao foi possivel salvar o squad");
      return;
    }

    toast.success(editingId ? "Squad updated" : "Squad configured");
    await loadCatalog();

    if (setup) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("setup");
      setSearchParams(nextParams);
    }

    setWizardOpen(false);
    resetWizard();
  };

  const editSquad = (squad: WorkspaceSquad) => {
    setEditingId(squad.id);
    const template = catalog.templates.find((item) => item.id === squad.squad_template_id);
    if (template) selectTemplate(template, squad);
    setWizardOpen(true);
  };

  const makeDefault = async (squad: WorkspaceSquad) => {
    const { error } = await supabase.functions.invoke("squad-upsert", {
      body: {
        workspace_id: squad.workspace_id,
        workspace_squad_id: squad.id,
        squad_template_id: squad.squad_template_id,
        name: squad.name,
        onboarding_answers: squad.onboarding_answers,
        config: squad.config,
        is_default: true,
        status: squad.status,
      },
    });

    if (error) {
      toast.error("Nao foi possivel definir o squad padrao");
      return;
    }

    toast.success("Default squad updated");
    await loadCatalog();
  };

  const failRun = (message: string) => {
    setRunStatus("failed");
    setActiveRunId(null);
    setRunTasks([]);
    toast.error(message);
  };

  const launchRun = async () => {
    if (!workspace?.id || !selectedExecutionSquad || !selectedExecutionTemplate) {
      toast.error("Configure at least one squad before running.");
      return;
    }

    if (selectedExecutionTemplate.runtime_status !== "ready") {
      toast.error("This squad is mapped but still has no production runtime.");
      return;
    }

    if (!executionBrief.trim()) {
      toast.error("Describe what this squad should deliver now.");
      return;
    }

    setLaunchingRun(true);
    setRunStatus("queued");
    setRunTasks([]);
    setRunSummary(null);
    setRunPost(null);
    setPreviewSlide(0);

    try {
      const { data, error } = await supabase.functions.invoke("agent-orchestrator", {
        body: {
          workspace_id: workspace.id,
          prompt: executionBrief.trim(),
          module_type: selectedExecutionTemplate.module_type,
          mode: "balanced",
          squad_template_id: selectedExecutionTemplate.id,
          workspace_squad_id: selectedExecutionSquad.id,
          config: {
            surface: "squads_page",
            squad_name: selectedExecutionSquad.name,
          },
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.prd_id) throw new Error("Nao foi possivel iniciar o squad.");

      setActiveRunId(data.prd_id as string);
      toast.success("Squad run created");

      void supabase.functions.invoke("agent-worker", {
        body: { prd_id: data.prd_id },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown launch error";
      failRun(message);
    } finally {
      setLaunchingRun(false);
    }
  };

  useEffect(() => {
    if (!activeRunId) return;

    let cancelled = false;

    const pollStatus = async () => {
      const { data, error } = await supabase.functions.invoke("agent-status", {
        body: { prd_id: activeRunId },
      });

      if (cancelled || error) return;

      const payload = data as AgentStatusPayload | undefined;
      if (!payload) return;

      const orderedTasks = Array.isArray(payload.tasks)
        ? [...payload.tasks].sort((left, right) => left.task_order - right.task_order)
        : [];

      setRunStatus(payload.status);
      setRunTasks(orderedTasks);

      if (payload.status === "completed") {
        const specialistResults = toRecord(payload.specialist_results);
        const qa = toRecord(specialistResults.content_qa);
        const summary = typeof qa.summary === "string" ? qa.summary : payload.assembled_prd || null;
        const finalPost = coercePostData(qa.final_post);

        setRunSummary(summary);
        setRunPost(finalPost);
        setPreviewSlide(0);
        setActiveRunId(null);
        toast.success("Squad completed");
        return;
      }

      if (payload.status === "failed") {
        const failedTask = orderedTasks.find((task) => task.status === "failed");
        failRun(failedTask?.error_msg || "The squad failed during execution.");
      }
    };

    void pollStatus();
    const interval = window.setInterval(() => {
      void pollStatus();
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeRunId]);

  return (
    <div className="page-layout">
      <div className="page-content no-scrollbar">
        <div className="page-inner space-y-6 py-6">
          <PageHeader
            eyebrow="Squads"
            title="Operational squads inside the platform"
            description="The imported skills now live as real platform flows: onboarding, persistent configs, and squad runs without IDE or chat dependency."
            action={
              <Button
                onClick={() => {
                  resetWizard();
                  setWizardOpen(true);
                }}
                className="h-11 rounded-xl px-5"
              >
                <Sparkles size={16} />
                New squad
              </Button>
            }
          />

          {wizardOpen ? (
            <SectionCard className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <AppSectionLabel>Operational onboarding</AppSectionLabel>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                    Configure the squad in steps
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setWizardOpen(false);
                    resetWizard();
                  }}
                >
                  Close
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {steps.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setStep(item.id)}
                      className="rounded-2xl border p-4 text-left"
                      style={{
                        borderColor: step === item.id ? "var(--workspace-brand)" : "var(--border)",
                        background: step === item.id ? "var(--workspace-brand-soft)" : "var(--surface-2)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-card)]">
                          <Icon size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{item.label}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {stepDone(item.id) ? "Completed" : "Pending"}
                          </p>
                        </div>
                        {stepDone(item.id) ? <Check className="ml-auto h-4 w-4 text-emerald-600" /> : null}
                      </div>
                    </button>
                  );
                })}
              </div>

              {step === "goal" ? (
                <div className="space-y-5">
                  <div className="grid gap-4 xl:grid-cols-2">
                    {readyTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => selectTemplate(template)}
                        className="rounded-2xl border p-5 text-left"
                        style={{
                          borderColor: selectedTemplateId === template.id ? "var(--workspace-brand)" : "var(--border)",
                          background:
                            selectedTemplateId === template.id ? "var(--workspace-brand-soft)" : "var(--surface-2)",
                        }}
                      >
                        <div className="flex flex-wrap gap-2">
                          <Badge>{template.runtime_status}</Badge>
                          <Badge variant="outline">{template.module_type}</Badge>
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{template.name}</h3>
                        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{template.description}</p>
                        <p className="mt-3 text-xs text-[var(--text-muted)]">{template.agent_count} connected agents</p>
                      </button>
                    ))}
                  </div>

                  {selectedTemplate ? (
                    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                      <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            Squad name
                          </label>
                          <Input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder={selectedTemplate.name}
                            className="mt-2 h-11 rounded-xl border-[var(--border)] bg-[var(--surface-card)]"
                          />
                        </div>

                        {questionsForStep("goal").map((question) => (
                          <div key={question.id}>
                            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                              {question.label}
                            </label>
                            <div className="mt-2">{renderQuestion(question)}</div>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                        <AppSectionLabel>Selected roster</AppSectionLabel>
                        <div className="mt-3 space-y-3">
                          {selectedTemplate.agents.map((agent) => (
                            <div
                              key={agent.id}
                              className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4"
                            >
                              <div className="flex items-center gap-2">
                                <Bot size={15} />
                                <p className="text-sm font-semibold text-[var(--text-primary)]">{agent.role_label}</p>
                                <Badge variant="outline" className="ml-auto">
                                  {agent.seniority}
                                </Badge>
                              </div>
                              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                                {agent.career_summary}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {step === "operations" && selectedTemplate ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {questionsForStep("operations").map((question) => (
                    <div
                      key={question.id}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5"
                    >
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        {question.label}
                      </label>
                      <div className="mt-2">{renderQuestion(question)}</div>
                    </div>
                  ))}
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                    <label className="flex items-center gap-3 text-sm text-[var(--text-primary)]">
                      <input
                        type="checkbox"
                        checked={isDefault}
                        onChange={(event) => setIsDefault(event.target.checked)}
                        className="h-4 w-4"
                      />
                      Set as the default squad for this workspace
                    </label>
                  </div>
                </div>
              ) : null}

              {step === "references" && selectedTemplate ? (
                <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="space-y-4">
                    {questionsForStep("references").map((question) => (
                      <div
                        key={question.id}
                        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5"
                      >
                        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                          {question.label}
                        </label>
                        <div className="mt-2">{renderQuestion(question)}</div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                    <div>
                      <AppSectionLabel>Mapped sources</AppSectionLabel>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedTemplate.source_refs.map((source) => (
                          <a
                            key={source.url}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-[var(--border)] bg-[var(--surface-card)] px-3 py-1.5 text-xs text-[var(--text-primary)]"
                          >
                            {source.label}
                          </a>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      {selectedTemplate.agents.map((agent) => (
                        <div
                          key={agent.agent_id}
                          className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4"
                        >
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{agent.role_label}</p>
                          <p className="mt-1 text-sm text-[var(--text-secondary)]">{agent.career_summary}</p>
                          <p className="mt-2 text-xs text-[var(--text-muted)]">
                            Checkpoint:{" "}
                            {typeof agent.checkpoint_policy?.label === "string"
                              ? agent.checkpoint_policy.label
                              : "not explicitly modeled"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-between border-t border-[var(--border)] pt-5">
                <Button
                  variant="ghost"
                  onClick={() => {
                    const index = steps.findIndex((item) => item.id === step);
                    if (index > 0) setStep(steps[index - 1].id);
                  }}
                  disabled={steps.findIndex((item) => item.id === step) === 0}
                >
                  Back
                </Button>

                {step !== "references" ? (
                  <Button
                    onClick={() => {
                      const index = steps.findIndex((item) => item.id === step);
                      if (!stepDone(step)) {
                        toast.error("Fill the required fields in this step.");
                        return;
                      }
                      if (index < steps.length - 1) setStep(steps[index + 1].id);
                    }}
                  >
                    Next
                    <ArrowRight size={14} />
                  </Button>
                ) : (
                  <Button onClick={() => void saveSquad()} disabled={saving}>
                    {saving ? "Saving..." : editingId ? "Update squad" : "Save squad"}
                  </Button>
                )}
              </div>
            </SectionCard>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <SectionCard className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <AppSectionLabel>Runtime execution</AppSectionLabel>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                    Run a configured squad
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    This page now launches the real squad runtime, polls persisted tasks, and shows the final artifact
                    returned by QA.
                  </p>
                </div>
                {selectedExecutionSquad?.template ? (
                  <div className="flex flex-wrap gap-2">
                    <Badge>{selectedExecutionSquad.template.runtime_status}</Badge>
                    <Badge variant="outline">{selectedExecutionSquad.template.module_type}</Badge>
                  </div>
                ) : null}
              </div>

              {catalog.workspace_squads.length === 0 ? (
                <EmptyState
                  title="No operational squad yet"
                  description="Finish the onboarding above to configure the first real squad for this workspace."
                  icon={Sparkles}
                />
              ) : (
                <div className="space-y-5">
                  <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Active squad
                      </label>
                      <select
                        value={executionSquadId || ""}
                        onChange={(event) => setExecutionSquadId(event.target.value || null)}
                        className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-card)] px-3 text-sm text-[var(--text-primary)]"
                      >
                        {catalog.workspace_squads.map((squad) => (
                          <option key={squad.id} value={squad.id}>
                            {squad.name}
                          </option>
                        ))}
                      </select>

                      {selectedExecutionSquad ? (
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedExecutionSquad.name}</p>
                            {selectedExecutionSquad.is_default ? <Badge>Default</Badge> : null}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                            {selectedExecutionSquad.goal || "No goal described yet."}
                          </p>
                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                Channel
                              </p>
                              <p className="mt-2 text-sm text-[var(--text-primary)]">{selectedExecutionSquad.channel || "-"}</p>
                            </div>
                            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                Cadence
                              </p>
                              <p className="mt-2 text-sm text-[var(--text-primary)]">{selectedExecutionSquad.cadence || "-"}</p>
                            </div>
                            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                Approval
                              </p>
                              <p className="mt-2 text-sm text-[var(--text-primary)]">{selectedExecutionSquad.approval_mode || "-"}</p>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Execution brief
                      </label>
                      <Textarea
                        value={executionBrief}
                        onChange={(event) => setExecutionBrief(event.target.value)}
                        placeholder="Describe the deliverable, context, timing, and exact business outcome this squad should produce now."
                        className="min-h-[180px] rounded-xl border-[var(--border)] bg-[var(--surface-card)]"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-[var(--text-muted)]">
                          The run creates real rows in `agent_prds`, `agent_tasks`, and persists the final post in
                          `posts_v2` when QA approves it.
                        </p>
                        <Button
                          onClick={() => void launchRun()}
                          disabled={
                            launchingRun ||
                            Boolean(activeRunId) ||
                            !selectedExecutionTemplate ||
                            selectedExecutionTemplate.runtime_status !== "ready"
                          }
                          className="h-11 rounded-xl px-5"
                        >
                          {launchingRun ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                          {launchingRun ? "Launching..." : "Run squad"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                    <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <AppSectionLabel>Current run</AppSectionLabel>
                          <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Execution telemetry</h3>
                        </div>
                        {runStatus ? <Badge variant="outline">{runStatus}</Badge> : null}
                      </div>

                      {visibleTasks.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--text-muted)]">
                          Start a run to watch persisted tasks move across the squad chain.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {visibleTasks.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4"
                            >
                              {task.status === "completed" ? (
                                <span className="text-emerald-600">OK</span>
                              ) : task.status === "running" ? (
                                <Loader2 className="h-4 w-4 animate-spin text-[var(--workspace-brand)]" />
                              ) : task.status === "failed" ? (
                                <span className="text-rose-600">ERR</span>
                              ) : (
                                <span className="inline-block h-2 w-2 rounded-full bg-[var(--text-muted)]" />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-[var(--text-primary)]">{task.label}</p>
                                <p className="text-xs text-[var(--text-muted)]">{taskStatusLabel[task.status]}</p>
                                {task.error_msg ? <p className="mt-2 text-xs text-rose-600">{task.error_msg}</p> : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {runSummary ? (
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            QA summary
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{runSummary}</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <AppSectionLabel>Final artifact</AppSectionLabel>
                          <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Post preview</h3>
                        </div>
                        {runPost ? <Badge variant="outline">{previewSlide + 1} / {runPost.slides_html.length}</Badge> : null}
                      </div>

                      {!runPost ? (
                        <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--text-muted)]">
                          The final artifact appears here only when the real QA step returns a valid payload.
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[var(--text-primary)]">{runPost.title}</p>
                              <p className="text-xs text-[var(--text-muted)]">
                                {runPost.format === "carousel" ? "Carousel" : "Single"} · {runPost.template}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setPreviewSlide((current) => Math.max(0, current - 1))}
                                disabled={previewSlide === 0}
                              >
                                <ChevronLeft size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  setPreviewSlide((current) => Math.min(runPost.slides_html.length - 1, current + 1))
                                }
                                disabled={previewSlide === runPost.slides_html.length - 1}
                              >
                                <ChevronRight size={16} />
                              </Button>
                            </div>
                          </div>

                          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-card)]">
                            <div className="mx-auto" style={{ width: 352, height: 352, overflow: "hidden" }}>
                              <div
                                style={{
                                  width: 540,
                                  height: 540,
                                  transform: `scale(${352 / 540})`,
                                  transformOrigin: "top left",
                                }}
                              >
                                <div dangerouslySetInnerHTML={{ __html: runPost.slides_html[previewSlide] }} />
                              </div>
                            </div>
                          </div>

                          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                              Caption
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                              {runPost.caption}
                            </p>
                            {runPost.hashtags ? <p className="mt-3 text-xs text-[var(--text-muted)]">{runPost.hashtags}</p> : null}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </SectionCard>

            <div className="space-y-6">
              <SectionCard className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <AppSectionLabel>Workspace squads</AppSectionLabel>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                      Active configurations
                    </h2>
                  </div>
                  <Badge variant="outline">{catalog.workspace_squads.length} configured</Badge>
                </div>

                {loading ? (
                  <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-sm text-[var(--text-muted)]">
                    Loading squads...
                  </div>
                ) : catalog.workspace_squads.length === 0 ? (
                  <EmptyState
                    title="No configured squad"
                    description="Use the onboarding above to create the first operational squad for this workspace."
                    icon={Sparkles}
                  />
                ) : (
                  <div className="space-y-3">
                    {catalog.workspace_squads.map((squad) => (
                      <div key={squad.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-semibold text-[var(--text-primary)]">{squad.name}</h3>
                              {squad.is_default ? <Badge>Default</Badge> : null}
                              <Badge variant="outline">{squad.template?.runtime_status || squad.status}</Badge>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                              {squad.goal || "No operational goal described."}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {squad.template?.runtime_status === "ready" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setExecutionSquadId(squad.id);
                                  setExecutionBrief("");
                                }}
                              >
                                Run here
                              </Button>
                            ) : null}
                            {!squad.is_default ? (
                              <Button variant="outline" size="sm" onClick={() => void makeDefault(squad)}>
                                Set default
                              </Button>
                            ) : null}
                            <Button size="sm" onClick={() => editSquad(squad)}>
                              Edit
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard className="space-y-4">
                <div>
                  <AppSectionLabel>Imported catalog</AppSectionLabel>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                    Specialized agents
                  </h2>
                </div>

                <div className="space-y-2">
                  {catalog.agents.map((agent) => (
                    <div key={agent.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                      <div className="flex items-center gap-2">
                        <Bot size={15} />
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{agent.label}</p>
                        <Badge variant="outline" className="ml-auto">
                          {agent.seniority}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{agent.career_summary}</p>
                    </div>
                  ))}
                </div>

                {blueprintCount > 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-5 text-sm text-[var(--text-secondary)]">
                    {blueprintCount} additional templates are mapped from external repositories, but remain non-runnable
                    until a real production handler exists.
                  </div>
                ) : null}
              </SectionCard>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SquadsPage;
