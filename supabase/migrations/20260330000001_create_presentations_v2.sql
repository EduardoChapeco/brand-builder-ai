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

CREATE POLICY "workspace_member_access" ON presentations_v2
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE user_id = auth.uid()
  ));
