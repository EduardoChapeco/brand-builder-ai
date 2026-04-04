import { Outlet, useLocation } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import WorkspaceSidebar from '@/components/shared/WorkspaceSidebar';
import { SwHelpSheet } from '@/components/shared/SwHelpSheet';
import SwTopbar from '@/components/shared/SwTopbar';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { getWorkspaceRouteMeta } from '@/lib/workspaceNavigation';
import { useMemo, useState } from 'react';

const defaultBullets = [
  'Confira se o Brand Kit e o Briefing já foram migrados para o schema Simwork.',
  'Valide o estado do módulo antes de publicar ou sincronizar qualquer saída.',
  'Use a ajuda contextual como checklist de implementação e operação do módulo atual.',
];

export default function AppShell() {
  const location = useLocation();
  const { workspace } = useWorkspace();
  const [helpOpen, setHelpOpen] = useState(false);

  const routeMeta = useMemo(() => getWorkspaceRouteMeta(location.pathname), [location.pathname]);

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen w-full bg-[var(--surface-app)] text-[var(--text-primary)]">
        <div className="flex min-h-screen w-full">
          <WorkspaceSidebar />
          <div className="flex min-h-screen min-w-0 flex-1 flex-col">
            <SwTopbar
              title={routeMeta.label}
              description={routeMeta.description}
              status={routeMeta.section}
              workspaceName={workspace?.name ?? null}
              onOpenHelp={() => setHelpOpen(true)}
            />
            <main className="min-h-0 flex-1 overflow-y-auto bg-[var(--surface-canvas)]">
              <Outlet />
            </main>
          </div>
        </div>
      </div>

      <SwHelpSheet
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        moduleName={routeMeta.helpTitle || routeMeta.label}
        sections={defaultBullets.map((v, i) => ({ title: `Nota ${i+1}`, description: v, icon: null }))}
      />
    </SidebarProvider>
  );
}
