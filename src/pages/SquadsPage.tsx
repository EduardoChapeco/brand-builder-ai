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

import type { Question, RosterAgent, Template, WorkspaceSquad, Catalog, PostData, AgentTaskStatus, AgentStatusPayload } from "@/components/squads/types";
import type { StepType } from "@/components/squads/SquadWizardPanel";
import SquadWizardPanel from "@/components/squads/SquadWizardPanel";
import SquadRuntimePanel from "@/components/squads/SquadRuntimePanel";
import SquadConfigurationsPanel from "@/components/squads/SquadConfigurationsPanel";

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
  const [step, setStep] = useState<StepType>("goal");
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

          <SquadWizardPanel
            wizardOpen={wizardOpen}
            setWizardOpen={setWizardOpen}
            resetWizard={resetWizard}
            steps={steps}
            step={step}
            setStep={setStep}
            stepDone={stepDone}
            readyTemplates={readyTemplates}
            selectedTemplateId={selectedTemplateId}
            selectTemplate={selectTemplate}
            selectedTemplate={selectedTemplate}
            name={name}
            setName={setName}
            questionsForStep={questionsForStep}
            renderQuestion={renderQuestion}
            isDefault={isDefault}
            setIsDefault={setIsDefault}
            saving={saving}
            editingId={editingId}
            saveSquad={saveSquad}
          />

          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <SquadRuntimePanel
              catalog={catalog}
              executionSquadId={executionSquadId}
              setExecutionSquadId={setExecutionSquadId}
              selectedExecutionSquad={selectedExecutionSquad}
              selectedExecutionTemplate={selectedExecutionTemplate}
              executionBrief={executionBrief}
              setExecutionBrief={setExecutionBrief}
              launchRun={launchRun}
              launchingRun={launchingRun}
              activeRunId={activeRunId}
              runStatus={runStatus}
              visibleTasks={visibleTasks}
              taskStatusLabel={taskStatusLabel}
              runSummary={runSummary}
              runPost={runPost}
              previewSlide={previewSlide}
              setPreviewSlide={setPreviewSlide}
            />

            <SquadConfigurationsPanel
              catalog={catalog}
              loading={loading}
              setExecutionSquadId={setExecutionSquadId}
              setExecutionBrief={setExecutionBrief}
              makeDefault={makeDefault}
              editSquad={editSquad}
              blueprintCount={blueprintCount}
            />
          </section>
        </div>
      </div>
    </div>
  );
};

export default SquadsPage;
