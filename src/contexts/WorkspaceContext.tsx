import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fromTable } from '@/integrations/supabase/db-custom';

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  timezone: string;
  locale: string;
  created_at: string;
  updated_at: string;
}

export interface BrandKit {
  id: string;
  workspace_id: string;
  colors: {
    primary?: string;
    secondary?: string;
    accent?: string;
    bg_dark?: string;
    bg_light?: string;
    text_dark?: string;
    text_light?: string;
    custom?: Array<{ name: string; hex: string }>;
  };
  fonts: {
    heading?: string;
    body?: string;
    accent?: string;
  };
  logos: {
    primary?: string | null;
    dark?: string | null;
  };
  tone_of_voice: string | null;
  brand_name: string | null;
  updated_at: string;
  created_at: string;
  color_primary?: string;
  color_secondary?: string;
  color_accent?: string;
  color_bg_dark?: string;
  color_bg_light?: string;
  color_text_dark?: string;
  color_text_light?: string;
  custom_colors?: Array<{ name: string; hex: string }>;
  font_headline?: string;
  font_body?: string;
  font_accent?: string;
  logo_url?: string | null;
  logo_dark_url?: string | null;
}

export interface Briefing {
  id: string;
  workspace_id: string;
  title: string;
  status: 'rascunho' | 'ativo' | 'arquivado';
  completeness_score: number;
  content: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  company_name?: string | null;
  segment?: string | null;
  target_audience?: string | null;
  main_differentials?: string | null;
  tone_of_voice?: string | null;
  pain_points?: string | null;
  market_position?: string | null;
  avoid_topics?: string | null;
  content_pillars?: Array<{ name: string; percentage: number; description: string }> | unknown[];
  keywords?: string[] | null;
  instagram_handle?: string | null;
  linkedin_handle?: string | null;
  brand_dna?: string | null;
  viral_patterns_cache?: {
    recent_patterns?: Array<{
      hook_formula?: string;
      visual_style?: string;
      content_type?: string;
      emotional_trigger?: string;
    }>;
    latest_analysis?: Record<string, unknown>;
  } | null;
  last_competitor_analysis?: string | null;
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

type MembershipRow = {
  role: WorkspaceRole;
  status: 'invited' | 'active' | 'suspended';
};

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

const MISSING_SCHEMA_MESSAGE = 'O schema Simwork ainda não foi aplicado neste ambiente.';

const isMissingTableError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: string }).code === '42P01';

const isNoRowsError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: string }).code === 'PGRST116';

const notifyMissingSchema = () => {
  toast.info(MISSING_SCHEMA_MESSAGE);
};

const normalizeBrandKit = (raw: BrandKit | null): BrandKit | null => {
  if (!raw) return null;

  return {
    ...raw,
    color_primary: raw.colors?.primary,
    color_secondary: raw.colors?.secondary,
    color_accent: raw.colors?.accent,
    color_bg_dark: raw.colors?.bg_dark,
    color_bg_light: raw.colors?.bg_light,
    color_text_dark: raw.colors?.text_dark,
    color_text_light: raw.colors?.text_light,
    custom_colors: raw.colors?.custom,
    font_headline: raw.fonts?.heading,
    font_body: raw.fonts?.body,
    font_accent: raw.fonts?.accent,
    logo_url: raw.logos?.primary ?? null,
    logo_dark_url: raw.logos?.dark ?? null,
  };
};

