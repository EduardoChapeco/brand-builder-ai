import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Download, RefreshCcw, Sparkles, Subtitles, Upload, Waves, Zap } from "lucide-react";
import { toast } from "sonner";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import AppSectionLabel from "@/components/shared/AppSectionLabel";
import SectionCard from "@/components/shared/SectionCard";
import VideoJobStatusCard from "@/components/video/VideoJobStatusCard";
import VideoStudioShell from "@/components/video/VideoStudioShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client"
import { fromTable } from "@/integrations/supabase/db-custom";
import {
  confirmVideoUpload,
  createVideoUploadSession,
  requestSilenceDetection,
  requestVideoExport,
  requestVideoSubtitles,
  requestViralityAnalysis,
  uploadVideoAssetFile,
  type VideoAsset,
  type VideoExport,
  type VideoJob,
  type VideoProject,
  type VideoSubtitleTrack,
  type VideoTimelineVersion,
} from "@/lib/video-studio";
import { useVideoJobStatus } from "@/hooks/useVideoJobStatus";

const EXPORT_PRESETS = ["reels", "tiktok", "shorts", "youtube", "linkedin", "x", "gif_preview"];

const statusTone = (status?: string | null) => {
  if (status === "ready" || status === "completed") return "text-emerald-300 bg-emerald-500/10";
  if (status === "failed") return "text-rose-300 bg-rose-500/10";
  if (status === "processing" || status === "running") return "text-sky-300 bg-sky-500/10";
  return "text-amber-200 bg-amber-500/10";
};

const parseThresholdCommand = (command: string) => {
  const match = command.match(/(0\.\d+|\d+(?:\.\d+)?)\s*s/i);
  if (!match) return 0.8;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : 0.8;
};

