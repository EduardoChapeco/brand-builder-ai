import type { CSSProperties } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import WorkspaceSidebar from '@/components/shared/WorkspaceSidebar';
import WorkspaceTopbar from '@/components/shared/WorkspaceTopbar';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;

  const value = Number.parseInt(full, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const AppShell = () => {
  const { isLoading, workspace, brandKit } = useWorkspace();

  const primaryColor = brandKit?.color_primary || '#18181B';
  const shellStyle = {
    '--workspace-brand': primaryColor,
    '--workspace-brand-soft': hexToRgba(primaryColor, 0.12),
    '--workspace-brand-border': hexToRgba(primaryColor, 0.22),
  } as CSSProperties;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--surface-1)] text-[var(--text-primary)]">
        <div className="flex flex-col items-center gap-6">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-[var(--shadow-card)]"
            style={{ background: primaryColor }}
          >
            <span className="text-2xl font-semibold tracking-[-0.04em]">P</span>
          </div>
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full animate-bounce"
                style={{ background: primaryColor, animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Carregando workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="flex h-screen overflow-hidden bg-[var(--surface-1)] text-[var(--text-primary)]" style={shellStyle}>
        <WorkspaceSidebar />
        <SidebarInset className="min-w-0 overflow-hidden bg-[var(--surface-1)]">
          <WorkspaceTopbar />
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AppShell;
