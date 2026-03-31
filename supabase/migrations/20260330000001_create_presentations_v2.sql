CREATE TABLE IF NOT EXISTS presentations_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title text,
  format text DEFAULT '16:9',
  slide_configs jsonb DEFAULT '[]',
  slides_html text[] DEFAULT '{}',
  slides_count int DEFAULT 0,
  theme_id text,
  status text DEFAULT 'draft',
  generation_meta jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE presentations_v2 ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'presentations_v2' AND policyname = 'Allow all for presentations_v2'
  ) THEN
    CREATE POLICY "Allow all for presentations_v2"
      ON presentations_v2
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
