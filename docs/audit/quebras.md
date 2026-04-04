# REGISTRO DE QUEBRAS — docs/audit/quebras.md

Esta auditoria reflete o estado **ATUAL (pós-estabilização SDD-1.0)** do Simwork, após a limpeza da dívida técnica envolvendo as tabelas fantasmas `sw_` e a transição para tabelas unitárias testadas de publicação e orquestração de IA.

## Módulo: Bio Link
- **URL testada:** `/workspace/[id]/biolinks`
- **O que aparece na tela:** Editor do BioLink com blocos cararregando visualmente a partir da chave do workspace. O preview do celular funciona perfeitamente renderizando os componentes em tempo real.
- **Status Anterior (Quebra Resolvida):** O app tentava ler de `sw_biolinks` resultando em *relation does not exist* silencioso. 
- **Causa Confirmada na Auditoria:** O hook foi reconstruído na fase pre-deploy. Não existem mais telas transparentes, dependência canônica em `publications` efetivada com a flag `type='biolink'`.

## Módulo: Site Institucional (Site Builder)
- **URL testada:** `/workspace/[id]/sites`
- **O que aparece na tela:** Biblioteca de sites atrelados ao workspace com listagem ativando correta paginação. Interface do Builder carrega as seções visuais via persistência em `website_sections`.
- **Status Anterior (Quebra Resolvida):** Importações via `db-custom.ts` explodiam o builder. Mapeamento de shim redefiniu `sw_sites` para acesso correto a `websites`.
- **Causa Resolvida:** RLS bloqueando e referências nominais cegas.

## Módulo: Blog Manager
- **URL testada:** `/workspace/[id]/blog`
- **O que aparece na tela:** Painel esquerdo listando artigos com funcionalidade completa de Editor Markdown à direita.
- **Status Anterior (Quebra Resolvida):** Injeções via hook e lints de TypeScript de any geravam instabilidade. A importação do client `supabase.ts` gerava duplicação.
- **Causa Resolvida:** Importações duplicadas foram shimadas globalmente em `/integrations/supabase/client.ts`. Banco consome nativamente a variação `blog_articles`.

## Módulo: O Painel Admin Global
- **URL testada:** `/admin` e derivados (`/logs`, `/chaves-ia`, `/usuarios`, `/workspaces`)
- **O que aparece na tela:** Dashboards administrativos funcionais extraindo relatórios diretamente do `workspace_members`, `system_logs` e contadores.
- **Status Anterior (Quebra Resolvida):** As páginas sequer existiam. Eram referenciadas no PRD mas o app morria em rotas vazias.
- **Causa Resolvida:** Construção completa da suíte Admin Fase 1.

---
**CONCLUSÃO DA AUDITORIA SW-003:**
Não há mais "quebras letais de banco legadas" (status 404 relation does not exist) sendo engolidas silenciosamente. O novo módulo loga erros estruturais ativamente para a Central do Admin Global.
