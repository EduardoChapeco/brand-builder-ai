import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  FastForward,
  Loader2,
  Pause,
  Play,
  RefreshCcw,
  Rewind,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Player, type PlayerRef } from "@remotion/player";
import { toast } from "sonner";
import AppSectionLabel from "@/components/shared/AppSectionLabel";
import EmptyState from "@/components/shared/EmptyState";
import SectionCard from "@/components/shared/SectionCard";
import SubtleBadge from "@/components/shared/SubtleBadge";
import VideoStudioRemotionComposition from "@/components/video/VideoStudioRemotionComposition";
import VideoStudioRemotionPropsPanel from "@/components/video/VideoStudioRemotionPropsPanel";
import VideoStudioRemotionTimeline from "@/components/video/VideoStudioRemotionTimeline";
import {
  MOTION_STUDIO_TEMPLATES,
  buildMotionStudioLayers,
  buildMotionStudioPrompt,
  buildMotionStudioSequences,
  createMotionStudioValues,
  draftMotionStudioCommandPatch,
  getMotionStudioPlayerConfig,
  getMotionStudioTemplate,
  parseMotionStudioLayers,
  validateMotionStudioDraft,
} from "@/components/video/VideoStudioRemotionTemplates";
import VideoStudioShell from "@/components/video/VideoStudioShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { createLayerComposition, requestRemotionRender } from "@/lib/video-studio";

type VideoProjectRow = Tables<"video_projects">;
type VideoAssetRow = Tables<"video_assets">;
type LayerCompositionRow = Tables<"layer_compositions">;
type VideoJobRow = Tables<"video_jobs">;

type AssetOption = {
  id: string;
  label: string;
  assetType: string;
  publicUrl: string | null;
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "Not available";

  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const formatRelative = (value: string | null | undefined) => {
  if (!value) return "no update yet";

  const delta = new Date(value).getTime() - Date.now();
  if (Number.isNaN(delta)) return value;

  const minutes = Math.round(delta / 60000);
  const formatter = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) return formatter.format(hours, "hour");

  const days = Math.round(hours / 24);
  return formatter.format(days, "day");
};

const getStatusBadgeClass = (status?: string | null) => {
  if (status === "completed" || status === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "failed" || status === "cancelled") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "running" || status === "queued" || status === "processing") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  return "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)]";
};

const getCommandGuardrailSummary = (errorCount: number, warningCount: number) => {
  if (errorCount > 0) return `${errorCount} blocking guardrails`;
  if (warningCount > 0) return `${warningCount} warnings`;
  return "safe to apply";
};

