import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "biolink:session-id";
const VISITOR_KEY = "biolink:visitor-id";

const getOrCreateId = (key: string) => {
  const current = window.localStorage.getItem(key);
  if (current) return current;
  const next = crypto.randomUUID();
  window.localStorage.setItem(key, next);
  return next;
};

export const getBioLinkTrackingIds = () => ({
  sessionId: getOrCreateId(SESSION_KEY),
  visitorId: getOrCreateId(VISITOR_KEY),
});

const inferDeviceType = () => {
  const width = window.innerWidth;
  if (width <= 768) return "mobile";
  if (width <= 1024) return "tablet";
  return "desktop";
};

export const captureUtmParams = () => {
  const search = new URLSearchParams(window.location.search);
  return {
    utm_source: search.get("utm_source"),
    utm_medium: search.get("utm_medium"),
    utm_campaign: search.get("utm_campaign"),
  };
};

export const trackBioLinkEvent = async (payload: {
  slug: string;
  eventType: string;
  blockId?: string | null;
  blockType?: string | null;
  targetUrl?: string | null;
  metadata?: Record<string, unknown>;
}) => {
  const { sessionId, visitorId } = getBioLinkTrackingIds();
  const utm = captureUtmParams();

  try {
    await supabase.functions.invoke("biolink-track", {
      body: {
        slug: payload.slug,
        event_type: payload.eventType,
        block_id: payload.blockId || null,
        block_type: payload.blockType || null,
        target_url: payload.targetUrl || null,
        session_id: sessionId,
        visitor_id: visitorId,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        device_type: inferDeviceType(),
        metadata: payload.metadata || {},
        ...utm,
      },
    });
  } catch (error) {
    console.warn("Bio Link tracking failed", error);
  }
};

export const submitBioLinkCapture = async (payload: {
  slug: string;
  captureType: "newsletter" | "contact_form" | "booking" | "event_registration" | "download";
  blockId?: string | null;
  blockType?: string | null;
  data: Record<string, unknown>;
}) => {
  const { sessionId, visitorId } = getBioLinkTrackingIds();
  const { data, error } = await supabase.functions.invoke("biolink-capture", {
    body: {
      slug: payload.slug,
      capture_type: payload.captureType,
      block_id: payload.blockId || null,
      block_type: payload.blockType || null,
      session_id: sessionId,
      visitor_id: visitorId,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
      device_type: inferDeviceType(),
      payload: payload.data,
    },
  });
  if (error) throw error;
  return data;
};
