-- Add workspace_id to messages table for multi-tenant isolation
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Index for fast per-workspace queries
CREATE INDEX IF NOT EXISTS idx_messages_workspace_id ON public.messages(workspace_id);

-- Enable RLS on messages (if not already enabled)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing open policies if any
DROP POLICY IF EXISTS "messages_all" ON public.messages;
DROP POLICY IF EXISTS "messages_workspace_isolation" ON public.messages;

-- Workspace-scoped read/write policy
CREATE POLICY "messages_workspace_isolation" ON public.messages
  USING (workspace_id IS NULL OR workspace_id IN (
    SELECT id FROM public.workspaces
  ))
  WITH CHECK (true);
