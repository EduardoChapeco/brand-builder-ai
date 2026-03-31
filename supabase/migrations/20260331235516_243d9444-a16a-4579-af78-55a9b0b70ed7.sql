
-- Add missing columns discovered from build errors

-- messages needs workspace_id for workspace isolation
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- brand_characters needs is_active for filtering
ALTER TABLE public.brand_characters ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- carousel_storyboards needs post_id for linking to generated posts
ALTER TABLE public.carousel_storyboards ADD COLUMN IF NOT EXISTS post_id uuid REFERENCES public.posts_v2(id) ON DELETE SET NULL;
