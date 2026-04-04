/**
 * SW-034: EditorShell — Layout canônico 3 colunas para todos os editores
 * Sidebar contextual | Editor/Preview | Painel direito
 */

import React from 'react';

export interface EditorShellProps {
  // Coluna esquerda — lista de itens / navegação contextual
  sidebar?: React.ReactNode;

  // Coluna central — editor principal ou preview
  children: React.ReactNode;

  // Coluna direita — propriedades / configurações (opcional)
  panel?: React.ReactNode;

  // Título na topbar
  title?: string;

  // Ações da topbar (botões direita)
  actions?: React.ReactNode;

  // Colapsar sidebar (mobile)
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;

  // Mostrar panel direito
  panelOpen?: boolean;
  onTogglePanel?: () => void;
}

export function EditorShell({
  sidebar,
  children,
  panel,
  title,
  actions,
  sidebarCollapsed = false,
  panelOpen = false,
}: EditorShellProps) {
  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] text-white">
      {/* Topbar */}
      {(title ?? actions) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            {title && (
              <h1 className="text-base font-semibold text-white truncate">{title}</h1>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">{actions}</div>
          )}
        </div>
      )}

      {/* Body Grid */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar esquerda */}
        {sidebar && (
          <aside
            className={`
              flex-shrink-0 border-r border-zinc-800/50 bg-zinc-950/60 backdrop-blur-sm
              overflow-y-auto transition-all duration-200
              ${sidebarCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-64 xl:w-72'}
            `}
          >
            {sidebar}
          </aside>
        )}

        {/* Editor / Conteúdo principal */}
        <main className="flex-1 overflow-auto relative">
          {children}
        </main>

        {/* Painel direito */}
        {panel && (
          <aside
            className={`
              flex-shrink-0 border-l border-zinc-800/50 bg-zinc-950/60 backdrop-blur-sm
              overflow-y-auto transition-all duration-200
              ${panelOpen ? 'w-72 xl:w-80' : 'w-0 opacity-0 overflow-hidden'}
            `}
          >
            {panel}
          </aside>
        )}
      </div>
    </div>
  );
}
