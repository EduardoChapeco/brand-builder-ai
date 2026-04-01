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
      downloadFile(`${(data?.title || selectedProject?.name || 'project').replace(/\s+/g, '-').toLowerCase()}.html`, data?.html || '', 'text/html;charset=utf-8');
      toast.success('HTML exportado');
    } catch (error) {
      console.error(error);
      toast.error('Nao foi possivel exportar o HTML unico');
    } finally {
      setExportingHtml(false);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      <aside className="w-[360px] shrink-0 border-r overflow-y-auto no-scrollbar" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--text-3)' }}>VibeCoder</p>
          <h1 className="mt-2 text-2xl font-display font-bold" style={{ color: 'var(--text-1)' }}>Builder multi-file</h1>
          <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-3)' }}>
            Chat de constru��o com preview React em tempo real e VFS persistido em `projects.source_files_json`.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <Input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Nome do projeto" />
          <Button onClick={createProject} disabled={creating} className="w-full gap-2" style={{ background: 'var(--primary)', color: '#fff' }}>
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {creating ? 'Criando...' : 'Novo projeto'}
          </Button>

          <div className="space-y-2">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  setSelectedProjectId(project.id);
                  if (project.source_files_json && typeof project.source_files_json === 'object') {
                    setSourceFiles(project.source_files_json as Record<string, string>);
                  }
                }}
                className="w-full rounded-2xl p-4 text-left transition-all"
                style={{
                  background: selectedProjectId === project.id ? 'var(--primary-muted)' : 'var(--bg-card)',
                  border: `1px solid ${selectedProjectId === project.id ? 'var(--primary)' : 'var(--border)'}`,
                }}
              >
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>{project.status || 'draft'}</p>
                <p className="mt-1 font-semibold" style={{ color: 'var(--text-1)' }}>{project.name}</p>
              </button>
            ))}
          </div>

          <div className="rounded-3xl p-4 space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <MessageSquare size={14} style={{ color: 'var(--primary)' }} />
              <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>Chat vibe</p>
            </div>
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              className="min-h-[140px] resize-none"
              placeholder="Ex: crie uma hero com prova social, CTA forte e cards de benefícios"
            />
            <Button onClick={sendPrompt} disabled={sending || !selectedProjectId} className="w-full gap-2" style={{ background: 'var(--primary)', color: '#fff' }}>
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {sending ? 'Aplicando...' : 'Enviar instru��o'}
            </Button>
          </div>

          <div className="rounded-3xl p-4 space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <FileCode2 size={14} style={{ color: 'var(--primary)' }} />
              <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>Exportacao</p>
            </div>
            <Button variant="outline" onClick={exportZip} className="w-full gap-2" disabled={!selectedProjectId}>
              <Download size={14} />
              Baixar ZIP
            </Button>
            <Button variant="outline" onClick={exportHtml} className="w-full gap-2" disabled={!selectedProjectId || exportingHtml}>
              {exportingHtml ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              HTML unico
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="px-8 py-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <div>
            <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>Preview Runtime</p>
            <h2 className="mt-2 text-2xl font-display font-bold" style={{ color: 'var(--text-1)' }}>{selectedProject?.name || 'Selecione um projeto'}</h2>
          </div>
          {selectedProject && (
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>Resumo</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-2)' }}>
                {buildProjectSummary(sourceFiles).fileCount} arquivos · {buildProjectSummary(sourceFiles).totalChars} chars
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.6fr] h-[calc(100%-89px)]">
          <div className="min-w-0 border-r" style={{ borderColor: 'var(--border)' }}>
            <SandpackProvider template="react-ts" files={adaptFilesForSandpack(sourceFiles)} theme="dark">
              <SandpackLayout style={{ height: '100%' }}>
                <SandpackFileExplorer style={{ minWidth: 220, maxWidth: 260 }} />
                <SandpackCodeEditor style={{ height: '100%' }} showTabs showLineNumbers />
                <SandpackPreview style={{ height: '100%' }} showOpenInCodeSandbox={false} />
              </SandpackLayout>
            </SandpackProvider>
          </div>

          <div className="overflow-y-auto no-scrollbar p-6 space-y-3">
            <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>Historico</p>
            {conversations.length === 0 ? (
              <div className="rounded-2xl p-4 text-sm" style={{ background: 'var(--bg-card)', color: 'var(--text-3)' }}>
                Ainda nao ha interacoes. Envie a primeira instru��o para modificar o app.
              </div>
            ) : (
              conversations.map((conversation) => (
                <article key={conversation.id} className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>{conversation.mode || 'chat'}</p>
                  <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{conversation.user_message}</p>
                  {conversation.assistant_response && (
                    <p className="mt-3 text-sm leading-6" style={{ color: 'var(--text-2)' }}>{conversation.assistant_response}</p>
                  )}
                  {conversation.diff_summary && (
                    <p className="mt-3 text-xs leading-5" style={{ color: 'var(--text-3)' }}>{conversation.diff_summary}</p>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VibeCoderPage;
