
ALTER TABLE public.viral_analyses ADD COLUMN IF NOT EXISTS patterns_extracted jsonb;
ALTER TABLE public.viral_analyses ADD COLUMN IF NOT EXISTS analyzed_at timestamptz DEFAULT now();
