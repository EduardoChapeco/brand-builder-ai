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
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    : '';

export const ccpTools: MCPTool[] = [
  {
    name: 'ccp_get_snapshot',
    module: 'ccp',
    description:
      'Retorna o snapshot completo do contexto da marca em XML compacto. Use antes de qualquer geracao de conteudo ou interface contextualizada.',
    inputSchema: {},
    handler: async ({ _workspaceId, _supabase }) => {
      // Lê os campos JSONB reais do banco (company, audience, content, colors, fonts)
      const [briefingResult, brandKitResult] = await Promise.all([
        _supabase
          .from('briefings')
          .select('company, audience, content, completeness_score')
          .eq('workspace_id', _workspaceId)
          .maybeSingle(),
        _supabase
          .from('brand_kits')
          .select('colors, fonts, logos')
          .eq('workspace_id', _workspaceId)
          .maybeSingle(),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const briefing = briefingResult.data as Record<string, any> | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const brandKit = brandKitResult.data as Record<string, any> | null;

      // Deserializa JSONB → valores para o XML CCP
      const company  = briefing?.company  || {};
      const audience = briefing?.audience || {};
      const content  = briefing?.content  || {};
      const colors   = brandKit?.colors   || {};
      const fonts    = brandKit?.fonts    || {};

      const pillars = Array.isArray(content.pillars)
        ? content.pillars.map((item: unknown) => `<p>${xmlEscape(String(item))}</p>`).join('')
        : '';
      const keywords = Array.isArray(content.keywords)
        ? content.keywords.map((item: unknown) => `<k>${xmlEscape(String(item))}</k>`).join('')
        : '';

      return `<ccp v="2" ws="${_workspaceId}">
  <brand name="${xmlEscape(company.name || 'Empresa')}" segment="${xmlEscape(company.segment)}" score="${briefing?.completeness_score ?? 0}"/>
  <voice tone="${xmlEscape(content.tone_of_voice || 'Profissional e direto')}" />
  <audience target="${xmlEscape(audience.description)}" age="${xmlEscape(audience.age_range)}" personality="${xmlEscape(audience.personality)}" />
  <position differentials="${xmlEscape(company.differentials)}" value_prop="${xmlEscape(company.value_proposition)}" />
  <pillars>${pillars}</pillars>
  <keywords>${keywords}</keywords>
  <visual primary="${xmlEscape(colors.primary || '#7C3AED')}" secondary="${xmlEscape(colors.secondary || '#06B6D4')}" accent="${xmlEscape(colors.accent || '#F59E0B')}" font_h="${xmlEscape(fonts.heading || 'Inter')}" font_b="${xmlEscape(fonts.body || 'Inter')}" />
  ${company.brand_dna ? `<dna>${xmlEscape(String(company.brand_dna).slice(0, 1000))}</dna>` : ''}
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
        .from('content_items')
        .select('id,title,type,status,created_at')
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
        .select('company')
        .eq('workspace_id', _workspaceId)
        .maybeSingle();

      // brand_dna está dentro do JSONB company
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data as any)?.company?.brand_dna || null;
    },
  },
];
