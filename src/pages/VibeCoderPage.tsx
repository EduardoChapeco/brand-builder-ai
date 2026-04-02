import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  SandpackCodeEditor,
  SandpackFileExplorer,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react";
import JSZip from "jszip";
import {
  CheckCircle2,
  Download,
  FileCode2,
  FileSearch,
  LayoutTemplate,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import AppSectionLabel from "@/components/shared/AppSectionLabel";
import EmptyState from "@/components/shared/EmptyState";
import PageHeader from "@/components/shared/PageHeader";
import SectionCard from "@/components/shared/SectionCard";
import SubtleBadge from "@/components/shared/SubtleBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { fromTable } from "@/integrations/supabase/db-custom";
import { supabase } from "@/integrations/supabase/client";
import {
  type AgentArtifactRecord,
  getLatestArtifact,
  readWebsitePlan,
  readWebsiteQaReport,
  readWebsiteSpec,
  readWebsiteTaskGraph,
} from "@/lib/siteSquad";

type Project = {
  id: string;
  workspace_id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  source_files_json?: Record<string, string> | null;
  website_id?: string | null;
  build_target?: string | null;
  updated_at?: string | null;
};

type Website = {
  id: string;
  name: string;
  domain?: string | null;
  status?: string | null;
};

type Conversation = {
  id: string;
  project_id?: string | null;
  website_id?: string | null;
  workspace_id: string;
  mode?: string | null;
  user_message?: string | null;
  assistant_response?: string | null;
  diff_summary?: string | null;
  created_at?: string | null;
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
  artifacts?: AgentArtifactRecord[];
  tasks: AgentTaskStatus[];
};

const WEBSITE_BUILD_TARGET = "project_vfs";

const WEBSITE_PROJECT_STARTER_FILES: Record<string, string> = {
  "/src/App.tsx": `export default function App() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8fafc", color: "#09090b", fontFamily: "Inter, system-ui, sans-serif" }}>
      <section style={{ maxWidth: 720, padding: 32 }}>
        <p style={{ color: "#52525b", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 12 }}>Site squad</p>
        <h1 style={{ fontSize: 48, lineHeight: 1.05, margin: "12px 0 16px" }}>Aprove a spec para gerar o site.</h1>
        <p style={{ fontSize: 18, lineHeight: 1.7, color: "#52525b" }}>
          O fluxo agora cria uma spec antes de qualquer build multi-arquivo.
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

const adaptFilesForSandpack = (files: Record<string, string>) => {
  const next: Record<string, string> = {};

  for (const [path, content] of Object.entries(files)) {
    if (path.startsWith("/src/")) {
      next[path.replace("/src", "")] = content;
    } else {
      next[path] = content;
    }
  }

  if (!next["/App.tsx"] && files["/src/App.tsx"]) next["/App.tsx"] = files["/src/App.tsx"];
  if (!next["/index.tsx"] && files["/src/index.tsx"]) next["/index.tsx"] = files["/src/index.tsx"];
  return next;
};

const downloadFile = (filename: string, content: string, type = "text/plain;charset=utf-8") => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const buildProjectSummary = (files: Record<string, string>) => {
  const entries = Object.entries(files);
  return {
    fileCount: entries.length,
    totalChars: entries.reduce((sum, [, content]) => sum + content.length, 0),
  };
};

const VibeCoderPage = () => {
  const location = useLocation();
  const { workspace } = useWorkspace();
  const routeState = (location.state as { projectId?: string; websiteId?: string; websiteName?: string } | null) || null;

  const [projects, setProjects] = useState<Project[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(routeState?.projectId || null);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string | null>(routeState?.websiteId || null);
  const [sourceFiles, setSourceFiles] = useState<Record<string, string>>(WEBSITE_PROJECT_STARTER_FILES);
  const [prompt, setPrompt] = useState("");
  const [projectName, setProjectName] = useState(routeState?.websiteName || "Novo Projeto");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [approving, setApproving] = useState(false);
  const [exportingHtml, setExportingHtml] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeRunPayload, setActiveRunPayload] = useState<AgentStatusPayload | null>(null);
  const [lastSpecPayload, setLastSpecPayload] = useState<AgentStatusPayload | null>(null);
  const [lastBuildPayload, setLastBuildPayload] = useState<AgentStatusPayload | null>(null);
  const handledRunStates = useRef<Set<string>>(new Set());

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId],
  );

  const selectedWebsite = useMemo(
    () => websites.find((website) => website.id === selectedWebsiteId) || null,
    [selectedWebsiteId, websites],
  );

  const summary = useMemo(() => buildProjectSummary(sourceFiles), [sourceFiles]);

  const artifacts = useMemo(
    () => [
      ...(lastSpecPayload?.artifacts || []),
      ...(lastBuildPayload?.artifacts || []),
      ...(activeRunPayload?.artifacts || []),
    ],
    [activeRunPayload?.artifacts, lastBuildPayload?.artifacts, lastSpecPayload?.artifacts],
  );

  const latestSpecArtifact = useMemo(() => getLatestArtifact(artifacts, "spec"), [artifacts]);
  const latestPlanArtifact = useMemo(() => getLatestArtifact(artifacts, "plan"), [artifacts]);
  const latestTaskGraphArtifact = useMemo(() => getLatestArtifact(artifacts, "task_graph"), [artifacts]);
  const latestQaArtifact = useMemo(() => getLatestArtifact(artifacts, "qa_report"), [artifacts]);

  const spec = useMemo(() => readWebsiteSpec(latestSpecArtifact), [latestSpecArtifact]);
  const plan = useMemo(() => readWebsitePlan(latestPlanArtifact), [latestPlanArtifact]);
  const taskGraph = useMemo(() => readWebsiteTaskGraph(latestTaskGraphArtifact), [latestTaskGraphArtifact]);
  const qaReport = useMemo(() => readWebsiteQaReport(latestQaArtifact), [latestQaArtifact]);

  const loadWebsites = useCallback(async () => {
    if (!workspace?.id) return;

    const { data, error } = await fromTable("websites")
      .select("id,name,domain,status")
      .eq("workspace_id", workspace.id)
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Nao foi possivel carregar os sites");
      return;
    }

    setWebsites((data || []) as Website[]);
  }, [workspace?.id]);

  const loadProjects = useCallback(async () => {
    if (!workspace?.id) return;

    const { data, error } = await fromTable("projects")
      .select("id,workspace_id,name,description,status,source_files_json,website_id,build_target,updated_at")
      .eq("workspace_id", workspace.id)
      .order("updated_at", { ascending: false })
      .limit(40);

    if (error) {
      toast.error("Nao foi possivel carregar os projetos");
      return;
    }

    const rows = (data || []) as Project[];
    setProjects(rows);

    const routedProjectId = routeState?.projectId;
    const websiteMatchedProject = selectedWebsiteId
      ? rows.find((project) => project.website_id === selectedWebsiteId)
      : null;
    const nextSelected =
      (routedProjectId && rows.some((row) => row.id === routedProjectId) ? routedProjectId : null) ||
      (selectedProjectId && rows.some((row) => row.id === selectedProjectId) ? selectedProjectId : null) ||
      websiteMatchedProject?.id ||
      rows[0]?.id ||
      null;

    setSelectedProjectId(nextSelected);
    const current = rows.find((row) => row.id === nextSelected);
    if (current?.source_files_json && typeof current.source_files_json === "object") {
      setSourceFiles(current.source_files_json);
      setProjectName(current.name);
    } else if (!current) {
      setSourceFiles(WEBSITE_PROJECT_STARTER_FILES);
    }
  }, [routeState?.projectId, selectedProjectId, selectedWebsiteId, workspace?.id]);

  const loadSingleProject = useCallback(async (projectId: string) => {
    const { data, error } = await fromTable("projects")
      .select("id,workspace_id,name,description,status,source_files_json,website_id,build_target,updated_at")
      .eq("id", projectId)
      .maybeSingle();

    if (error || !data) return;

    const project = data as Project;
    setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)]);
    setSelectedProjectId(project.id);
    setProjectName(project.name);
    if (project.source_files_json && typeof project.source_files_json === "object") {
      setSourceFiles(project.source_files_json);
    }
  }, []);

  const loadConversations = useCallback(async (projectId?: string | null, websiteId?: string | null) => {
    if (!workspace?.id) return;

    let query = fromTable("platform_conversations")
      .select("id,project_id,website_id,workspace_id,mode,user_message,assistant_response,diff_summary,created_at")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(24);

    if (projectId) {
      query = query.eq("project_id", projectId);
    } else if (websiteId) {
      query = query.eq("website_id", websiteId);
    } else {
      setConversations([]);
      return;
    }

    const { data } = await query;
    setConversations((data || []) as Conversation[]);
  }, [workspace?.id]);

  useEffect(() => {
    void loadWebsites();
  }, [loadWebsites]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    void loadConversations(selectedProjectId, selectedWebsiteId);
  }, [loadConversations, selectedProjectId, selectedWebsiteId]);

  const saveConversation = useCallback(async (payload: {
    mode: string;
    user_message?: string | null;
    assistant_response?: string | null;
    diff_summary?: string | null;
    agent_prd_id?: string | null;
  }) => {
    if (!workspace?.id) return;

    await fromTable("platform_conversations").insert({
      workspace_id: workspace.id,
      project_id: selectedProjectId,
      website_id: selectedWebsiteId,
      build_target: WEBSITE_BUILD_TARGET,
      agent_prd_id: payload.agent_prd_id || null,
      mode: payload.mode,
      user_message: payload.user_message || null,
      assistant_response: payload.assistant_response || null,
      diff_summary: payload.diff_summary || null,
    });
  }, [selectedProjectId, selectedWebsiteId, workspace?.id]);

  const createProject = useCallback(async (nameOverride?: string) => {
    if (!workspace?.id) return null;

    setCreating(true);
    try {
      const payload = {
        workspace_id: workspace.id,
        website_id: selectedWebsiteId,
        build_target: WEBSITE_BUILD_TARGET,
        name: (nameOverride || projectName).trim() || "Novo Projeto",
        description: selectedWebsiteId ? "Projeto vinculado ao site do builder visual" : "Projeto criado via site squad",
        status: "draft",
        entry_file: "/src/App.tsx",
        source_files_json: WEBSITE_PROJECT_STARTER_FILES,
        preview_meta: {
          last_summary: "Projeto inicial criado para o fluxo spec-driven.",
        },
      };

      const { data, error } = await fromTable("projects").insert(payload).select("*").single();
      if (error || !data) throw error || new Error("Nao foi possivel criar o projeto.");

      const project = data as Project;
      setSelectedProjectId(project.id);
      setProjectName(project.name);
      setSourceFiles(WEBSITE_PROJECT_STARTER_FILES);
      await loadProjects();
      return project.id;
    } catch {
      toast.error("Nao foi possivel criar o projeto");
      return null;
    } finally {
      setCreating(false);
    }
  }, [loadProjects, projectName, selectedWebsiteId, workspace?.id]);

  const ensureProjectReady = useCallback(async () => {
    if (selectedProjectId) return selectedProjectId;
    return await createProject(selectedWebsite?.name || routeState?.websiteName || projectName);
  }, [createProject, projectName, routeState?.websiteName, selectedProjectId, selectedWebsite?.name]);

  const sendPrompt = async () => {
    if (!workspace?.id || !prompt.trim()) {
      toast.error("Descreva o site que voce quer construir");
      return;
    }

    const ensuredProjectId = await ensureProjectReady();
    if (!ensuredProjectId) {
      toast.error("Nao foi possivel preparar o projeto para a spec");
      return;
    }

    setSending(true);
    try {
      await saveConversation({ mode: "website_spec", user_message: prompt.trim() });

      const { data, error } = await supabase.functions.invoke("agent-orchestrator", {
        body: {
          workspace_id: workspace.id,
          prompt: prompt.trim(),
          module_type: "website_spec",
          mode: "balanced",
          config: {
            surface: "vibe_coder",
            project_id: ensuredProjectId,
            website_id: selectedWebsiteId,
            build_target: WEBSITE_BUILD_TARGET,
            project_name: projectName.trim() || selectedWebsite?.name || "Novo Projeto",
          },
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.prd_id) throw new Error("Nao foi possivel iniciar a spec do site.");

      setPrompt("");
      setActiveRunId(data.prd_id as string);
      setActiveRunPayload(null);
      toast.success("Spec do site iniciada");

      void supabase.functions.invoke("agent-worker", { body: { prd_id: data.prd_id } });
      await loadConversations(ensuredProjectId, selectedWebsiteId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel iniciar a spec");
    } finally {
      setSending(false);
    }
  };

  const approveSpec = async () => {
    if (!lastSpecPayload?.prd_id || !workspace?.id) return;

    setApproving(true);
    try {
      const { data, error } = await supabase.functions.invoke("agent-run-approve", {
        body: {
          prd_id: lastSpecPayload.prd_id,
          project_id: selectedProjectId,
          website_id: selectedWebsiteId,
          build_target: WEBSITE_BUILD_TARGET,
          project_name: projectName.trim() || selectedWebsite?.name || "Novo Projeto",
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.build_prd_id) throw new Error("Nao foi possivel iniciar o build do site.");

      await saveConversation({
        mode: "website_build",
        assistant_response: "Spec aprovada. O build multi-arquivo foi iniciado.",
        agent_prd_id: data.build_prd_id as string,
      });

      setActiveRunId(data.build_prd_id as string);
      setActiveRunPayload(null);
      toast.success("Build do site iniciado");

      void supabase.functions.invoke("agent-worker", { body: { prd_id: data.build_prd_id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel aprovar a spec");
    } finally {
      setApproving(false);
    }
  };

  useEffect(() => {
    if (!activeRunId) return;

    let cancelled = false;

    const pollStatus = async () => {
      const { data, error } = await supabase.functions.invoke("agent-status", { body: { prd_id: activeRunId } });
      if (cancelled || error || !data) return;

      const payload = data as AgentStatusPayload;
      setActiveRunPayload(payload);

      const completionKey = `${payload.prd_id}:${payload.status}:${payload.module_type}`;
      if (payload.status === "completed" && !handledRunStates.current.has(completionKey)) {
        handledRunStates.current.add(completionKey);

        if (payload.module_type === "website_spec") {
          setLastSpecPayload(payload);
          setActiveRunId(null);
          const currentSpec = readWebsiteSpec(getLatestArtifact(payload.artifacts || [], "spec"));
          await saveConversation({
            mode: "website_spec",
            assistant_response: currentSpec
              ? `Spec pronta: ${currentSpec.goal}. Revise a estrutura e aprove para gerar o site.`
              : payload.assembled_prd || "Spec pronta para aprovacao.",
            diff_summary: currentSpec ? `${currentSpec.pages.length} pagina(s) definidas | CTA: ${currentSpec.primary_cta.label}` : null,
            agent_prd_id: payload.prd_id,
          });
          await loadConversations(selectedProjectId, selectedWebsiteId);
          toast.success("Spec pronta para aprovacao");
          return;
        }

        if (payload.module_type === "website_build") {
          setLastBuildPayload(payload);
          setActiveRunId(null);
          if (selectedProjectId) {
            await loadSingleProject(selectedProjectId);
          }
          const currentQa = readWebsiteQaReport(getLatestArtifact(payload.artifacts || [], "qa_report"));
          await saveConversation({
            mode: "website_build",
            assistant_response: currentQa?.summary || payload.assembled_prd || "Build finalizado.",
            diff_summary: currentQa?.handoff_summary || payload.final_prompt || null,
            agent_prd_id: payload.prd_id,
          });
          await loadConversations(selectedProjectId, selectedWebsiteId);
          toast.success(currentQa?.approved ? "Build concluido" : "Build concluido com bloqueios de QA");
          return;
        }
      }

      const failureKey = `${payload.prd_id}:failed:${payload.module_type}`;
      if (payload.status === "failed" && !handledRunStates.current.has(failureKey)) {
        handledRunStates.current.add(failureKey);
        setActiveRunId(null);
        const failedTask = payload.tasks.find((task) => task.status === "failed");
        await saveConversation({
          mode: payload.module_type,
          assistant_response: `Run falhou: ${failedTask?.error_msg || "erro desconhecido"}`,
          agent_prd_id: payload.prd_id,
        });
        await loadConversations(selectedProjectId, selectedWebsiteId);
        toast.error(failedTask?.error_msg || "A execucao falhou");
      }
    };

    void pollStatus();
    const interval = window.setInterval(() => void pollStatus(), 1500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeRunId, loadConversations, loadSingleProject, saveConversation, selectedProjectId, selectedWebsiteId]);

  const exportZip = async () => {
    const zip = new JSZip();
    Object.entries(sourceFiles).forEach(([path, content]) => zip.file(path.replace(/^\//, ""), content));
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(selectedProject?.name || "website-project").replace(/\s+/g, "-").toLowerCase()}.zip`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportHtml = async () => {
    if (!workspace?.id || !selectedProjectId) return;

    setExportingHtml(true);
    try {
      const { data, error } = await supabase.functions.invoke("project-export", {
        body: { workspace_id: workspace.id, project_id: selectedProjectId, format: "html_single" },
      });
      if (error) throw error;
      downloadFile(
        `${(data?.title || selectedProject?.name || "project").replace(/\s+/g, "-").toLowerCase()}.html`,
        data?.html || "",
        "text/html;charset=utf-8",
      );
      toast.success("HTML exportado");
    } catch {
      toast.error("Nao foi possivel exportar o HTML unico");
    } finally {
      setExportingHtml(false);
    }
  };

  const visibleTasks = activeRunPayload?.tasks?.length
    ? [...activeRunPayload.tasks].sort((left, right) => left.task_order - right.task_order)
    : lastBuildPayload?.tasks?.length
      ? [...lastBuildPayload.tasks].sort((left, right) => left.task_order - right.task_order)
      : lastSpecPayload?.tasks?.length
        ? [...lastSpecPayload.tasks].sort((left, right) => left.task_order - right.task_order)
        : [];

  return (
    <div className="page-layout overflow-hidden">
      <div className="page-content">
        <div className="page-inner flex max-w-none flex-col gap-6 py-6">
          <PageHeader
            eyebrow="VibeCoder"
            title="Fluxo spec-driven para sites"
            description="O chat agora gera spec, exige aprovacao e so depois executa o projeto multi-arquivo. O preview continua no workspace, sem bypass paralelo."
            className="shadow-none"
            action={
              <div className="flex flex-wrap gap-2">
                {selectedWebsite ? (
                  <SubtleBadge variant="brand">
                    <LayoutTemplate size={12} />
                    {selectedWebsite.name}
                  </SubtleBadge>
                ) : (
                  <SubtleBadge variant="outline">Projeto independente</SubtleBadge>
                )}
                <Button variant="outline" className="rounded-xl shadow-none" disabled={!selectedProjectId} onClick={exportZip}>
                  <Download size={14} />
                  ZIP
                </Button>
                <Button variant="outline" className="rounded-xl shadow-none" disabled={!selectedProjectId || exportingHtml} onClick={exportHtml}>
                  {exportingHtml ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  HTML unico
                </Button>
              </div>
            }
          />

          <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
            <div className="flex min-h-0 flex-col gap-6">
              <SectionCard className="space-y-4 shadow-none">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <AppSectionLabel>Vinculo</AppSectionLabel>
                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Contexto do build</h2>
                  </div>
                  <SubtleBadge variant={selectedWebsite ? "brand" : "outline"}>{selectedWebsite ? "Site visual" : "Livre"}</SubtleBadge>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedWebsite?.name || "Nenhum site visual vinculado"}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {selectedWebsite
                      ? `Os runs deste projeto tambem ficam ligados ao site ${selectedWebsite.domain || "sem dominio"}.`
                      : "O projeto roda no target project_vfs e pode ser vinculado a um site visual depois."}
                  </p>
                </div>
              </SectionCard>

              <SectionCard className="space-y-4 shadow-none">
                <div>
                  <AppSectionLabel>Novo projeto</AppSectionLabel>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Abrir um workspace de build</h2>
                </div>
                <Input
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="Nome do projeto"
                  className="h-11 rounded-xl border-[var(--border)] bg-[var(--surface-2)]"
                />
                <Button onClick={() => void createProject()} disabled={creating} className="h-11 w-full rounded-xl shadow-none">
                  {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {creating ? "Criando..." : "Criar projeto"}
                </Button>
              </SectionCard>

              <SectionCard className="flex min-h-0 flex-1 flex-col gap-4 shadow-none">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <AppSectionLabel>Projetos</AppSectionLabel>
                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Biblioteca ativa</h2>
                  </div>
                  <SubtleBadge>{projects.length}</SubtleBadge>
                </div>

                <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
                  {projects.length === 0 ? (
                    <EmptyState
                      title="Nenhum projeto ainda"
                      description="Crie o primeiro projeto para abrir o preview e iniciar o fluxo spec-driven."
                      icon={FileCode2}
                      className="min-h-[180px]"
                    />
                  ) : (
                    projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => {
                          setSelectedProjectId(project.id);
                          setProjectName(project.name);
                          setSelectedWebsiteId(project.website_id || selectedWebsiteId);
                          if (project.source_files_json && typeof project.source_files_json === "object") {
                            setSourceFiles(project.source_files_json);
                          }
                        }}
                        className="w-full rounded-2xl border p-4 text-left transition-colors"
                        style={{
                          background: selectedProjectId === project.id ? "var(--workspace-brand-soft)" : "var(--surface-2)",
                          borderColor: selectedProjectId === project.id ? "var(--workspace-brand-border)" : "var(--border)",
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{project.name}</p>
                          <SubtleBadge variant={selectedProjectId === project.id ? "brand" : "outline"}>{project.status || "draft"}</SubtleBadge>
                        </div>
                        <p className="mt-2 text-xs text-[var(--text-muted)]">{project.description || "Projeto iniciado pelo site squad"}</p>
                      </button>
                    ))
                  )}
                </div>
              </SectionCard>

              <SectionCard className="space-y-4 shadow-none">
                <div>
                  <AppSectionLabel>Chat spec-driven</AppSectionLabel>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Pedido inicial</h2>
                </div>
                <Textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  className="min-h-[180px] resize-none rounded-xl border-[var(--border)] bg-[var(--surface-2)]"
                  placeholder="Ex: landing page premium para consultoria B2B com hero forte, provas sociais, FAQ e formulario de lead."
                />
                <Button onClick={sendPrompt} disabled={sending || approving} className="h-11 w-full rounded-xl shadow-none">
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {sending ? "Gerando spec..." : "Gerar spec"}
                </Button>
              </SectionCard>
            </div>

            <SectionCard className="flex min-h-[720px] min-w-0 flex-col overflow-hidden p-0 shadow-none">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
                <div>
                  <AppSectionLabel>Preview runtime</AppSectionLabel>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{selectedProject?.name || "Selecione ou crie um projeto"}</h2>
                </div>
                {selectedProject ? (
                  <div className="flex flex-wrap gap-2">
                    <SubtleBadge>{summary.fileCount} arquivos</SubtleBadge>
                    <SubtleBadge variant="outline">{summary.totalChars} chars</SubtleBadge>
                  </div>
                ) : null}
              </div>

              {selectedProjectId ? (
                <div className="min-h-0 flex-1 overflow-hidden bg-[var(--surface-2)]">
                  <SandpackProvider template="react-ts" files={adaptFilesForSandpack(sourceFiles)}>
                    <SandpackLayout style={{ height: "100%" }}>
                      <SandpackFileExplorer style={{ minWidth: 220, maxWidth: 260 }} />
                      <SandpackCodeEditor style={{ height: "100%" }} showTabs showLineNumbers />
                      <SandpackPreview style={{ height: "100%" }} showOpenInCodeSandbox={false} />
                    </SandpackLayout>
                  </SandpackProvider>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center p-8">
                  <EmptyState
                    title="Nenhum projeto selecionado"
                    description="Crie ou selecione um projeto para abrir o preview e rodar o squad de website."
                    icon={FileCode2}
                  />
                </div>
              )}
            </SectionCard>

            <div className="flex min-h-0 flex-col gap-6">
              <SectionCard className="space-y-4 shadow-none">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <AppSectionLabel>Spec</AppSectionLabel>
                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Aprovar para gerar</h2>
                  </div>
                  <SubtleBadge variant={latestSpecArtifact?.status === "approved" ? "brand" : "outline"}>
                    {latestSpecArtifact?.status || "pendente"}
                  </SubtleBadge>
                </div>

                {spec ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{spec.goal}</p>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{spec.value_proposition}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <SubtleBadge variant="outline">{spec.site_type}</SubtleBadge>
                        <SubtleBadge variant="outline">{spec.audience}</SubtleBadge>
                        <SubtleBadge variant="outline">{spec.primary_cta.label}</SubtleBadge>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-4">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Paginas e secoes</p>
                      <div className="mt-3 space-y-3">
                        {spec.pages.map((page) => (
                          <div key={page.slug} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">
                              {page.name} <span className="text-[var(--text-muted)]">{page.slug}</span>
                            </p>
                            <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{page.sections.join(" • ")}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={approveSpec}
                      disabled={approving || activeRunPayload?.module_type === "website_build" || latestSpecArtifact?.status === "approved"}
                      className="h-11 w-full rounded-xl shadow-none"
                    >
                      {approving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      {approving ? "Aprovando..." : "Aprovar e gerar"}
                    </Button>
                  </div>
                ) : (
                  <EmptyState
                    title="Spec ainda nao gerada"
                    description="Envie um pedido no chat. O build multi-arquivo so comeca depois da aprovacao da spec."
                    icon={FileSearch}
                    className="min-h-[220px]"
                  />
                )}
              </SectionCard>

              <SectionCard className="space-y-4 shadow-none">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <AppSectionLabel>Runtime</AppSectionLabel>
                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Tarefas e artifacts</h2>
                  </div>
                  <SubtleBadge variant={activeRunId ? "brand" : "outline"}>
                    {activeRunPayload?.status || lastBuildPayload?.status || lastSpecPayload?.status || "idle"}
                  </SubtleBadge>
                </div>

                {visibleTasks.length > 0 ? (
                  <div className="space-y-3">
                    {visibleTasks.map((task) => (
                      <div key={task.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{task.label}</p>
                          <SubtleBadge variant={task.status === "completed" ? "brand" : task.status === "failed" ? "solid" : "outline"}>
                            {task.status}
                          </SubtleBadge>
                        </div>
                        {task.error_msg ? <p className="mt-2 text-xs leading-5 text-[var(--destructive)]">{task.error_msg}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">Nenhuma tarefa em execucao no momento.</p>
                )}

                {plan ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-4">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Plano</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{plan.summary}</p>
                  </div>
                ) : null}

                {taskGraph ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-4">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Critical path</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{taskGraph.critical_path.join(" -> ")}</p>
                  </div>
                ) : null}

                {qaReport ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">QA</p>
                      <SubtleBadge variant={qaReport.approved ? "brand" : "solid"}>
                        <ShieldCheck size={12} />
                        {qaReport.approved ? "aprovado" : "bloqueado"}
                      </SubtleBadge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{qaReport.summary}</p>
                    {qaReport.issues.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {qaReport.issues.slice(0, 4).map((issue) => (
                          <p key={issue} className="text-xs leading-5 text-[var(--destructive)]">{issue}</p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </SectionCard>

              <SectionCard className="flex min-h-0 flex-1 flex-col gap-4 shadow-none">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <AppSectionLabel>Historico</AppSectionLabel>
                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Conversas do projeto</h2>
                  </div>
                  <SubtleBadge variant="outline">
                    <MessageSquare size={12} />
                    {conversations.length}
                  </SubtleBadge>
                </div>

                <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
                  {conversations.length === 0 ? (
                    <EmptyState
                      title="Sem interacoes ainda"
                      description="Envie o primeiro pedido para registrar a spec e o build deste projeto."
                      icon={MessageSquare}
                      className="min-h-[220px]"
                    />
                  ) : (
                    conversations.map((conversation) => (
                      <article key={conversation.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <SubtleBadge variant="outline">{conversation.mode || "chat"}</SubtleBadge>
                        </div>
                        {conversation.user_message ? <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">{conversation.user_message}</p> : null}
                        {conversation.assistant_response ? <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{conversation.assistant_response}</p> : null}
                        {conversation.diff_summary ? <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">{conversation.diff_summary}</p> : null}
                      </article>
                    ))
                  )}
                </div>
              </SectionCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VibeCoderPage;
