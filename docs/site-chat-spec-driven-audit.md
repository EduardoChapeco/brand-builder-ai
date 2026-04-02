# Site Chat Spec-Driven Audit

## Scope

This audit covers the ENGIOS site creation stack across:
- `src/pages/SiteBuilderPage.tsx`
- `src/pages/SiteEditorPage.tsx`
- `src/pages/VibeCoderPage.tsx`
- `supabase/functions/_shared/agent-runtime.ts`
- `supabase/functions/_shared/website-squad.ts`
- `supabase/functions/agent-run-approve/index.ts`
- `supabase/migrations/20260403023000_website_spec_runtime.sql`

## Current target architecture

- Site chat enters through `VibeCoderPage`.
- The chat creates a `website_spec` run through `agent-orchestrator`.
- The spec run persists artifacts in `agent_artifacts`.
- Approval is explicit through `agent-run-approve`.
- Approval creates a `website_build` run.
- `agent-worker` executes the website squad task-by-task.
- `agent-status` exposes tasks and artifacts.
- A successful build persists back to `projects.source_files_json`.

## Gaps closed by this rollout

- direct prompt-to-build bypass removed from the active site chat UI
- explicit approval gate before build
- persisted artifacts for spec, plan, task graph, constitution, QA, and handoff
- runtime enforcement that `ready` templates only use supported agent handlers
- linkage between `projects`, `platform_conversations`, and `websites`
- local design constitution and scanner for visual drift

## Guardrails

- no `website_build` without an approved source spec
- no `ready` squad template without a real runtime handler
- no hardcoded black/white or shadow-based shell styling in the site chat shell
- site editor shell aligned with app tokens and workspace brand surfaces

## Residual expansion path

- promote approved outputs back into structured `website_pages` only through an explicit future conversion phase
- expand the same runtime to `website_refine` and `website_block_build`
- add deeper QA for schema diffs, runtime errors, and E2E preview verification
