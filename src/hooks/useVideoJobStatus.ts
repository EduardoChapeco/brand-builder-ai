import { useCallback, useEffect, useRef, useState } from "react";
import { getVideoJobStatus, type VideoJobStatusPayload } from "@/lib/video-studio";

/** Intervalos de polling progressivo (ms). Começa rápido, desacelera para renders longos. */
const BACKOFF_INTERVALS = [2000, 3000, 5000, 8000, 12000, 20000, 30000];
const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

export function useVideoJobStatus(jobId?: string | null, autoRefresh = true) {
  const [payload, setPayload] = useState<VideoJobStatusPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const refresh = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const response = await getVideoJobStatus({ job_id: jobId });
      setPayload(response);
      setError(null);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  // Agenda o próximo poll com backoff progressivo
  const scheduleNextPoll = useCallback((currentResponse: VideoJobStatusPayload | null) => {
    if (!autoRefresh || !jobId) return;

    const status = currentResponse?.job?.job?.status;
    if (status && TERMINAL_STATUSES.has(status)) return; // Para quando concluído

    const idx = Math.min(pollCountRef.current, BACKOFF_INTERVALS.length - 1);
    const delay = BACKOFF_INTERVALS[idx];
    pollCountRef.current += 1;

    timerRef.current = setTimeout(async () => {
      const response = await refresh();
      scheduleNextPoll(response);
    }, delay);
  }, [autoRefresh, jobId, refresh]);

  useEffect(() => {
    if (!jobId) return;
    pollCountRef.current = 0;
    clearTimer();

    // Poll inicial imediato
    void (async () => {
      const response = await refresh();
      scheduleNextPoll(response);
    })();

    return clearTimer;
  }, [jobId, refresh, scheduleNextPoll]);

  return { payload, loading, error, refresh };
}

