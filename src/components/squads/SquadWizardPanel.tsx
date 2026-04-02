import { ArrowRight, Bot, Check, Sparkles } from "lucide-react";
import AppSectionLabel from "@/components/shared/AppSectionLabel";
import SectionCard from "@/components/shared/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { Question, Template, WorkspaceSquad } from "./types";

export type StepType = "goal" | "operations" | "references";

export type WizardStep = {
  id: StepType;
  label: string;
  icon: any;
};

type SquadWizardPanelProps = {
  wizardOpen: boolean;
  setWizardOpen: (open: boolean) => void;
  resetWizard: () => void;
  steps: ReadonlyArray<WizardStep>;
  step: StepType;
  setStep: (step: StepType) => void;
  stepDone: (stepId: StepType) => boolean;
  readyTemplates: Template[];
  selectedTemplateId: string | null;
  selectTemplate: (template: Template) => void;
  selectedTemplate: Template | null;
  name: string;
  setName: (name: string) => void;
  questionsForStep: (stepId: StepType) => Question[];
  renderQuestion: (question: Question) => React.ReactNode;
  isDefault: boolean;
  setIsDefault: (val: boolean) => void;
  saving: boolean;
  editingId: string | null;
  saveSquad: () => Promise<void>;
};

export default function SquadWizardPanel({
  wizardOpen, setWizardOpen, resetWizard, steps, step, setStep, stepDone,
  readyTemplates, selectedTemplateId, selectTemplate, selectedTemplate,
  name, setName, questionsForStep, renderQuestion, isDefault, setIsDefault,
  saving, editingId, saveSquad
}: SquadWizardPanelProps) {
  if (!wizardOpen) return null;

  return (
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
  );
}
