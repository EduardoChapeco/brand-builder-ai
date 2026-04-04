# ARQUIVOS GRANDES — docs/audit/arquivos-grandes.md

| Arquivo | Linhas | Candidato a Split? |
| ------- | ------ | ------------------ |
| `src/lib/video-studio/canvas-video.tsx` | 3704 | SIM |
| `src/lib/postgenPhase2.ts` | 3005 | SIM |
| `src/lib/postgenPhase3.ts` | 1344 | SIM |
| `src/lib/simlab/content-insights.tsx`| 832 | SIM |
| `src/pages/VideoStudioEditorPage.tsx` | 823 | SIM |
| `src/components/simlab/SimlabDetailedReviews.tsx`| 677 | NÃO |
| `src/pages/SiteEditorPage.tsx` | 510 | NÃO |
| `src/pages/BlogManagerPage.tsx` | 512 | NÃO |

*Observação:* Muitos dos arquivos grandes (acima de 500 linhas) são engines ou componentes complexos (como o editor multimídia e o parser do PostGen). Apesar de poderem sofrer *split* estrutural, sua fragmentação sem o desenho robusto do Supabase Edge Functions transferiria muita complexidade para a rede. A orientação atual (Fase Média) é contê-los até consolidar SDD-1.0.
