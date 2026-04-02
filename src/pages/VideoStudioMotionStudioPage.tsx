import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Suspense, lazy } from "react";
import {
  Loader2,
  RefreshCcw,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";
import { type PlayerRef } from "@remotion/player";
import { toast } from "sonner";
import AppSectionLabel from "@/components/shared/AppSectionLabel";
import EmptyState from "@/components/shared/EmptyState";
import SectionCard from "@/components/shared/SectionCard";

const MotionStudioLeftPanel = lazy(() => import("@/components/video/motion-studio/MotionStudioLeftPanel"));
const MotionStudioMiddlePanel = lazy(() => import("@/components/video/motion-studio/MotionStudioMiddlePanel"));
const MotionStudioRightPanel = lazy(() => import("@/components/video/motion-studio/MotionStudioRightPanel"));
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
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client"
import { fromTable } from "@/integrations/supabase/db-custom";
import type { Tables } from "@/integrations/supabase/types";
import { createLayerComposition, requestRemotionRender } from "@/lib/video-studio";

type VideoProjectRow = any;
type VideoAssetRow = any;
type LayerCompositionRow = any;
type VideoJobRow = any;

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
    () => (sequences as any[]).find((sequence) => sequence.id === selectedSequenceId) || sequences[0] || null,
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
          fromTable('video_projects')
            .select("*")
            .eq("workspace_id", workspace.id)
            .order("updated_at", { ascending: false })
            .limit(24),
          fromTable('video_assets')
            .select("*")
            .eq("workspace_id", workspace.id)
            .in("asset_type", ["video", "generated_video", "image", "generated_image"])
            .order("created_at", { ascending: false })
            .limit(48),
          fromTable('layer_compositions')
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
        const { data: jobRow, error: jobError } = await fromTable('video_jobs')
          .select("*")
          .eq("id", activeJobId)
          .maybeSingle();

        if (jobError) throw jobError;

        const nextJob = (jobRow || null) as VideoJobRow | null;
        setRenderJob(nextJob);

        if (nextJob?.output_asset_id) {
          const { data: assetRow, error: assetError } = await fromTable('video_assets')
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
    const { data, error } = await fromTable('layer_compositions')
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
      const { data, error } = await fromTable('video_assets')
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
          <Suspense fallback={<div className="h-[500px] animate-pulse rounded-3xl bg-[var(--surface-2)]" />}>
            <MotionStudioLeftPanel
              selectedTemplateId={selectedTemplateId}
              handleSelectTemplate={handleSelectTemplate}
              commandInput={commandInput}
              setCommandInput={setCommandInput}
              handleDraftCommand={() => void handleDraftCommand()}
              commandPending={commandPending}
              commandError={commandError}
              draftPatch={draftPatch}
              draftPatchIssues={draftPatchIssues}
              handleApplyDraftPatch={handleApplyDraftPatch}
              filteredCompositions={filteredCompositions}
              selectedCompositionId={selectedCompositionId}
              applyCompositionSnapshot={applyCompositionSnapshot}
            />
          </Suspense>

          <Suspense fallback={<div className="h-[500px] animate-pulse rounded-3xl bg-[var(--surface-2)]" />}>
            <MotionStudioMiddlePanel
              playerRef={playerRef}
              playerConfig={playerConfig}
              dirty={dirty}
              selectedTemplate={selectedTemplate}
              values={values}
              sequences={sequences}
              visualAssetMap={visualAssetMap}
              currentFrame={currentFrame}
              isPlaying={isPlaying}
              stepFrame={stepFrame}
              jumpToFrame={jumpToFrame}
              selectedSequenceId={selectedSequenceId}
              setSelectedSequenceId={setSelectedSequenceId}
              selectedSequence={selectedSequence}
            />
          </Suspense>

          <Suspense fallback={<div className="h-[500px] animate-pulse rounded-3xl bg-[var(--surface-2)]" />}>
            <MotionStudioRightPanel
              blockingIssues={blockingIssues}
              warningIssues={warningIssues}
              issues={issues}
              selectedTemplate={selectedTemplate}
              values={values}
              updateValue={updateValue}
              assetOptions={assetOptions}
              projects={projects}
              selectedProjectId={selectedProjectId}
              setSelectedProjectId={setSelectedProjectId}
              isSavingRevision={isSavingRevision}
              persistRevision={persistRevision}
              isQueueingRender={isQueueingRender}
              handleQueueRender={handleQueueRender}
              renderJob={renderJob}
              renderOutputAsset={renderOutputAsset}
              surfaceError={surfaceError}
            />
          </Suspense>
        </div>
      )}
    </VideoStudioShell>
  );
}
