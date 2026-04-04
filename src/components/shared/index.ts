/**
 * SW-012: shared/index.ts — Barrel exports de todos os componentes shared
 */

export { ErrorBadge } from './ErrorBadge';
export type { ErrorBadgeProps } from './ErrorBadge';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export {
  LoadingOverlay,
  ModuleSkeleton,
  CardSkeleton,
  GridSkeleton,
  InlineLoader,
} from './LoadingOverlay';

export { EditorShell } from './EditorShell';
export type { EditorShellProps } from './EditorShell';

export { ErrorBoundary } from './ErrorBoundary';