export default function VideoStudioEditorPage() {
  const { workspace } = useWorkspace();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [project, setProject] = useState<VideoProject | null>(null);
  const [assets, setAssets] = useState<VideoAsset[]>([]);
  const [timeline, setTimeline] = useState<VideoTimelineVersion | null>(null);
  const [subtitleTracks, setSubtitleTracks] = useState<VideoSubtitleTrack[]>([]);
  const [exports, setExports] = useState<VideoExport[]>([]);
  const [latestProjectJob, setLatestProjectJob] = useState<VideoJob | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("none");
  const [command, setCommand] = useState("");
  const [exportPreset, setExportPreset] = useState("reels");
  const [latestJobId, setLatestJobId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const { payload, refresh } = useVideoJobStatus(latestJobId);

  const load = useCallback(async (explicitProjectId?: string | null) => {
    if (!workspace?.id) return;
    const activeProjectId = explicitProjectId || projectId;
    if (!activeProjectId || activeProjectId === "new") {
      setProject(null);
      setAssets([]);
      setTimeline(null);
      setSubtitleTracks([]);
      setExports([]);
      setLatestProjectJob(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [projectResult, assetsResult, subtitleResult, exportsResult, jobsResult] = await Promise.all([
        fromTable('video_projects').select("*").eq("id", activeProjectId).eq("workspace_id", workspace.id).single(),
        fromTable('video_assets').select("*").eq("video_project_id", activeProjectId).order("created_at", { ascending: false }),
        fromTable('video_subtitle_tracks').select("*").eq("video_project_id", activeProjectId).order("created_at", { ascending: false }),
        fromTable('video_exports').select("*").eq("video_project_id", activeProjectId).order("created_at", { ascending: false }),
        fromTable('video_jobs').select("*").eq("video_project_id", activeProjectId).order("created_at", { ascending: false }).limit(1),
      ]);

      const nextProject = (projectResult.data || null) as VideoProject | null;
      setProject(nextProject);
      setAssets((assetsResult.data || []) as VideoAsset[]);
      setSubtitleTracks((subtitleResult.data || []) as VideoSubtitleTrack[]);
      setExports((exportsResult.data || []) as VideoExport[]);
      setLatestProjectJob(((jobsResult.data || [])[0] || null) as VideoJob | null);
      setLatestJobId(((jobsResult.data || [])[0] || null)?.id || null);

      if (nextProject?.active_timeline_version_id) {
        const { data: timelineRow } = await fromTable('video_timeline_versions')
          .select("*")
          .eq("id", nextProject.active_timeline_version_id)
          .single();
        setTimeline((timelineRow || null) as VideoTimelineVersion | null);
      } else {
        setTimeline(null);
      }

      if (nextProject?.latest_source_asset_id) {
        setSelectedAssetId(nextProject.latest_source_asset_id);
      } else if ((assetsResult.data || [])[0]?.id) {
        setSelectedAssetId((assetsResult.data || [])[0].id);
      } else {
        setSelectedAssetId("none");
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, workspace?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId)
      || assets.find((asset) => asset.id === project?.latest_source_asset_id)
      || null,
    [assets, project?.latest_source_asset_id, selectedAssetId],
  );

  const activeSubtitleTrack = useMemo(
    () => subtitleTracks.find((track) => track.id === project?.latest_subtitle_track_id) || subtitleTracks[0] || null,
    [project?.latest_subtitle_track_id, subtitleTracks],
  );

  const silenceCuts = useMemo(
    () => Array.isArray(timeline?.timeline_json?.silence_cuts) ? timeline?.timeline_json?.silence_cuts as Array<Record<string, unknown>> : [],
    [timeline?.timeline_json],
  );
  const viralHeatmap = useMemo(
    () => Array.isArray(timeline?.timeline_json?.viral_heatmap) ? timeline?.timeline_json?.viral_heatmap as Array<Record<string, unknown>> : [],
    [timeline?.timeline_json],
  );

  const handleUpload = async (file: File) => {
    if (!workspace?.id) return;
    setUploading(true);
    try {
      const session = await createVideoUploadSession({
        workspace_id: workspace.id,
        project_id: project?.id || null,
        project_name: project?.name || file.name.replace(/\.[^/.]+$/, ""),
        ratio: project?.ratio || "16:9",
        fps: project?.fps || 30,
        file_name: file.name,
        content_type: file.type || null,
        file_size_bytes: file.size,
      });

      await uploadVideoAssetFile({
        bucket: session.upload.bucket,
        path: session.upload.path,
        token: session.upload.token,
        file,
      });

      const confirmed = await confirmVideoUpload({
        workspace_id: workspace.id,
        asset_id: session.asset.id,
      });

      const resultingProject = confirmed.project || session.project;
      if (!project && resultingProject?.id) {
        navigate(`../video-studio/editor/${resultingProject.id}`, { replace: true });
        await load(resultingProject.id);
      } else {
        await load(resultingProject?.id || project?.id || undefined);
      }

      setSelectedAssetId(session.asset.id);
      toast.success("Upload concluido e projeto atualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setUploading(false);
    }
  };

  const runSubtitleJob = async () => {
    if (!workspace?.id || !project?.id || !selectedAsset?.id) {
      toast.error("Selecione um asset de origem para gerar legendas.");
      return;
    }
    const result = await requestVideoSubtitles({
      workspace_id: workspace.id,
      project_id: project.id,
      asset_id: selectedAsset.id,
    });
    setLatestJobId(result.job_id);
    toast.success("Job de legenda enviado ao runtime.");
  };

  const runSilenceJob = async (thresholdSeconds = 0.8) => {
    if (!workspace?.id || !project?.id) {
      toast.error("Projeto nao encontrado.");
      return;
    }
    const result = await requestSilenceDetection({
      workspace_id: workspace.id,
      project_id: project.id,
      timeline_version_id: timeline?.id || null,
      threshold_seconds: thresholdSeconds,
      padding_ms: 120,
      keep_breaths: false,
    });
    setLatestJobId(result.job_id);
    toast.success("Analise de silencio enviada.");
  };

  const runViralityJob = async () => {
    if (!workspace?.id || !project?.id) {
      toast.error("Projeto nao encontrado.");
      return;
    }
    const result = await requestViralityAnalysis({
      workspace_id: workspace.id,
      project_id: project.id,
      timeline_version_id: timeline?.id || null,
    });
    setLatestJobId(result.job_id);
    toast.success("Heatmap de viralidade em processamento.");
  };

  const runExportJob = async () => {
    if (!workspace?.id || !project?.id) {
      toast.error("Projeto nao encontrado.");
      return;
    }
    const result = await requestVideoExport({
      workspace_id: workspace.id,
      project_id: project.id,
      export_preset: exportPreset,
      timeline_version_id: timeline?.id || null,
    });
    setLatestJobId(result.job_id);
    toast.success("Export solicitado.");
  };

  const runCommand = async () => {
    const normalized = command.trim().toLowerCase();
    if (!normalized) return;

    try {
      if (normalized.includes("silencio") || normalized.includes("silêncio")) {
        await runSilenceJob(parseThresholdCommand(normalized));
      } else if (normalized.includes("legenda")) {
        await runSubtitleJob();
      } else if (normalized.includes("viral")) {
        await runViralityJob();
      } else if (normalized.includes("export")) {
        const preset = EXPORT_PRESETS.find((item) => normalized.includes(item));
        if (preset) setExportPreset(preset);
        await runExportJob();
      } else {
        toast.error("Comando ainda nao suportado pelo interpretador do editor.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setCommand("");
    }
  };

  return (
    <VideoStudioShell
      title={project ? project.name : "Video Editor"}
      description="Editor de vídeo com timeline canônica, jobs reais de processamento e barra de comando para operações suportadas."
      action={
        <Button variant="outline" className="rounded-xl" onClick={() => load()}>
          <RefreshCcw size={14} />
          Refresh
        </Button>
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,audio/*,image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleUpload(file);
        }}
      />

      <div className="min-h-[72vh] overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
        <PanelGroup direction="horizontal" className="min-h-[72vh]">
          <Panel defaultSize={22} minSize={18}>
            <div className="flex h-full flex-col border-r border-[var(--border)] bg-[var(--surface-2)]">
              <div className="border-b border-[var(--border)] px-5 py-4">
                <AppSectionLabel>Media Panel</AppSectionLabel>
                <div className="mt-3 flex gap-2">
                  <Button className="w-full rounded-xl" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? <RefreshCcw size={14} className="animate-spin" /> : <Upload size={14} />}
                    Upload media
                  </Button>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {assets.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--border)] p-5 text-sm text-[var(--text-secondary)]">
                    Nenhum asset carregado ainda. O primeiro upload cria o projeto e a timeline inicial.
                  </div>
                ) : assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setSelectedAssetId(asset.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                      selectedAssetId === asset.id
                        ? "border-[var(--workspace-brand-border)] bg-[var(--workspace-brand-soft)]"
                        : "border-[var(--border)] bg-[var(--surface-card)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{asset.file_name || asset.id}</p>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusTone(asset.status)}`}>
                        {asset.asset_type}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-[var(--text-secondary)]">
                      {asset.mime_type || "unknown"} · {asset.status}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="w-px bg-[var(--border)]" />

          <Panel defaultSize={56} minSize={38}>
            <PanelGroup direction="vertical">
              <Panel defaultSize={68} minSize={42}>
                <div className="flex h-full flex-col">
                  <div className="border-b border-[var(--border)] px-5 py-4">
                    <AppSectionLabel>AI Command Bar</AppSectionLabel>
                    <div className="mt-3 flex gap-2">
                      <Input
                        value={command}
                        onChange={(event) => setCommand(event.target.value)}
                        placeholder='Ex: "Remova silêncios acima de 0.8s" ou "Exporte para reels"'
                        className="rounded-xl"
                      />
                      <Button className="rounded-xl" onClick={runCommand}>
                        <Sparkles size={14} />
                        Run
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-hidden bg-[#060606] p-5">
                    <div className="flex h-full items-center justify-center rounded-[28px] border border-white/10 bg-black/30">
                      {selectedAsset?.asset_type === "video" || selectedAsset?.asset_type === "generated_video" ? (
                        <video
                          src={selectedAsset.public_url || undefined}
                          controls
                          className="h-full max-h-[520px] w-full rounded-[24px] object-contain"
                        />
                      ) : selectedAsset?.asset_type === "image" || selectedAsset?.asset_type === "generated_image" ? (
                        <img
                          src={selectedAsset.public_url || undefined}
                          alt={selectedAsset.file_name || "Selected asset"}
                          className="h-full max-h-[520px] w-full rounded-[24px] object-contain"
                        />
                      ) : (
                        <div className="px-8 text-center text-sm text-white/60">
                          {projectId === "new" || !project
                            ? "Envie um video para iniciar o editor."
                            : "Selecione um asset visual para abrir o preview."}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Panel>

              <PanelResizeHandle className="h-px bg-[var(--border)]" />

              <Panel defaultSize={32} minSize={24}>
                <div className="h-full overflow-y-auto border-t border-[var(--border)] bg-[var(--surface-2)] px-5 py-5">
                  <div className="grid gap-5 lg:grid-cols-3">
                    <SectionCard className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Waves className="h-4 w-4 text-[var(--workspace-brand)]" />
                        <p className="text-sm font-semibold text-[var(--text-primary)]">Silence cuts</p>
                      </div>
                      <p className="text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{silenceCuts.length}</p>
                      <div className="space-y-2 text-xs text-[var(--text-secondary)]">
                        {silenceCuts.slice(0, 4).map((cut, index) => (
                          <div key={`${cut.start}-${cut.end}-${index}`} className="rounded-xl bg-[var(--surface-card)] px-3 py-2">
                            {String(cut.start || 0)}s → {String(cut.end || 0)}s
                          </div>
                        ))}
                      </div>
                    </SectionCard>

                    <SectionCard className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-[var(--workspace-brand)]" />
                        <p className="text-sm font-semibold text-[var(--text-primary)]">Viral heatmap</p>
                      </div>
                      <div className="space-y-2">
                        {viralHeatmap.slice(0, 8).map((point, index) => (
                          <div key={`${point.second}-${index}`} className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                              <span>{String(point.second)}s</span>
                              <span>{Math.round(Number(point.score || 0) * 100)}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-[var(--surface-card)]">
                              <div
                                className="h-2 rounded-full bg-[linear-gradient(90deg,#F59E0B,#7C3AED)]"
                                style={{ width: `${Math.min(100, Math.max(6, Number(point.score || 0) * 100))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </SectionCard>

                    <SectionCard className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Subtitles className="h-4 w-4 text-[var(--workspace-brand)]" />
                        <p className="text-sm font-semibold text-[var(--text-primary)]">Active subtitles</p>
                      </div>
                      <p className="text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                        {activeSubtitleTrack?.words_json.length || 0}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {activeSubtitleTrack?.style_preset || "Nenhuma trilha de legenda ativa"}
                      </p>
                    </SectionCard>
                  </div>
                </div>
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-px bg-[var(--border)]" />

          <Panel defaultSize={22} minSize={18}>
            <div className="flex h-full flex-col border-l border-[var(--border)] bg-[var(--surface-2)]">
              <div className="border-b border-[var(--border)] px-5 py-4">
                <AppSectionLabel>Properties</AppSectionLabel>
                <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Runtime actions</h2>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
                <SectionCard className="space-y-4">
                  <div className="space-y-3">
                    <Label>Export preset</Label>
                    <Select value={exportPreset} onValueChange={setExportPreset}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPORT_PRESETS.map((preset) => (
                          <SelectItem key={preset} value={preset}>
                            {preset}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Button className="rounded-xl" onClick={() => void runSubtitleJob()} disabled={!selectedAsset}>
                      <Subtitles size={14} />
                      Generate subtitles
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={() => void runSilenceJob()}>
                      <Waves size={14} />
                      Detect silence
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={() => void runViralityJob()}>
                      <Zap size={14} />
                      Analyze virality
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={() => void runExportJob()}>
                      <Download size={14} />
                      Export preset
                    </Button>
                  </div>
                </SectionCard>

                <VideoJobStatusCard
                  title="Latest project job"
                  job={payload?.job?.job || latestProjectJob}
                  exportInfo={payload?.job?.export || exports[0] || null}
                  subtitleTrack={payload?.job?.subtitle_track || activeSubtitleTrack}
                  onRefresh={latestJobId ? refresh : undefined}
                />
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </VideoStudioShell>
  );
}
