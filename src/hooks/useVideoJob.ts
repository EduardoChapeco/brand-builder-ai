// src/hooks/useVideoJob.ts
// Gerencia o estado de renderização de um vídeo

import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { logError } from "../lib/error-logger";

export function useVideoJob(contentId: string | null) {
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null,
  );

  useEffect(() => {
    if (!contentId) return;

    // Subscrição em tempo real no job de vídeo
    subscriptionRef.current = supabase
      .channel(`video-job-${contentId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "content_items",
          filter: `id=eq.${contentId}`,
        },
        (payload) => {
          const videoJob = payload.new.video_job as Record<string, unknown>;
          setJobStatus(videoJob.status as string);
          if (videoJob.render_url) {
            setRenderUrl(videoJob.render_url as string);
          }
          if (videoJob.status === "failed") {
            logError({
              code: "ERR_VIDEO_RENDER_001",
              module: "video",
              message: "Renderização do vídeo falhou",
              detail: { contentId, error: videoJob.error },
            });
          }
        },
      )
      .subscribe();

    // CRÍTICO: cleanup para evitar memory leak
    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [contentId]);

  return { jobStatus, renderUrl };
}
