import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Film, LayoutPanelTop, Plus, Rows3, Sparkles, Video } from "lucide-react";
import AppSectionLabel from "@/components/shared/AppSectionLabel";
import SectionCard from "@/components/shared/SectionCard";
import VideoStudioShell from "@/components/video/VideoStudioShell";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client"
import { fromTable } from "@/integrations/supabase/db-custom";
import type {
  AIGeneratedVideo,
  ScrollSection,
  VideoJob,
  VideoProject,
  VideoTemplate,
} from "@/lib/video-studio";

const statusTone = (status?: string | null) => {
  if (status === "completed" || status === "ready") return "text-emerald-300 bg-emerald-500/10";
  if (status === "failed") return "text-rose-300 bg-rose-500/10";
  if (status === "running" || status === "processing") return "text-sky-300 bg-sky-500/10";
  return "text-amber-200 bg-amber-500/10";
};

export default function VideoStudioPage() {
  const { workspace } = useWorkspace();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [generations, setGenerations] = useState<AIGeneratedVideo[]>([]);
  const [sections, setSections] = useState<ScrollSection[]>([]);
  const [templates, setTemplates] = useState<VideoTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!workspace?.id) return;
    setLoading(true);
    try {
      const [projectsResult, jobsResult, generationsResult, sectionsResult, templatesResult] = await Promise.all([
        fromTable('video_projects').select("*").eq("workspace_id", workspace.id).order("updated_at", { ascending: false }).limit(12),
        fromTable('video_jobs').select("*").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(8),
        fromTable('ai_generated_videos').select("*").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(6),
        fromTable('scroll_sections').select("*").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(6),
        fromTable('video_templates')
          .select("*")
          .or(`is_system.eq.true,workspace_id.eq.${workspace.id}`)
          .order("is_system", { ascending: false })
          .limit(8),
      ]);

      setProjects((projectsResult.data || []) as VideoProject[]);
      setJobs((jobsResult.data || []) as VideoJob[]);
      setGenerations((generationsResult.data || []) as AIGeneratedVideo[]);
      setSections((sectionsResult.data || []) as ScrollSection[]);
      setTemplates((templatesResult.data || []) as VideoTemplate[]);
    } finally {
      setLoading(false);
    }
  }, [workspace?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = useMemo(() => ({
    projects: projects.length,
    runningJobs: jobs.filter((job) => job.status === "running" || job.status === "queued").length,
    motionSections: sections.length,
    templates: templates.length,
  }), [jobs, projects.length, sections.length, templates.length]);

  return (
    <VideoStudioShell
      title="Video Studio"
      description="Hub único para edição de vídeo, geração IA e motion sections integradas ao Site Builder."
      action={
        <>
          <Button variant="outline" className="rounded-xl" onClick={() => navigate("generate")}>
            <Sparkles size={14} />
            Generate
          </Button>
          <Button className="rounded-xl" onClick={() => navigate("editor/new")}>
            <Plus size={14} />
            New project
          </Button>
        </>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: "Projects", value: metrics.projects, icon: Film },
              { label: "Queued/Running", value: metrics.runningJobs, icon: Rows3 },
              { label: "Motion Sections", value: metrics.motionSections, icon: LayoutPanelTop },
              { label: "Templates", value: metrics.templates, icon: Video },
            ].map((item) => (
              <SectionCard key={item.label} className="space-y-4">
                <div className="flex items-center justify-between">
                  <AppSectionLabel>{item.label}</AppSectionLabel>
                  <item.icon className="h-4 w-4 text-[var(--workspace-brand)]" />
                </div>
                <p className="text-4xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{loading ? "..." : item.value}</p>
              </SectionCard>
            ))}
          </div>

          <SectionCard className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <AppSectionLabel>Video Projects</AppSectionLabel>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  Editor library
                </h2>
              </div>
              <Button variant="outline" className="rounded-xl" onClick={() => navigate("editor/new")}>
                New editor project
              </Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {projects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-8 text-sm text-[var(--text-secondary)]">
                  Nenhum projeto criado ainda. O primeiro upload gera o projeto, a timeline inicial e o asset de origem.
                </div>
              ) : (
                projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => navigate(`editor/${project.id}`)}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5 text-left transition-colors hover:border-[var(--workspace-brand-border)] hover:bg-[var(--workspace-brand-soft)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-[var(--text-primary)]">{project.name}</p>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                          {project.ratio} · {project.fps}fps
                        </p>
                      </div>
                      <div className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(project.status)}`}>
                        {project.status}
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-[var(--text-secondary)]">
                      Active timeline: {project.active_timeline_version_id ? "ready" : "missing"} · Latest subtitle: {project.latest_subtitle_track_id ? "yes" : "no"}
                    </p>
                  </button>
                ))
              )}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard className="space-y-4">
            <div>
              <AppSectionLabel>Recent Jobs</AppSectionLabel>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                Runtime queue
              </h2>
            </div>

            <div className="space-y-3">
              {jobs.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">Nenhum job executado ainda.</p>
              ) : jobs.map((job) => (
                <div key={job.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{job.job_type}</p>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusTone(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">{job.provider_name || "runtime/local"}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <AppSectionLabel>AI Generate</AppSectionLabel>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                  Prompt stacks
                </h2>
              </div>
              <Button variant="outline" className="rounded-xl" onClick={() => navigate("generate")}>
                Open generate
              </Button>
            </div>
            <div className="space-y-3">
              {generations.slice(0, 4).map((generation) => (
                <div key={generation.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{generation.title || "Untitled generation"}</p>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusTone(generation.status)}`}>
                      {generation.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    {generation.style_template || "custom"} · {generation.camera_movement || "static"} · {generation.duration_seconds}s
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <AppSectionLabel>Motion Sections</AppSectionLabel>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                  Scroll inventory
                </h2>
              </div>
              <Button variant="outline" className="rounded-xl" onClick={() => navigate("motion")}>
                Open motion
              </Button>
            </div>
            <div className="space-y-3">
              {sections.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">Nenhuma motion section criada ainda.</p>
              ) : sections.map((section) => (
                <div key={section.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{section.name}</p>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusTone(section.status)}`}>
                      {section.scroll_effect_type}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    {String(section.content?.headline || section.content?.objective || "Sem headline")}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </VideoStudioShell>
  );
}
