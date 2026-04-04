/**
 * src/pages/HelpPage.tsx
 * SDD-1.0 — Central de ajuda com artigos e onboarding
 */
import { useState } from 'react';
import { BookOpenText, HelpCircle, ChevronDown, ChevronUp, ExternalLink, Search } from 'lucide-react';
import { SwCard, SwBadge } from '@/components/shared/SwComponents';
import PageHeader from '@/components/shared/PageHeader';

const HELP_ARTICLES = [
  {
    category: 'Primeiros passos',
    articles: [
      { title: 'Como configurar seu workspace', desc: 'Aprenda a configurar o Brand Kit, Briefing e as configurações essenciais do seu workspace para começar a criar.' },
      { title: 'Criando seu primeiro Bio Link', desc: 'Passo a passo completo para criar, personalizar e publicar um Bio Link profissional.' },
      { title: 'Publicando seu primeiro site', desc: 'Como criar um site institucional com o Site Builder e publicá-lo com um domínio personalizado.' },
    ],
  },
  {
    category: 'Criação de conteúdo',
    articles: [
      { title: 'Gerando posts com IA', desc: 'Como usar o Gerador de Posts para criar conteúdo social com IA baseado no seu Brand Kit.' },
      { title: 'Blog Manager: publicando artigos', desc: 'Crie, edite e publique artigos no seu blog integrado com SEO automático.' },
      { title: 'Configurando o Portal de Notícias', desc: 'Adicione fontes RSS e monitore conteúdo relevante para o seu segmento.' },
    ],
  },
  {
    category: 'Agentes e SimLab',
    articles: [
      { title: 'O que são Agentes Simwork?', desc: 'Entenda como os agentes funcionam como personas sintéticas para validar seu conteúdo antes de publicar.' },
      { title: 'Executando uma validação SimLab', desc: 'Como enviar um post para validação e interpretar o feedback das personas.' },
    ],
  },
  {
    category: 'Configurações e integrações',
    articles: [
      { title: 'Adicionando chaves de API', desc: 'Como adicionar suas próprias chaves do OpenAI, Anthropic e outros serviços para uso exclusivo no seu workspace.' },
      { title: 'Configurando fontes RSS', desc: 'Adicione e gerencie fontes de conteúdo RSS para o Portal de Notícias.' },
    ],
  },
];

export default function HelpPage() {
  const [search, setSearch] = useState('');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({ 'Primeiros passos': true });

  const toggle = (cat: string) =>
    setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));

  const filtered = HELP_ARTICLES.map(cat => ({
    ...cat,
    articles: cat.articles.filter(
      a => !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.desc.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.articles.length > 0);

  return (
    <div className="page-layout">
      <div className="page-content no-scrollbar">
        <div className="page-inner space-y-6 py-6">
          <PageHeader
            eyebrow="Central de Ajuda"
            title="Como posso ajudar?"
            description="Artigos, guias e tutoriais para aproveitar ao máximo o Simwork."
            action={<SwBadge variant="draft">Documentação</SwBadge>}
          />

          {/* Busca */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              type="text"
              placeholder="Buscar artigos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-white/10 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {/* Artigos */}
          <div className="space-y-3">
            {filtered.map(({ category, articles }) => (
              <SwCard key={category} glass className="overflow-hidden">
                <button
                  onClick={() => toggle(category)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <BookOpenText size={14} className="text-violet-400" />
                    <span className="text-sm font-bold text-white">{category}</span>
                    <SwBadge variant="outline">{articles.length}</SwBadge>
                  </div>
                  {openCategories[category]
                    ? <ChevronUp size={14} className="text-zinc-500" />
                    : <ChevronDown size={14} className="text-zinc-500" />
                  }
                </button>
                {openCategories[category] && (
                  <div className="divide-y divide-white/5 border-t border-white/5">
                    {articles.map(article => (
                      <div
                        key={article.title}
                        className="flex items-start justify-between p-5 hover:bg-white/[0.02] transition-colors cursor-pointer group"
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <HelpCircle size={14} className="text-zinc-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-white group-hover:text-violet-300 transition-colors">
                              {article.title}
                            </p>
                            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{article.desc}</p>
                          </div>
                        </div>
                        <ExternalLink size={12} className="text-zinc-700 group-hover:text-zinc-400 transition-colors flex-shrink-0 ml-4 mt-1" />
                      </div>
                    ))}
                  </div>
                )}
              </SwCard>
            ))}
          </div>

          {/* Suporte direto */}
          <SwCard glass className="p-6 border border-violet-500/20 bg-violet-500/5">
            <h3 className="text-sm font-bold text-white mb-2">Não encontrou o que procura?</h3>
            <p className="text-xs text-zinc-400 mb-4">Nossa equipe está disponível para ajudar com dúvidas técnicas e operacionais.</p>
            <a
              href="../suporte"
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-xl transition-colors"
            >
              Abrir ticket de suporte
              <ExternalLink size={12} />
            </a>
          </SwCard>
        </div>
      </div>
    </div>
  );
}
