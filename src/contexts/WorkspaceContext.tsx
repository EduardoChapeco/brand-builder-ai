import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Workspace {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  created_at: string;
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
  brandKit: BrandKit | null;
  briefing: Briefing | null;
  isLoading: boolean;
  refreshBrandKit: () => Promise<void>;
  refreshBriefing: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspace: null,
  brandKit: null,
  briefing: null,
  isLoading: true,
  refreshBrandKit: async () => {},
  refreshBriefing: async () => {},
});

export const useWorkspace = () => useContext(WorkspaceContext);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    try {
      const [wsRes, bkRes, brRes] = await Promise.all([
        supabase.from('workspaces').select('*').eq('id', workspaceId).single(),
        supabase.from('brand_kits').select('*').eq('workspace_id', workspaceId).maybeSingle(),
        supabase.from('briefings').select('*').eq('workspace_id', workspaceId).maybeSingle(),
      ]);

      if (wsRes.error || !wsRes.data) {
        toast.error('Workspace não encontrado');
        navigate('/workspaces');
        return;
      }
      setWorkspace(wsRes.data as Workspace);
      setBrandKit(bkRes.data as unknown as BrandKit | null);
      setBriefing(brRes.data as unknown as Briefing | null);
    } catch {
      toast.error('Erro ao carregar workspace');
    } finally {
      setIsLoading(false);
    }
  }, [navigate, workspaceId]);

  const refreshBrandKit = async () => {
    if (!workspaceId) return;
    const { data } = await supabase.from('brand_kits').select('*').eq('workspace_id', workspaceId).maybeSingle();
    setBrandKit(data as unknown as BrandKit | null);
  };

  const refreshBriefing = async () => {
    if (!workspaceId) return;
    const { data } = await supabase.from('briefings').select('*').eq('workspace_id', workspaceId).maybeSingle();
    setBriefing(data as unknown as Briefing | null);
  };

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <WorkspaceContext.Provider value={{ workspace, brandKit, briefing, isLoading, refreshBrandKit, refreshBriefing }}>
      {children}
    </WorkspaceContext.Provider>
  );
};
