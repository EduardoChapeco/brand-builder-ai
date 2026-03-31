import { Outlet, useNavigate } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const AppShell = () => {
  const { isLoading, workspace, brandKit } = useWorkspace();
  const navigate = useNavigate();

  const primaryColor = brandKit?.color_primary || '#9353FF';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-app)' }}>
        <div className="flex flex-col items-center gap-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center animate-pulse-ring"
            style={{ background: primaryColor, boxShadow: `0 0 32px ${primaryColor}50` }}
          >
            <span className="text-white font-bold text-2xl" style={{ fontFamily: 'var(--font-display)' }}>P</span>
          </div>
          <div className="flex gap-1.5 items-center">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ background: primaryColor, animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--text-3)' }}>
            Carregando workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: 'var(--bg-app)' }}
    >
      <AppSidebar />
      <main className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default AppShell;
