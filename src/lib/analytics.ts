// src/lib/analytics.ts
// Registra eventos de analytics sem bloquear a UI

export type AnalyticsEvent =
  | "page_view"
  | "block_click"
  | "lead_captured"
  | "video_played"
  | "link_clicked";

export async function trackEvent(params: {
  event: AnalyticsEvent;
  publication_id: string;
  workspace_id: string;
  block_id?: string;
  metadata?: Record<string, unknown>;
}) {
  // Usar sendBeacon para não bloquear a navegação
  const payload = JSON.stringify({
    ...params,
    timestamp: new Date().toISOString(),
    user_agent: navigator.userAgent,
    referrer: document.referrer,
  });

  // Tentar sendBeacon primeiro (não bloqueia)
  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics-beacon`,
      payload,
    );
    return;
  }

  // Fallback: fetch normal
  try {
    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics-beacon`,
      {
        method: "POST",
        body: payload,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      },
    );
  } catch {
    // Analytics não pode quebrar a experiência do usuário
    // Silenciar este erro específico é aceitável
  }
}
