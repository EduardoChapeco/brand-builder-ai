import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/integrations/supabase/db-custom';

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface Workspace {
  id: string;
  name: string;
  slug: string | null;
  plan: string | null;
  logo_url: string | null;
  timezone: string | null;
  locale: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface BrandKit {
  id: string;
  workspace_id: string;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  color_bg_dark: string;
  color_bg_light: string;
  color_text_dark: string;
  color_text_light: string;
  custom_colors: Array<{ name: string; hex: string }>;
  font_headline: string;
  font_body: string;
  font_accent: string;
  logo_url: string | null;
  logo_dark_url: string | null;
  watermark_text: string | null;
}

export interface Briefing {
  id: string;
  workspace_id: string;
  company_name: string | null;
  segment: string | null;
  target_audience: string | null;
  main_differentials: string | null;
  tone_of_voice: string | null;
  pain_points: string | null;
  market_position: string | null;
  avoid_topics: string | null;
  main_competitors: Array<{ name: string; url: string; notes: string }>;
  content_pillars: Array<{ name: string; percentage: number; description: string }>;
  keywords: string[] | null;
  instagram_handle: string | null;
  linkedin_handle: string | null;
  brand_dna: string | null;
  viral_patterns_cache: {
    recent_patterns?: Array<{
      hook_formula?: string;
      visual_style?: string;
      content_type?: string;
      emotional_trigger?: string;
    }>;
    latest_analysis?: Record<string, unknown>;
  } | null;
  last_competitor_analysis: string | null;
}

interface WorkspaceContextValue {
  workspace: Workspace | null;
  workspaceId: string | null;
  brandKit: BrandKit | null;
  briefing: Briefing | null;
  role: WorkspaceRole | null;
  isLoading: boolean;
  canEdit: boolean;
  canAdmin: boolean;
  canView: boolean;
  refreshWorkspace: () => Promise<void>;
  refreshBrandKit: () => Promise<void>;
  refreshBriefing: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspace: null,
  workspaceId: null,
  brandKit: null,
  briefing: null,
  role: null,
  isLoading: true,
  canEdit: false,
  canAdmin: false,
  canView: false,
  refreshWorkspace: async () => {},
  refreshBrandKit: async () => {},
  refreshBriefing: async () => {},
});

const BRAND_KIT_SELECT =
  'id,workspace_id,color_primary,color_secondary,color_accent,color_bg_dark,color_bg_light,color_text_dark,color_text_light,custom_colors,font_headline,font_body,font_accent,logo_url,logo_dark_url,watermark_text';

const BRIEFING_SELECT =
  'id,workspace_id,company_name,segment,target_audience,main_differentials,tone_of_voice,pain_points,market_position,avoid_topics,main_competitors,content_pillars,keywords,instagram_handle,linkedin_handle,brand_dna,viral_patterns_cache,last_competitor_analysis';

export const useWorkspace = () => useContext(WorkspaceContext);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { workspaceId: workspaceIdFromRoute, wsId } = useParams<{ workspaceId?: string; wsId?: string }>();
  const workspaceId = workspaceIdFromRoute || wsId || null;
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [role, setRole] = useState<WorkspaceRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!workspaceId) {
      setWorkspace(null);
      setBrandKit(null);
      setBriefing(null);
      setRole(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      /* 
      // DEV BYPASS: Sem login por enquanto, comentado a pedidos
      if (!user) {
        navigate('/auth/login');
        return;
      }

      const memberRes = await db.workspaceMembers()
        .select('role,status')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .maybeSingle();

      const member = memberRes?.data as { role?: WorkspaceRole; status?: string } | null;
      if (!member || member.status !== 'active' || !member.role) {
        toast.error('Voce nao tem acesso a este workspace');
        navigate('/workspaces');
        return;
      }
      */
      
      // Assume "owner" temporarily when bypassing auth
      const bypassedRole: WorkspaceRole = 'owner';

      const [wsRes, bkRes, brRes] = await Promise.all([
        supabase
          .from('workspaces')
          // Select only columns in the auto-generated types; extended columns added by
          // schema_sync migration will be present at runtime even if not yet in types.ts
          .select('id,name,slug,logo_url,created_at')
          .eq('id', workspaceId)
          .single(),
        supabase.from('brand_kits').select(BRAND_KIT_SELECT).eq('workspace_id', workspaceId).maybeSingle(),
        supabase.from('briefings').select(BRIEFING_SELECT).eq('workspace_id', workspaceId).maybeSingle(),
      ]);

      if (wsRes.error || !wsRes.data) {
        toast.error('Workspace nao encontrado');
        navigate('/workspaces');
        return;
      }

      setWorkspace(wsRes.data as unknown as Workspace);
      setBrandKit(bkRes.data as unknown as BrandKit | null);
      setBriefing(brRes.data as unknown as Briefing | null);
      setRole(bypassedRole);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar workspace');
    } finally {
      setIsLoading(false);
    }
  }, [navigate, workspaceId]);

  const refreshWorkspace = async () => {
    await fetchAll();
  };

  const refreshBrandKit = async () => {
    if (!workspaceId) return;
    const { data } = await supabase.from('brand_kits').select(BRAND_KIT_SELECT).eq('workspace_id', workspaceId).maybeSingle();
    setBrandKit(data as unknown as BrandKit | null);
  };

  const refreshBriefing = async () => {
    if (!workspaceId) return;
    const { data } = await supabase.from('briefings').select(BRIEFING_SELECT).eq('workspace_id', workspaceId).maybeSingle();
    setBriefing(data as unknown as Briefing | null);
  };

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const canView = role !== null;
  const canEdit = role === 'owner' || role === 'admin' || role === 'editor';
  const canAdmin = role === 'owner' || role === 'admin';

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        workspaceId,
        brandKit,
        briefing,
        role,
        isLoading,
        canEdit,
        canAdmin,
        canView,
        refreshWorkspace,
        refreshBrandKit,
        refreshBriefing,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};
