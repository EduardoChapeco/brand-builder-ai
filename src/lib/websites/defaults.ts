import type {
  WebsitePageRecord,
  WebsiteSectionLibraryItem,
  WebsiteSectionRecord,
  WebsiteSectionType,
} from './types';

const nowIso = () => new Date().toISOString();

export const WEBSITE_SECTION_LIBRARY: WebsiteSectionLibraryItem[] = [
  { type: 'hero', label: 'Hero', description: 'Topo com headline, subheadline e CTAs.', group: 'Topo' },
  { type: 'features', label: 'Features', description: 'Grid de funcionalidades ou diferenciais.', group: 'Conteudo' },
  { type: 'pricing', label: 'Pricing', description: 'Planos com destaque visual.', group: 'Conversao' },
  { type: 'faq', label: 'FAQ', description: 'Perguntas frequentes estruturadas.', group: 'Conteudo' },
  { type: 'testimonials', label: 'Testimonials', description: 'Prova social com clientes ou casos.', group: 'Conteudo' },
  { type: 'stats', label: 'Stats', description: 'Numeros, indicadores e conquistas.', group: 'Conteudo' },
  { type: 'cta', label: 'CTA', description: 'Secao curta de conversao com chamada final.', group: 'Conversao' },
  { type: 'contact_form', label: 'Contact Form', description: 'Formulario simples de captura.', group: 'Conversao' },
  { type: 'custom_html', label: 'Custom HTML', description: 'Trecho customizado sob controle do editor.', group: 'Custom' },
];

export const createDefaultPageDraft = (websiteId: string): WebsitePageRecord => ({
  id: crypto.randomUUID(),
  website_id: websiteId,
  title: 'Home',
  slug: '/',
  is_home: true,
  status: 'draft',
  seo_metadata: { title: 'Home', description: '' },
  content_blocks: [],
  created_at: nowIso(),
  updated_at: nowIso(),
  is_temporary: true,
});

export const createDefaultSection = (
  sectionType: WebsiteSectionType,
  workspaceId: string,
  pageId: string,
  sortOrder: number,
): WebsiteSectionRecord => {
  const base: WebsiteSectionRecord = {
    id: crypto.randomUUID(),
    page_id: pageId,
    workspace_id: workspaceId,
    section_type: sectionType,
    sort_order: sortOrder,
    is_visible: true,
    content: {},
    bg_type: sectionType === 'hero' || sectionType === 'cta' ? 'gradient' : 'color',
    bg_value:
      sectionType === 'hero'
        ? 'linear-gradient(135deg,var(--workspace-brand-soft),transparent 72%)'
        : null,
    padding_top: 'lg',
    padding_bottom: 'lg',
    style_override: {},
    scroll_animation: sectionType === 'hero' ? 'fade_in' : 'fade_up',
    version: 1,
    snapshot_history: [],
    created_at: nowIso(),
    updated_at: nowIso(),
    is_temporary: true,
  };

  switch (sectionType) {
    case 'hero':
      base.content = {
        eyebrow: 'Nova geracao de paginas',
        headline: 'Seu site pronto para vender desde a primeira dobra',
        subheadline: 'Builder visual conectado ao contexto da marca e ao fluxo spec-driven.',
        body: 'Combine posicionamento, narrativa e prova social em uma estrutura clara, mobile-first e publicada com rapidez.',
        cta_primary: { text: 'Comecar agora', url: '#' },
        cta_secondary: { text: 'Ver demonstracao', url: '#' },
      };
      break;
    case 'features':
      base.content = {
        headline: 'Diferenciais principais',
        subheadline: 'Blocos estruturados para explicar valor sem ruido visual.',
        items: [
          { title: 'Estrutura clara', description: 'Secoes editaveis e consistentes entre paginas.' },
          { title: 'Contexto da marca', description: 'Texto e composicao alinhados ao briefing e brand kit.' },
          { title: 'Escala operacional', description: 'Chat, builder e runtime compartilhando a mesma base.' },
        ],
      };
      break;
    case 'pricing':
      base.content = {
        headline: 'Planos recomendados',
        plans: [
          { name: 'Starter', price: 'R$ 149', period: '/mes', description: 'Entrada rapida', features: ['1 site', '1 dominio'], cta_text: 'Escolher', is_highlighted: false },
          { name: 'Pro', price: 'R$ 399', period: '/mes', description: 'Operacao principal', features: ['3 sites', 'Analytics', 'Automacoes'], cta_text: 'Assinar Pro', is_highlighted: true },
          { name: 'Scale', price: 'Sob consulta', period: '', description: 'Volume e squad dedicado', features: ['Squads customizados', 'SLA'], cta_text: 'Falar com vendas', is_highlighted: false },
        ],
      };
      break;
    case 'faq':
      base.content = {
        headline: 'Perguntas frequentes',
        items: [
          { question: 'O builder funciona sem programar?', answer: 'Sim. O editor foi estruturado para operacao visual com IA como camada de aceleracao.' },
          { question: 'Posso usar o chat e o builder juntos?', answer: 'Sim. O site visual pode abrir o fluxo spec-driven e vincular o projeto ao mesmo website.' },
        ],
      };
      break;
    case 'testimonials':
      base.content = {
        headline: 'Clientes falando sobre resultado',
        items: [
          { text: 'A pagina saiu muito mais clara e converteu melhor ja na primeira semana.', author_name: 'Marina Lopes', author_role: 'CMO' },
          { text: 'Conseguimos alinhar design, copy e dados sem retrabalho entre time e agencia.', author_name: 'Rafael Costa', author_role: 'Founder' },
        ],
      };
      break;
    case 'stats':
      base.content = {
        headline: 'Indicadores em destaque',
        items: [
          { number: '4.2x', label: 'mais cliques qualificados' },
          { number: '72h', label: 'para sair do briefing ao site' },
          { number: '91%', label: 'de consistencia visual entre canais' },
        ],
      };
      break;
    case 'cta':
      base.content = {
        headline: 'Pronto para colocar a marca em producao?',
        subheadline: 'Ative o fluxo completo e publique um site consistente sem improviso.',
        body: 'Conecte o builder visual ao chat spec-driven, ao SimLab e ao runtime publico.',
        cta_primary: { text: 'Solicitar onboarding', url: '#' },
      };
      break;
    case 'contact_form':
      base.content = {
        headline: 'Fale com o time',
        fields: ['name', 'email', 'message'],
        submit_text: 'Enviar mensagem',
        success_message: 'Recebemos sua mensagem e vamos responder em breve.',
      };
      break;
    case 'custom_html':
      base.content = {
        html: '<div><h3>Bloco customizado</h3><p>Insira markup controlado aqui.</p></div>',
      };
      break;
    case 'legacy_block':
      base.content = {
        legacy_type: 'legacy_block',
        description: 'Bloco importado de uma versao anterior do builder.',
      };
      break;
    default:
      break;
  }

  return base;
};
