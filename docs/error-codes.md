# TABELA DE CÓDIGOS DE ERRO — SW-051
# Simwork SDD-1.0 | Abril 2026
# REGRA: Todo erro exibido na UI DEVE usar um código desta tabela.

## Bio Link

| Código                        | Quando ocorre                          | HTTP |
|-------------------------------|----------------------------------------|------|
| ERR_BIOLINK_LOAD_001          | Falha ao listar bio links              | 500  |
| ERR_BIOLINK_GET_001           | Falha ao carregar bio link específico  | 404  |
| ERR_BIOLINK_CREATE_001        | Falha ao criar bio link                | 400  |
| ERR_BIOLINK_BLOCK_LOAD_001    | Falha ao carregar blocos               | 500  |
| ERR_BIOLINK_BLOCK_ADD_001     | Falha ao adicionar bloco               | 400  |
| ERR_BIOLINK_BLOCK_UPDATE_001  | Falha ao atualizar bloco               | 400  |
| ERR_BIOLINK_BLOCK_DELETE_001  | Falha ao remover bloco                 | 400  |
| ERR_BIOLINK_REORDER_001       | Falha ao reordenar blocos              | 500  |
| ERR_BIOLINK_PUBLISH_001       | Falha ao publicar                      | 500  |
| ERR_BIOLINK_PUBLIC_001        | Falha ao servir página pública         | 500  |
| ERR_BIOLINK_SLUG_DUP_001      | Slug já existe no sistema              | 409  |

## Site

| Código                        | Quando ocorre                          |
|-------------------------------|----------------------------------------|
| ERR_SITE_LOAD_001             | Falha ao listar sites                  |
| ERR_SITE_SECTIONS_001         | Falha ao carregar seções               |
| ERR_SITE_SECTION_SAVE_001     | Falha ao salvar seção                  |
| ERR_SITE_PUBLISH_001          | Falha ao publicar site                 |

## Blog

| Código                        | Quando ocorre                          |
|-------------------------------|----------------------------------------|
| ERR_BLOG_PUB_LOAD_001         | Publicação do blog não encontrada      |
| ERR_BLOG_ARTICLES_LOAD_001    | Falha ao carregar artigos              |
| ERR_BLOG_ARTICLE_SAVE_001     | Falha ao salvar artigo                 |
| ERR_BLOG_ARTICLE_PUBLISH_001  | Falha ao publicar artigo               |

## Portal RSS

| Código                        | Quando ocorre                          |
|-------------------------------|----------------------------------------|
| ERR_RSS_SOURCE_ADD_001        | Falha ao adicionar fonte RSS           |
| ERR_RSS_FETCH_001             | Falha ao buscar feed                   |
| ERR_RSS_PARSE_001             | Falha ao parsear XML do feed           |
| ERR_RSS_ITEMS_LOAD_001        | Falha ao carregar itens                |
| ERR_RSS_MISSING_PARAMS        | Parâmetros obrigatórios ausentes       |

## Vídeo

| Código                         | Quando ocorre                          |
|--------------------------------|----------------------------------------|
| ERR_VIDEO_EDGE_001             | Edge function indisponível             |
| ERR_VIDEO_TEMPLATES_001        | Falha ao carregar templates            |
| ERR_VIDEO_RENDER_001           | Falha ao iniciar renderização          |
| ERR_VIDEO_RENDER_TIMEOUT_001   | Renderização além do limite de tempo   |
| ERR_VIDEO_PREVIEW_NULL         | Preview Remotion retornou null         |
| ERR_VIDEO_MISSING_WORKSPACE    | workspace_id ausente                   |
| ERR_VIDEO_MISSING_CONTENT_ID   | content_id ausente                     |
| ERR_VIDEO_UNKNOWN_ACTION       | Ação desconhecida enviada              |

## Posts / Conteúdo

| Código                        | Quando ocorre                          |
|-------------------------------|----------------------------------------|
| ERR_POST_LOAD_001             | Falha ao carregar posts                |
| ERR_POST_GENERATE_001         | Falha na geração com IA               |
| ERR_POST_TEMPLATE_001         | Template não encontrado no banco       |
| ERR_POST_EXPORT_001           | Falha na exportação de imagem          |

## Agentes

| Código                        | Quando ocorre                          |
|-------------------------------|----------------------------------------|
| ERR_AGENT_LOAD_001            | Falha ao carregar agentes              |
| ERR_AGENT_SAVE_001            | Falha ao salvar/criar/remover agente   |
| ERR_SIMLAB_RUN_001            | Falha ao executar validação SimLab     |
| ERR_SIMLAB_NO_PERSONAS        | Nenhuma persona ativa para validar     |

## Brand Kit

| Código                        | Quando ocorre                          |
|-------------------------------|----------------------------------------|
| ERR_BRANDKIT_LOAD_001         | Falha ao carregar Brand Kit            |
| ERR_BRANDKIT_SAVE_001         | Falha ao salvar Brand Kit              |

## Workspace

| Código                        | Quando ocorre                          |
|-------------------------------|----------------------------------------|
| ERR_WORKSPACE_LOAD_001        | Workspace não encontrado               |
| ERR_WORKSPACE_MEMBER_001      | Falha ao gerenciar membros             |
| ERR_WORKSPACE_RLS_001         | RLS bloqueando inesperadamente         |

## CCP (Contexto IA)

| Código                        | Quando ocorre                          |
|-------------------------------|----------------------------------------|
| CCP_001                       | Workspace não encontrado no CCP        |

## Chaves de IA

| Código                        | Quando ocorre                          |
|-------------------------------|----------------------------------------|
| ERR_KEY_ORCH_001              | Nenhuma chave para o serviço           |
| ERR_KEY_ORCH_002              | Todas as chaves atingiram limite       |
| ERR_KEY_DECRYPT_001           | Falha ao descriptografar chave         |

## Pagamentos

| Código                        | Quando ocorre                          |
|-------------------------------|----------------------------------------|
| ERR_GATEWAY_SESSION_001       | Falha ao criar sessão de checkout      |
| ERR_GATEWAY_WEBHOOK_001       | Webhook com payload inválido           |
| ERR_PAYMENT_CONFIRM_001       | Confirmação de pagamento falhou        |

---

_Gerado em: 2026-04-04 | SW-051 PASS_
