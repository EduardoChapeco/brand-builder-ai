import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  SandpackCodeEditor,
  SandpackFileExplorer,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from '@codesandbox/sandpack-react';
import JSZip from 'jszip';
import { Download, FileCode2, Loader2, MessageSquare, Plus, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import AppSectionLabel from '@/components/shared/AppSectionLabel';
import EmptyState from '@/components/shared/EmptyState';
import PageHeader from '@/components/shared/PageHeader';
import SectionCard from '@/components/shared/SectionCard';
import SubtleBadge from '@/components/shared/SubtleBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { buildProjectSummary, VIBECODER_STARTER_FILES } from '@/lib/postgenPhase3';

type Project = Tables<'projects'>;
type Conversation = Tables<'platform_conversations'>;

const adaptFilesForSandpack = (files: Record<string, string>) => {
  const next: Record<string, string> = {};

  for (const [path, content] of Object.entries(files)) {
    if (path.startsWith('/src/')) {
      next[path.replace('/src', '')] = content;
    } else {
      next[path] = content;
    }
  }

  if (!next['/App.tsx'] && files['/src/App.tsx']) next['/App.tsx'] = files['/src/App.tsx'];
  if (!next['/index.tsx'] && files['/src/index.tsx']) next['/index.tsx'] = files['/src/index.tsx'];
  return next;
};

const downloadFile = (filename: string, content: string, type = 'text/plain;charset=utf-8') => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const VibeCoderPage = () => {
  const location = useLocation();
  const { workspace } = useWorkspace();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [sourceFiles, setSourceFiles] = useState<Record<string, string>>(VIBECODER_STARTER_FILES);
  const [prompt, setPrompt] = useState('');
  const [projectName, setProjectName] = useState('Novo Projeto');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [exportingHtml, setExportingHtml] = useState(false);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId],
  );

  const projectSummary = useMemo(() => buildProjectSummary(sourceFiles), [sourceFiles]);

  const loadProjects = useCallback(async () => {
    if (!workspace?.id) return;

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('updated_at', { ascending: false })
      .limit(24);

    if (error) {
      toast.error('Nao foi possivel carregar os projetos');
      return;
    }

    const rows = (data || []) as Project[];
    setProjects(rows);

    const routedProjectId = (location.state as { projectId?: string } | null)?.projectId;
    const nextSelected = routedProjectId && rows.some((row) => row.id === routedProjectId)
      ? routedProjectId
      : selectedProjectId || rows[0]?.id || null;

    setSelectedProjectId(nextSelected);

    const current = rows.find((row) => row.id === nextSelected);
    if (current?.source_files_json && typeof current.source_files_json === 'object') {
      setSourceFiles(current.source_files_json as Record<string, string>);
      setProjectName(current.name);
    }
  }, [location.state, selectedProjectId, workspace?.id]);

  const loadConversations = useCallback(async (projectId: string) => {
    if (!workspace?.id) return;

    const { data } = await supabase
      .from('platform_conversations')
      .select('*')
      .eq('workspace_id', workspace.id)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(20);

    setConversations((data || []) as Conversation[]);
  }, [workspace?.id]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!selectedProjectId) {
      setConversations([]);
      return;
    }
    loadConversations(selectedProjectId);
  }, [loadConversations, selectedProjectId]);

  const createProject = async () => {
    if (!workspace?.id || !projectName.trim()) {
      toast.error('Defina um nome para o projeto');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        workspace_id: workspace.id,
        name: projectName.trim(),
        description: 'Projeto inicial do VibeCoder',
        status: 'draft',
        entry_file: '/src/App.tsx',
        source_files_json: VIBECODER_STARTER_FILES,
        preview_meta: buildProjectSummary(VIBECODER_STARTER_FILES),
      };
      const { data, error } = await supabase.from('projects').insert(payload).select('*').single();
      if (error) throw error;
      setSelectedProjectId(data.id);
      setSourceFiles(VIBECODER_STARTER_FILES);
      await loadProjects();
      toast.success('Projeto criado');
    } catch (error) {
      console.error(error);
      toast.error('Nao foi possivel criar o projeto');
    } finally {
      setCreating(false);
    }
  };

  const sendPrompt = async () => {
    if (!workspace?.id || !selectedProjectId || !prompt.trim()) {
      toast.error('Selecione um projeto e descreva a alteracao');
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('project-chat-build', {
        body: {
          workspace_id: workspace.id,
          project_id: selectedProjectId,
          message: prompt.trim(),
          source_files_json: sourceFiles,
        },
      });
      if (error) throw error;
      if (data?.source_files_json) {
        setSourceFiles(data.source_files_json as Record<string, string>);
      }
      setPrompt('');
      await loadProjects();
      await loadConversations(selectedProjectId);
      toast.success(data?.summary || 'Projeto atualizado');
    } catch (error) {
      console.error(error);
      toast.error('Nao foi possivel atualizar o projeto');
    } finally {
      setSending(false);
    }
  };

  const exportZip = async () => {
    const zip = new JSZip();
    Object.entries(sourceFiles).forEach(([path, content]) => {
      zip.file(path.replace(/^\//, ''), content);
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(selectedProject?.name || 'vibecoder-project').replace(/\s+/g, '-').toLowerCase()}.zip`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportHtml = async () => {
    if (!workspace?.id || !selectedProjectId) return;

    setExportingHtml(true);
    try {
      const { data, error } = await supabase.functions.invoke('project-export', {
        body: {
          workspace_id: workspace.id,
          project_id: selectedProjectId,
          format: 'html_single',
        },
      });
      if (error) throw error;
      downloadFile(
        `${(data?.title || selectedProject?.name || 'project').replace(/\s+/g, '-').toLowerCase()}.html`,
        data?.html || '',
        'text/html;charset=utf-8',
      );
      toast.success('HTML exportado');
    } catch (error) {
      console.error(error);
      toast.error('Nao foi possivel exportar o HTML unico');
    } finally {
      setExportingHtml(false);
    }
  };

  return (
    <div className="page-layout overflow-hidden">
      <div className="page-content no-scrollbar">
        <div className="page-inner flex h-full max-w-none flex-col gap-6 py-6">
          <PageHeader
            eyebrow="VibeCoder"
            title="Builder multi-file com preview vivo"
            description="Converse com o projeto, persista o VFS no banco e exporte o artefato final sem sair do workspace."
            action={
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="rounded-xl" disabled={!selectedProjectId} onClick={exportZip}>
                  <Download size={14} />
                  ZIP
                </Button>
                <Button variant="outline" className="rounded-xl" disabled={!selectedProjectId || exportingHtml} onClick={exportHtml}>
                  {exportingHtml ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  HTML unico
                </Button>
              </div>
            }
          />

          <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
            <div className="flex min-h-0 flex-col gap-6">
              <SectionCard className="space-y-4">
                <div>
                  <AppSectionLabel>Novo projeto</AppSectionLabel>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                    Abrir um novo playground
                  </h2>
                </div>
                <Input
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="Nome do projeto"
                  className="h-11 rounded-xl bg-[var(--surface-2)]"
                />
                <Button onClick={createProject} disabled={creating} className="h-11 w-full rounded-xl">
                  {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {creating ? 'Criando...' : 'Novo projeto'}
                </Button>
              </SectionCard>

              <SectionCard className="flex min-h-0 flex-1 flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <AppSectionLabel>Projetos</AppSectionLabel>
                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                      Biblioteca ativa
                    </h2>
                  </div>
                  <SubtleBadge>{projects.length}</SubtleBadge>
                </div>

                <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
                  {projects.length === 0 ? (
                    <EmptyState
                      title="Nenhum projeto ainda"
                      description="Crie o primeiro projeto para abrir o editor com preview React."
                      icon={FileCode2}
                      className="min-h-[180px]"
                    />
                  ) : (
                    projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => {
                          setSelectedProjectId(project.id);
                          if (project.source_files_json && typeof project.source_files_json === 'object') {
                            setSourceFiles(project.source_files_json as Record<string, string>);
                          }
                        }}
                        className="w-full rounded-2xl border p-4 text-left transition-colors"
                        style={{
                          background:
                            selectedProjectId === project.id ? 'var(--workspace-brand-soft)' : 'var(--surface-2)',
                          borderColor:
                            selectedProjectId === project.id ? 'var(--workspace-brand-border)' : 'var(--border)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{project.name}</p>
                          <SubtleBadge variant={selectedProjectId === project.id ? 'brand' : 'outline'}>
                            {project.status || 'draft'}
                          </SubtleBadge>
                        </div>
                        <p className="mt-2 text-xs text-[var(--text-muted)]">
                          {project.description || 'Projeto iniciado pelo builder'}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </SectionCard>

              <SectionCard className="space-y-4">
                <div>
                  <AppSectionLabel>Chat vibe</AppSectionLabel>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                    Instrucao de edicao
                  </h2>
                </div>
                <Textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  className="min-h-[160px] resize-none rounded-xl bg-[var(--surface-2)]"
                  placeholder="Ex: crie uma hero com prova social, CTA forte e cards de beneficios"
                />
                <Button onClick={sendPrompt} disabled={sending || !selectedProjectId} className="h-11 w-full rounded-xl">
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {sending ? 'Aplicando...' : 'Enviar instrucao'}
                </Button>
              </SectionCard>
            </div>

            <SectionCard className="flex min-h-[680px] min-w-0 flex-col overflow-hidden p-0">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
                <div>
                  <AppSectionLabel>Preview runtime</AppSectionLabel>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                    {selectedProject?.name || 'Selecione um projeto'}
                  </h2>
                </div>
                {selectedProject ? (
                  <div className="flex flex-wrap gap-2">
                    <SubtleBadge>{projectSummary.fileCount} arquivos</SubtleBadge>
                    <SubtleBadge variant="outline">{projectSummary.totalChars} chars</SubtleBadge>
                  </div>
                ) : null}
              </div>

              {selectedProjectId ? (
                <div className="min-h-0 flex-1 overflow-hidden bg-[#0B0B0C]">
                  <SandpackProvider template="react-ts" files={adaptFilesForSandpack(sourceFiles)} theme="dark">
                    <SandpackLayout style={{ height: '100%' }}>
                      <SandpackFileExplorer style={{ minWidth: 220, maxWidth: 260 }} />
                      <SandpackCodeEditor style={{ height: '100%' }} showTabs showLineNumbers />
                      <SandpackPreview style={{ height: '100%' }} showOpenInCodeSandbox={false} />
                    </SandpackLayout>
                  </SandpackProvider>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center p-8">
                  <EmptyState
                    title="Nenhum projeto selecionado"
                    description="Escolha um projeto na lateral ou crie um novo playground para abrir o preview."
                    icon={FileCode2}
                  />
                </div>
              )}
            </SectionCard>

            <div className="flex min-h-0 flex-col gap-6">
              <SectionCard className="space-y-4">
                <div>
                  <AppSectionLabel>Exportacao</AppSectionLabel>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                    Artefatos do projeto
                  </h2>
                </div>
                <Button variant="outline" onClick={exportZip} className="h-11 w-full rounded-xl" disabled={!selectedProjectId}>
                  <Download size={14} />
                  Baixar ZIP
                </Button>
                <Button
                  variant="outline"
                  onClick={exportHtml}
                  className="h-11 w-full rounded-xl"
                  disabled={!selectedProjectId || exportingHtml}
                >
                  {exportingHtml ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  HTML unico
                </Button>
              </SectionCard>

              <SectionCard className="flex min-h-0 flex-1 flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <AppSectionLabel>Historico</AppSectionLabel>
                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                      Conversas do projeto
                    </h2>
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
                      description="Envie a primeira instrucao para registrar alteracoes neste projeto."
                      icon={MessageSquare}
                      className="min-h-[220px]"
                    />
                  ) : (
                    conversations.map((conversation) => (
                      <article
                        key={conversation.id}
                        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <SubtleBadge variant="outline">{conversation.mode || 'chat'}</SubtleBadge>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                          {conversation.user_message}
                        </p>
                        {conversation.assistant_response ? (
                          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                            {conversation.assistant_response}
                          </p>
                        ) : null}
                        {conversation.diff_summary ? (
                          <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">{conversation.diff_summary}</p>
                        ) : null}
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