export default function VideoStudioMotionStudioPage() {
  const { workspace, briefing } = useWorkspace();
  const playerRef = useRef<PlayerRef>(null);

  const [projects, setProjects] = useState<VideoProjectRow[]>([]);
  const [assets, setAssets] = useState<VideoAssetRow[]>([]);
  const [compositions, setCompositions] = useState<LayerCompositionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("none");
  const [selectedTemplateId, setSelectedTemplateId] = useState(MOTION_STUDIO_TEMPLATES[0].id);
  const [values, setValues] = useState<Record<string, unknown>>(createMotionStudioValues(MOTION_STUDIO_TEMPLATES[0].id));
  const [selectedCompositionId, setSelectedCompositionId] = useState<string | null>(null);
  const [latestRenderJobId, setLatestRenderJobId] = useState<string | null>(null);
  const [renderJob, setRenderJob] = useState<VideoJobRow | null>(null);
  const [renderOutputAsset, setRenderOutputAsset] = useState<VideoAssetRow | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);
  const [commandInput, setCommandInput] = useState("");
  const [commandPending, setCommandPending] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [draftPatch, setDraftPatch] = useState<ReturnType<typeof draftMotionStudioCommandPatch> | null>(null);
  const [surfaceError, setSurfaceError] = useState<string | null>(null);
  const [isSavingRevision, setIsSavingRevision] = useState(false);
  const [isQueueingRender, setIsQueueingRender] = useState(false);
  const [dirty, setDirty] = useState(false);

  const selectedTemplate = useMemo(
    () => getMotionStudioTemplate(selectedTemplateId),
    [selectedTemplateId],
  );

  const assetOptions = useMemo<AssetOption[]>(
    () =>
      assets.map((asset) => ({
        id: asset.id,
        label: asset.file_name || asset.id,
        assetType: asset.asset_type,
        publicUrl: asset.public_url,
      })),
    [assets],
  );

  const visualAssetMap = useMemo(
    () =>
      assetOptions.reduce<Record<string, AssetOption>>((accumulator, asset) => {
        accumulator[asset.id] = asset;
        return accumulator;
      }, {}),
    [assetOptions],
  );

  const playerConfig = useMemo(
    () => getMotionStudioPlayerConfig(selectedTemplateId, values),
    [selectedTemplateId, values],
  );

  const sequences = useMemo(
    () => buildMotionStudioSequences(selectedTemplateId, values),
    [selectedTemplateId, values],
  );

  const issues = useMemo(
    () => validateMotionStudioDraft(selectedTemplateId, values),
    [selectedTemplateId, values],
  );

  const draftPatchIssues = useMemo(
    () => (draftPatch ? validateMotionStudioDraft(selectedTemplateId, draftPatch.nextValues) : []),
    [draftPatch, selectedTemplateId],
  );

  const blockingIssues = issues.filter((issue) => issue.level === "error");
  const warningIssues = issues.filter((issue) => issue.level === "warning");

  const selectedSequence = useMemo(
    () => sequences.find((sequence) => sequence.id === selectedSequenceId) || sequences[0] || null,
    [selectedSequenceId, sequences],
  );

  const filteredCompositions = useMemo(
    () =>
      selectedProjectId === "none"
        ? compositions
        : compositions.filter((composition) => composition.video_project_id === selectedProjectId),
    [compositions, selectedProjectId],
  );

  const selectedComposition = useMemo(
    () => compositions.find((composition) => composition.id === selectedCompositionId) || null,
    [compositions, selectedCompositionId],
  );

  const applyCompositionSnapshot = useCallback((composition: LayerCompositionRow) => {
    const parsed = parseMotionStudioLayers(composition.layers);

    if (parsed) {
      setSelectedTemplateId(parsed.templateId);
      setValues(parsed.values);
      setSelectedSequenceId(parsed.sequences[0]?.id || null);
    }

    setSelectedCompositionId(composition.id);
    setSelectedProjectId(composition.video_project_id || "none");
    setLatestRenderJobId(composition.latest_job_id);
    setDraftPatch(null);
    setCommandError(null);
    setDirty(false);
  }, []);

  const loadWorkspaceVideoData = useCallback(
    async (showSpinner = true) => {
      if (!workspace?.id) return;

      if (showSpinner) setLoading(true);
      setSurfaceError(null);

      try {
        const [projectsResult, assetsResult, compositionsResult] = await Promise.all([
          supabase
            .from("video_projects")
            .select("*")
            .eq("workspace_id", workspace.id)
            .order("updated_at", { ascending: false })
            .limit(24),
          supabase
            .from("video_assets")
            .select("*")
            .eq("workspace_id", workspace.id)
            .in("asset_type", ["video", "generated_video", "image", "generated_image"])
            .order("created_at", { ascending: false })
            .limit(48),
          supabase
            .from("layer_compositions")
            .select("*")
            .eq("workspace_id", workspace.id)
            .order("created_at", { ascending: false })
            .limit(18),
        ]);

        if (projectsResult.error) throw projectsResult.error;
        if (assetsResult.error) throw assetsResult.error;
        if (compositionsResult.error) throw compositionsResult.error;

        const nextProjects = (projectsResult.data || []) as VideoProjectRow[];
        const nextAssets = (assetsResult.data || []) as VideoAssetRow[];
        const nextCompositions = (compositionsResult.data || []) as LayerCompositionRow[];

        setProjects(nextProjects);
        setAssets(nextAssets);
        setCompositions(nextCompositions);

        if (!dirty) {
          const selectedComposition = selectedCompositionId
            ? nextCompositions.find((composition) => composition.id === selectedCompositionId)
            : null;

          if (selectedComposition) {
            setLatestRenderJobId(selectedComposition.latest_job_id);
          } else if (nextCompositions.length === 0) {
            setSelectedCompositionId(null);
            setLatestRenderJobId(null);
          } else if (nextCompositions[0]) {
            applyCompositionSnapshot(nextCompositions[0]);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setSurfaceError(message);
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [applyCompositionSnapshot, dirty, selectedCompositionId, workspace?.id],
  );

  const loadRenderJob = useCallback(
    async (jobId?: string | null) => {
      const activeJobId = jobId || latestRenderJobId;
      if (!workspace?.id || !activeJobId) {
        setRenderJob(null);
        setRenderOutputAsset(null);
        return;
      }

      try {
        const { data: jobRow, error: jobError } = await supabase
          .from("video_jobs")
          .select("*")
          .eq("id", activeJobId)
          .maybeSingle();

        if (jobError) throw jobError;

        const nextJob = (jobRow || null) as VideoJobRow | null;
        setRenderJob(nextJob);

        if (nextJob?.output_asset_id) {
          const { data: assetRow, error: assetError } = await supabase
            .from("video_assets")
            .select("*")
            .eq("id", nextJob.output_asset_id)
            .maybeSingle();

          if (assetError) throw assetError;
          setRenderOutputAsset((assetRow || null) as VideoAssetRow | null);
        } else {
          setRenderOutputAsset(null);
        }
      } catch (error) {
        setSurfaceError(error instanceof Error ? error.message : String(error));
      }
    },
    [latestRenderJobId, workspace?.id],
  );

  const fetchCompositionById = useCallback(async (compositionId: string) => {
    const { data, error } = await supabase
      .from("layer_compositions")
      .select("*")
      .eq("id", compositionId)
      .maybeSingle();

    if (error) throw error;
    return (data || null) as LayerCompositionRow | null;
  }, []);

  useEffect(() => {
    void loadWorkspaceVideoData();
  }, [loadWorkspaceVideoData]);

  useEffect(() => {
    if (!selectedSequenceId && sequences[0]) {
      setSelectedSequenceId(sequences[0].id);
      return;
    }

    if (selectedSequenceId && !sequences.some((sequence) => sequence.id === selectedSequenceId)) {
      setSelectedSequenceId(sequences[0]?.id || null);
    }
  }, [selectedSequenceId, sequences]);

  useEffect(() => {
    if (!latestRenderJobId) {
      setRenderJob(null);
      setRenderOutputAsset(null);
      return;
    }

    void loadRenderJob(latestRenderJobId);
  }, [latestRenderJobId, loadRenderJob]);

  useEffect(() => {
    if (!latestRenderJobId || !renderJob || !["queued", "running", "processing"].includes(renderJob.status)) return;

    const timer = window.setInterval(() => {
      void loadRenderJob(latestRenderJobId);
      void loadWorkspaceVideoData(false);
    }, 4000);

    return () => window.clearInterval(timer);
  }, [latestRenderJobId, loadRenderJob, loadWorkspaceVideoData, renderJob]);

  useEffect(() => {
    if (!latestRenderJobId || !renderJob || !["completed", "failed", "cancelled"].includes(renderJob.status)) return;
    void loadWorkspaceVideoData(false);
  }, [latestRenderJobId, loadWorkspaceVideoData, renderJob]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const handleFrameUpdate = ({ detail }: { detail: { frame: number } }) => {
      setCurrentFrame(detail.frame);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    player.addEventListener("frameupdate", handleFrameUpdate);
    player.addEventListener("play", handlePlay);
    player.addEventListener("pause", handlePause);
    player.addEventListener("ended", handleEnded);
    return () => {
      player.removeEventListener("frameupdate", handleFrameUpdate);
      player.removeEventListener("play", handlePlay);
      player.removeEventListener("pause", handlePause);
      player.removeEventListener("ended", handleEnded);
    };
  }, [playerConfig.durationInFrames, selectedTemplateId]);

  useEffect(() => {
    if (renderOutputAsset || !selectedComposition?.final_asset_id) return;

    const loadSelectedCompositionAsset = async () => {
      const { data, error } = await supabase
        .from("video_assets")
        .select("*")
        .eq("id", selectedComposition.final_asset_id as string)
        .maybeSingle();

      if (!error) {
        setRenderOutputAsset((data || null) as VideoAssetRow | null);
      }
    };

    void loadSelectedCompositionAsset();
  }, [renderOutputAsset, selectedComposition?.final_asset_id]);

  const updateValue = (fieldId: string, nextValue: unknown) => {
    setValues((current) => ({ ...current, [fieldId]: nextValue }));
    setDirty(true);
    setDraftPatch(null);
    setCommandError(null);
  };

  const handleSelectTemplate = (templateId: string) => {
    const nextTemplate = getMotionStudioTemplate(templateId);
    const nextValues = createMotionStudioValues(templateId);
    const currentRatio = typeof values.ratio === "string" ? values.ratio : "";
    if (nextTemplate.supportedRatios.includes(currentRatio as never)) {
      nextValues.ratio = currentRatio;
    }
    if (typeof values.backgroundAssetId === "string") {
      nextValues.backgroundAssetId = values.backgroundAssetId;
    }

    setSelectedTemplateId(templateId);
    setValues(nextValues);
    setSelectedCompositionId(null);
    setLatestRenderJobId(null);
    setRenderJob(null);
    setRenderOutputAsset(null);
    setDirty(true);
    setDraftPatch(null);
    setCommandError(null);
  };

  const persistRevision = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!workspace?.id) throw new Error("Workspace is required.");
      if (blockingIssues.length > 0) throw new Error("Resolve blocking guardrails before saving.");

      setIsSavingRevision(true);
      setSurfaceError(null);

      try {
        const result = await createLayerComposition({
          workspace_id: workspace.id,
          project_id: selectedProjectId === "none" ? null : selectedProjectId,
          prompt_original: buildMotionStudioPrompt(selectedTemplateId, values),
          layers: buildMotionStudioLayers(selectedTemplateId, values),
          canvas_width: playerConfig.width,
          canvas_height: playerConfig.height,
          run_now: false,
        });

        const composition = await fetchCompositionById(result.composition_id);
        if (!composition) {
          throw new Error("The layer composition was created but could not be reloaded.");
        }

        setCompositions((current) => [composition, ...current.filter((item) => item.id !== composition.id)]);
        applyCompositionSnapshot(composition);
        if (!options?.silent) {
          toast.success("Composition revision saved to the canonical layer-composition flow.");
        }
        return composition;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setSurfaceError(message);
        throw error;
      } finally {
        setIsSavingRevision(false);
      }
    },
    [
      applyCompositionSnapshot,
      blockingIssues.length,
      fetchCompositionById,
      playerConfig.height,
      playerConfig.width,
      selectedProjectId,
      selectedTemplateId,
      values,
      workspace?.id,
    ],
  );

  const handleQueueRender = async () => {
    if (!workspace?.id) return;
    if (blockingIssues.length > 0) {
      toast.error("Resolve blocking guardrails before rendering.");
      return;
    }

    setIsQueueingRender(true);
    setSurfaceError(null);

    try {
      const activeComposition =
        (dirty || !selectedCompositionId)
          ? await persistRevision({ silent: true })
          : compositions.find((composition) => composition.id === selectedCompositionId) ||
            (await fetchCompositionById(selectedCompositionId));

      if (!activeComposition) {
        throw new Error("No composition revision is available for render.");
      }

      const result = await requestRemotionRender({
        workspace_id: workspace.id,
        project_id: activeComposition.video_project_id,
        composition_id: activeComposition.id,
        props: {
          template_id: selectedTemplateId,
          template_label: selectedTemplate.label,
          values,
          sequences,
          ratio: playerConfig.ratio,
          duration_in_frames: playerConfig.durationInFrames,
          fps: playerConfig.fps,
        },
      });

      setLatestRenderJobId(result.job_id);
      if (result.status === "queued") {
        toast.success("Render queued in the canonical remotion job flow.");
      } else {
        toast.error(result.dispatch_error || "The render request reached the backend but was not queued.");
      }

      await loadRenderJob(result.job_id);
      await loadWorkspaceVideoData(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSurfaceError(message);
      toast.error(message);
    } finally {
      setIsQueueingRender(false);
    }
  };

  const handleDraftCommand = async () => {
    if (!commandInput.trim()) {
      setCommandError("Describe the edit request first.");
      return;
    }

    setCommandPending(true);
    setDraftPatch(null);
    setCommandError(null);

    await new Promise((resolve) => window.setTimeout(resolve, 220));

    const nextPatch = draftMotionStudioCommandPatch(selectedTemplateId, values, commandInput);
    if (!nextPatch) {
      setCommandError("The current frontend interpreter could not map this request to a safe patch.");
    } else {
      setDraftPatch(nextPatch);
    }

    setCommandPending(false);
  };

  const handleApplyDraftPatch = () => {
    if (!draftPatch) return;
    setValues(draftPatch.nextValues);
    setDirty(true);
    setDraftPatch(null);
    setCommandError(null);
    toast.success("Patch applied to the live preview.");
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadWorkspaceVideoData(false), loadRenderJob()]);
    setRefreshing(false);
  };

  const jumpToFrame = (frame: number) => {
    playerRef.current?.seekTo(frame);
    setCurrentFrame(frame);
  };

  const stepFrame = (delta: number) => {
    const frame = Math.max(0, Math.min(playerConfig.durationInFrames - 1, currentFrame + delta));
    jumpToFrame(frame);
  };

  if (!workspace) {
    return (
      <VideoStudioShell
        title="Motion Studio"
        description="Remotion-facing surface for sequence previews, guarded props and canonical video renders."
      >
        <SectionCard>
          <EmptyState
            title="Workspace required"
            description="Open Motion Studio from inside a workspace to load assets, projects and saved compositions."
            icon={Wand2}
          />
        </SectionCard>
      </VideoStudioShell>
    );
  }

  return (
    <VideoStudioShell
      title="Motion Studio"
      description={`Build guarded Remotion sequences for ${briefing?.company_name || workspace.name}, preview them locally and queue canonical renders without leaving Video Studio.`}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => void handleRefresh()} disabled={refreshing}>
            {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
            Refresh
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={() => void persistRevision()} disabled={isSavingRevision || blockingIssues.length > 0}>
            {isSavingRevision ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save revision
          </Button>
          <Button className="rounded-xl" onClick={() => void handleQueueRender()} disabled={isQueueingRender || blockingIssues.length > 0}>
            {isQueueingRender ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Queue render
          </Button>
        </div>
      }
    >
      {loading ? (
        <SectionCard className="space-y-4">
          <AppSectionLabel>Motion Studio</AppSectionLabel>
          <p className="text-sm text-[var(--text-secondary)]">Loading projects, assets and composition history...</p>
        </SectionCard>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[320px,minmax(0,1fr),360px]">
          <div className="space-y-6">
            <SectionCard className="space-y-4">
              <div>
                <AppSectionLabel>Template + Guardrails</AppSectionLabel>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  Start from a real motion template
                </h2>
              </div>

              <div className="space-y-3">
                {MOTION_STUDIO_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelectTemplate(template.id)}
                    className={
                      template.id === selectedTemplateId
                        ? "w-full rounded-2xl border border-[var(--workspace-brand-border)] bg-[var(--workspace-brand-soft)] p-4 text-left"
                        : "w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-left transition-colors hover:border-[var(--border-strong)]"
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-[var(--text-primary)]">{template.label}</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{template.description}</p>
                      </div>
                      <SubtleBadge variant="outline">{template.supportedRatios.join(" / ")}</SubtleBadge>
                    </div>
                  </button>
                ))}
              </div>
            </SectionCard>

            <SectionCard className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <AppSectionLabel>Edit command</AppSectionLabel>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                    Guardrailed patch drafting
                  </h2>
                </div>
                <SubtleBadge variant="outline">frontend-only</SubtleBadge>
              </div>

              <Textarea
                value={commandInput}
                onChange={(event) => setCommandInput(event.target.value)}
                placeholder='Examples: "faster 9:16", "headline: Stronger opening", "cta: Book now", "hook +12"'
                className="min-h-[120px] rounded-2xl"
              />

              <Button className="w-full rounded-xl" onClick={() => void handleDraftCommand()} disabled={commandPending}>
                {commandPending ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                Draft patch
              </Button>

              {commandError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {commandError}
                </div>
              ) : null}

              {draftPatch ? (
                <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{draftPatch.summary}</p>
                    <SubtleBadge variant="outline">
                      {getCommandGuardrailSummary(
                        draftPatchIssues.filter((issue) => issue.level === "error").length,
                        draftPatchIssues.filter((issue) => issue.level === "warning").length,
                      )}
                    </SubtleBadge>
                  </div>

                  <ul className="space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {draftPatch.changes.map((change) => (
                      <li key={change}>{change}</li>
                    ))}
                  </ul>

                  {draftPatchIssues.length > 0 ? (
                    <div className="space-y-2">
                      {draftPatchIssues.map((issue) => (
                        <p
                          key={`${issue.level}-${issue.message}`}
                          className={
                            issue.level === "error"
                              ? "text-xs leading-5 text-rose-700"
                              : "text-xs leading-5 text-amber-700"
                          }
                        >
                          {issue.message}
                        </p>
                      ))}
                    </div>
                  ) : null}

                  <Button
                    className="w-full rounded-xl"
                    onClick={handleApplyDraftPatch}
                    disabled={draftPatchIssues.some((issue) => issue.level === "error")}
                  >
                    Apply patch to preview
                    <ArrowRight size={14} />
                  </Button>
                </div>
              ) : null}
            </SectionCard>

            <SectionCard className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <AppSectionLabel>Saved revisions</AppSectionLabel>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                    Layer compositions
                  </h2>
                </div>
                <SubtleBadge variant="outline">{filteredCompositions.length}</SubtleBadge>
              </div>

              {filteredCompositions.length === 0 ? (
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                  No layer composition has been saved yet for this scope.
                </p>
              ) : (
                <ScrollArea className="h-[360px]">
                  <div className="space-y-3">
                    {filteredCompositions.map((composition) => {
                      const parsed = parseMotionStudioLayers(composition.layers);
                      const isSelected = composition.id === selectedCompositionId;

                      return (
                        <button
                          key={composition.id}
                          type="button"
                          onClick={() => applyCompositionSnapshot(composition)}
                          className={
                            isSelected
                              ? "w-full rounded-2xl border border-[var(--workspace-brand-border)] bg-[var(--workspace-brand-soft)] p-4 text-left"
                              : "w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-left transition-colors hover:border-[var(--border-strong)]"
                          }
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">
                              {parsed?.templateId ? getMotionStudioTemplate(parsed.templateId).label : "Unknown template"}
                            </p>
                            <SubtleBadge className={getStatusBadgeClass(composition.status)}>{composition.status}</SubtleBadge>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                            {parsed?.promptOriginal || composition.prompt_original}
                          </p>
                          <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                            Updated {formatRelative(composition.updated_at)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <AppSectionLabel>Remotion preview</AppSectionLabel>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                    Live guarded composition
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    Local preview is driven by the selected template, current props and saved asset references.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <SubtleBadge variant="outline">{playerConfig.ratio}</SubtleBadge>
                  <SubtleBadge variant="outline">{playerConfig.fps} fps</SubtleBadge>
                  <SubtleBadge variant={dirty ? "brand" : "outline"}>{dirty ? "Unsaved changes" : "Synced revision"}</SubtleBadge>
                </div>
              </div>

              <div className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[#050505]">
                <Player
                  ref={playerRef}
                  component={VideoStudioRemotionComposition}
                  durationInFrames={playerConfig.durationInFrames}
                  compositionWidth={playerConfig.width}
                  compositionHeight={playerConfig.height}
                  fps={playerConfig.fps}
                  inputProps={{
                    templateLabel: selectedTemplate.label,
                    values,
                    sequences,
                    assets: visualAssetMap,
                  }}
                  controls
                  acknowledgeRemotionLicense
                  className="w-full"
                  style={{ width: "100%", aspectRatio: `${playerConfig.width}/${playerConfig.height}` }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => playerRef.current?.pauseAndReturnToPlayStart()}>
                  <RefreshCcw size={14} />
                  Restart
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => stepFrame(-15)}>
                  <Rewind size={14} />
                  -15f
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => playerRef.current?.toggle()}>
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  Toggle
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => stepFrame(15)}>
                  <FastForward size={14} />
                  +15f
                </Button>
                {selectedSequence ? (
                  <Button variant="outline" className="rounded-xl" onClick={() => jumpToFrame(selectedSequence.startFrame)}>
                    Jump to selected
                  </Button>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard>
              <VideoStudioRemotionTimeline
                sequences={sequences}
                totalFrames={playerConfig.durationInFrames}
                currentFrame={currentFrame}
                selectedSequenceId={selectedSequenceId}
                onSelectSequence={setSelectedSequenceId}
                onJumpToFrame={jumpToFrame}
              />
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <AppSectionLabel>Guardrails</AppSectionLabel>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                    Template policy
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <SubtleBadge className={blockingIssues.length > 0 ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>
                    {blockingIssues.length > 0 ? `${blockingIssues.length} blocking` : "render-ready"}
                  </SubtleBadge>
                  {warningIssues.length > 0 ? (
                    <SubtleBadge className="border-amber-200 bg-amber-50 text-amber-700">{warningIssues.length} warnings</SubtleBadge>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
                {selectedTemplate.guardrailNotes.map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </div>

              {issues.length > 0 ? (
                <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  {issues.map((issue) => (
                    <p
                      key={`${issue.level}-${issue.message}`}
                      className={
                        issue.level === "error"
                          ? "text-sm leading-6 text-rose-700"
                          : "text-sm leading-6 text-amber-700"
                      }
                    >
                      {issue.message}
                    </p>
                  ))}
                </div>
              ) : null}
            </SectionCard>

            <SectionCard className="overflow-hidden p-0">
              <div className="border-b border-[var(--border)] px-6 py-5">
                <AppSectionLabel>Dynamic props</AppSectionLabel>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                  Template controls
                </h2>
              </div>
              <ScrollArea className="h-[640px]">
                <div className="p-6">
                  <VideoStudioRemotionPropsPanel
                    template={selectedTemplate}
                    values={values}
                    issues={issues}
                    assets={assetOptions}
                    onChange={updateValue}
                  />
                </div>
              </ScrollArea>
            </SectionCard>

            <SectionCard className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <AppSectionLabel>Canonical render</AppSectionLabel>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                    Save, queue and observe
                  </h2>
                </div>
                <SubtleBadge variant="outline">layer-compositor + remotion-render</SubtleBadge>
              </div>

              <div className="space-y-3">
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                  Each save creates a new `layer_composition` revision. Render always targets a saved revision and reuses the existing job flow.
                </p>

                <div className="space-y-2">
                  <AppSectionLabel>Project binding</AppSectionLabel>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project binding</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => void persistRevision()} disabled={isSavingRevision || blockingIssues.length > 0}>
                  {isSavingRevision ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save revision
                </Button>
                <Button className="rounded-xl" onClick={() => void handleQueueRender()} disabled={isQueueingRender || blockingIssues.length > 0}>
                  {isQueueingRender ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Queue Remotion render
                </Button>
              </div>

              {renderJob ? (
                <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{renderJob.job_type}</p>
                    <SubtleBadge className={getStatusBadgeClass(renderJob.status)}>{renderJob.status}</SubtleBadge>
                  </div>
                  <div className="grid gap-2 text-sm text-[var(--text-secondary)]">
                    <p>Job id: {renderJob.id}</p>
                    <p>Started: {formatDateTime(renderJob.started_at)}</p>
                    <p>Updated: {formatRelative(renderJob.updated_at)}</p>
                    <p>Provider: {renderJob.provider_name || "video-runtime"}</p>
                  </div>
                  {renderJob.error_message ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {renderJob.error_message}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
                  No render job queued from this surface yet.
                </div>
              )}

              {renderOutputAsset?.public_url ? (
                <div className="space-y-3">
                  <AppSectionLabel>Latest output asset</AppSectionLabel>
                  <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-black">
                    {renderOutputAsset.asset_type.includes("video") ? (
                      <video src={renderOutputAsset.public_url} controls className="h-full w-full object-cover" />
                    ) : (
                      <img src={renderOutputAsset.public_url} alt={renderOutputAsset.file_name || "Render output"} className="h-full w-full object-cover" />
                    )}
                  </div>
                </div>
              ) : null}
            </SectionCard>

            {surfaceError ? (
              <SectionCard className="border-amber-200 bg-amber-50/80">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200 bg-white text-amber-700">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <AppSectionLabel>Surface status</AppSectionLabel>
                    <p className="mt-2 text-sm leading-7 text-amber-900">{surfaceError}</p>
                  </div>
                </div>
              </SectionCard>
            ) : null}
          </div>
        </div>
      )}
    </VideoStudioShell>
  );
}
