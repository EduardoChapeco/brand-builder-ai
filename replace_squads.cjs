const fs = require('fs');

const filePath = 'src/pages/SquadsPage.tsx';

try {
    let text = fs.readFileSync(filePath, 'utf-8');

    // Replace the types
    text = text.replace(
        /type Question = \{[\s\S]*?tasks: AgentTaskStatus\[\];\r?\n\};\r?\n/m,
        'import type { Question, RosterAgent, Template, WorkspaceSquad, Catalog, PostData, AgentTaskStatus, AgentStatusPayload } from "@/components/squads/types";\nimport type { StepType } from "@/components/squads/SquadWizardPanel";\nimport SquadWizardPanel from "@/components/squads/SquadWizardPanel";\nimport SquadRuntimePanel from "@/components/squads/SquadRuntimePanel";\nimport SquadConfigurationsPanel from "@/components/squads/SquadConfigurationsPanel";\n'
    );

    // Replace step Type
    // The previous type used in step state was `"goal" | "operations" | "references"`
    // Since we created StepType, let's just make sure it parses properly. The type is inferred or explicitly defined.
    text = text.replace(
        /const \[step, setStep\] = useState<\(typeof steps\)\[number\]\["id"\]>\("goal"\);/,
        'const [step, setStep] = useState<StepType>("goal");'
    );

    // Replace the return block
    const parts = text.split('return (\n    <div className="page-layout">');
    if (parts.length < 2) {
        console.error("Couldn't find return block");
        process.exit(1);
    }

    const renderContent = `return (
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
`;

    const endPartSplit = parts[1].split('export default SquadsPage;');
    
    fs.writeFileSync(filePath, parts[0] + renderContent, 'utf-8');
    console.log("Success");
} catch(e) {
    console.error(e);
}
