import type { MCPTool } from '../types';

type UntypedPostsQuery = {
  from: (table: string) => {
    select: (query: string) => {
      eq: (column: string, value: string) => {
        order: (column: string, options: { ascending: boolean }) => {
          limit: (value: number) => Promise<{ data: unknown[] | null }>;
        };
      };
    };
  };
};

const xmlEscape = (value: string | null | undefined) =>
  value
    ? value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
    : '';

export const ccpTools: MCPTool[] = [
  {
    name: 'ccp_get_snapshot',
    module: 'ccp',
    description:
      'Retorna o snapshot completo do contexto da marca em XML compacto. Use antes de qualquer geracao de conteudo ou interface contextualizada.',
    inputSchema: {},
    handler: async ({ _workspaceId, _supabase }) => {
      const [briefingResult, brandKitResult] = await Promise.all([
        _supabase
          .from('briefings')
          .select('company_name,segment,tone_of_voice,target_audience,main_differentials,content_pillars,keywords,brand_dna,completeness_score')
          .eq('workspace_id', _workspaceId)
          .maybeSingle(),
        _supabase
          .from('brand_kits')
          .select('color_primary,color_secondary,color_accent,color_bg_dark,color_bg_light,font_headline,font_body,logo_url')
          .eq('workspace_id', _workspaceId)
          .maybeSingle(),
      ]);

      const briefing = briefingResult.data;
      const brandKit = brandKitResult.data;
      const pillars = Array.isArray(briefing?.content_pillars)
        ? briefing.content_pillars.map((item) => `<p>${xmlEscape(typeof item === 'string' ? item : JSON.stringify(item))}</p>`).join('')
        : '';
      const keywords = Array.isArray(briefing?.keywords)
        ? briefing.keywords.map((item) => `<k>${xmlEscape(String(item))}</k>`).join('')
        : '';

      return `<ccp v="1" ws="${_workspaceId}">
  <brand name="${xmlEscape(briefing?.company_name || 'Empresa')}" segment="${xmlEscape(briefing?.segment)}" score="${briefing?.completeness_score ?? 0}"/>
  <voice tone="${xmlEscape(briefing?.tone_of_voice || 'Profissional e direto')}" />
  <audience target="${xmlEscape(briefing?.target_audience)}" />
  <position differentials="${xmlEscape(briefing?.main_differentials)}" />
  <pillars>${pillars}</pillars>
  <keywords>${keywords}</keywords>
  <visual primary="${xmlEscape(brandKit?.color_primary || '#7C3AED')}" secondary="${xmlEscape(brandKit?.color_secondary || '#06B6D4')}" accent="${xmlEscape(brandKit?.color_accent || '#F59E0B')}" font_h="${xmlEscape(brandKit?.font_headline || 'Inter')}" font_b="${xmlEscape(brandKit?.font_body || 'Inter')}" />
  ${briefing?.brand_dna ? `<dna>${xmlEscape(String(briefing.brand_dna).slice(0, 1000))}</dna>` : ''}
</ccp>`;
    },
  },
  {
    name: 'ccp_list_generated_posts',
    module: 'ccp',
    description: 'Lista posts gerados recentemente para contexto historico do workspace.',
    inputSchema: {
      limit: { type: 'number', description: 'Maximo de posts', required: false },
    },
    handler: async ({ _workspaceId, _supabase, limit = 10 }) => {
      const postQueryClient = _supabase as unknown as UntypedPostsQuery;
      const { data } = await postQueryClient
        .from('post_sessions_v2')
        .select('id,title,format,status,created_at')
        .eq('workspace_id', _workspaceId)
        .order('created_at', { ascending: false })
        .limit(Number(limit) || 10);

      return data ?? [];
    },
  },
  {
    name: 'ccp_get_brand_dna',
    module: 'ccp',
    description: 'Retorna o DNA de marca consolidado do workspace.',
    inputSchema: {},
    handler: async ({ _workspaceId, _supabase }) => {
      const { data } = await _supabase
        .from('briefings')
        .select('brand_dna')
        .eq('workspace_id', _workspaceId)
        .maybeSingle();

      return data?.brand_dna || null;
    },
  },
];
