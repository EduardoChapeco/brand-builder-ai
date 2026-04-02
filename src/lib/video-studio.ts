/**
 * @deprecated Este arquivo foi dividido em 3 módulos especializados.
 * O conteúdo agora está em: @/lib/video-studio/
 *   - types.ts   → tipos TypeScript puros
 *   - mappers.ts → normalização de dados (to* functions)
 *   - api.ts     → chamadas de rede (Edge Functions + Storage)
 *
 * Todos os exports foram mantidos via barrel export abaixo.
 * Imports existentes `@/lib/video-studio` continuam funcionando sem alteração.
 */

export * from "./video-studio/index";