const normalizeBriefing = (raw: Briefing | null): Briefing | null => {
  if (!raw) return null;

  return {
    ...raw,
    company_name: (raw.content?.company_name as string | null | undefined) ?? null,
    segment: (raw.content?.segment as string | null | undefined) ?? null,
    target_audience: (raw.content?.target_audience as string | null | undefined) ?? null,
    main_differentials: (raw.content?.main_differentials as string | null | undefined) ?? null,
    tone_of_voice: (raw.content?.tone_of_voice as string | null | undefined) ?? null,
    pain_points: (raw.content?.pain_points as string | null | undefined) ?? null,
    market_position: (raw.content?.market_position as string | null | undefined) ?? null,
    avoid_topics: (raw.content?.avoid_topics as string | null | undefined) ?? null,
    content_pillars: (raw.content?.content_pillars as Array<{ name: string; percentage: number; description: string }> | unknown[] | undefined) ?? [],
    keywords: (raw.content?.keywords as string[] | null | undefined) ?? null,
    instagram_handle: (raw.content?.instagram_handle as string | null | undefined) ?? null,
    linkedin_handle: (raw.content?.linkedin_handle as string | null | undefined) ?? null,
    brand_dna: (raw.content?.brand_dna as string | null | undefined) ?? null,
    viral_patterns_cache: (raw.content?.viral_patterns_cache as Briefing['viral_patterns_cache']) ?? null,
    last_competitor_analysis: (raw.content?.last_competitor_analysis as string | null | undefined) ?? null,
  };
};

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

  const fetchBrandKit = useCallback(async (currentWorkspaceId: string) => {
    const response = await fromTable('sw_brand_kits')
      .select('id,workspace_id,colors,fonts,logos,tone_of_voice,brand_name,updated_at,created_at')
      .eq('workspace_id', currentWorkspaceId)
      .maybeSingle();

    if (response.error) {
      if (isMissingTableError(response.error) || isNoRowsError(response.error)) return null;
      throw response.error;
    }

    return (response.data ?? null) as BrandKit | null;
  }, []);

  const fetchBriefing = useCallback(async (currentWorkspaceId: string) => {
    const response = await fromTable('sw_briefings')
      .select('id,workspace_id,title,status,content,created_at,updated_at')
      .eq('workspace_id', currentWorkspaceId)
      .maybeSingle();

    if (response.error) {
      if (isMissingTableError(response.error) || isNoRowsError(response.error)) return null;
      throw response.error;
    }

    const data = response.data;
    if (data) {
      return {
        ...data,
        completeness_score: (data.content as any)?.completeness_score || 0
      } as Briefing;
    }
    return null;
  }, []);

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
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        navigate('/auth/login', { replace: true });
        return;
      }

      const memberResponse = await fromTable('sw_workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberResponse.error) {
        if (isMissingTableError(memberResponse.error)) {
          notifyMissingSchema();
          setWorkspace(null);
          setBrandKit(null);
          setBriefing(null);
          setRole(null);
          return;
        }
        throw memberResponse.error;
      }

      const member = (memberResponse.data ?? null) as MembershipRow | null;
      if (!member || !member.role) {
        toast.error('Você não tem acesso a este workspace.');
        navigate('/workspaces', { replace: true });
        return;
      }

      const [workspaceResponse, brandKitData, briefingData] = await Promise.all([
        fromTable('sw_workspaces')
          .select('id,name,slug,avatar_url,settings,created_at,updated_at')
          .eq('id', workspaceId)
          .maybeSingle(),
        fetchBrandKit(workspaceId),
        fetchBriefing(workspaceId),
      ]);

      if (workspaceResponse.error) {
        if (isMissingTableError(workspaceResponse.error)) {
          notifyMissingSchema();
          setWorkspace(null);
          setBrandKit(null);
          setBriefing(null);
          setRole(null);
          return;
        }
        throw workspaceResponse.error;
      }

      if (!workspaceResponse.data) {
        toast.error('Workspace Simwork não encontrado.');
        navigate('/workspaces', { replace: true });
        return;
      }

      const wsData = workspaceResponse.data as any;
      setWorkspace({
        ...wsData,
        timezone: wsData.settings?.timezone || 'America/Sao_Paulo',
        locale: wsData.settings?.locale || 'pt-BR',
        logo_url: wsData.avatar_url,
      } as Workspace);
      setBrandKit(normalizeBrandKit(brandKitData));
      setBriefing(normalizeBriefing(briefingData));
      setRole(member.role);
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível carregar o workspace.');
      setWorkspace(null);
      setBrandKit(null);
      setBriefing(null);
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  }, [fetchBrandKit, fetchBriefing, navigate, workspaceId]);

  const refreshWorkspace = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  const refreshBrandKit = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const nextBrandKit = await fetchBrandKit(workspaceId);
      setBrandKit(normalizeBrandKit(nextBrandKit));
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível atualizar o Brand Kit.');
    }
  }, [fetchBrandKit, workspaceId]);

  const refreshBriefing = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const nextBriefing = await fetchBriefing(workspaceId);
      setBriefing(normalizeBriefing(nextBriefing));
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível atualizar o briefing.');
    }
  }, [fetchBriefing, workspaceId]);

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
