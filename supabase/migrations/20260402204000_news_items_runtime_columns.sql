-- ============================================================
-- News Items runtime columns used by edge functions and UI
-- ============================================================

ALTER TABLE public.news_items
  ADD COLUMN IF NOT EXISTS source_name TEXT,
  ADD COLUMN IF NOT EXISTS content_extracted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS news_items_content_extracted_idx
  ON public.news_items(workspace_id, content_extracted, fetched_at DESC);
