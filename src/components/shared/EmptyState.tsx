/**
 * SW-032: EmptyState — Estado vazio de módulos
 * NUNCA exibir "erro" para estado vazio. SEMPRE com ação clara.
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center min-h-[320px] gap-5 p-8 ${className}`}>
      {/* Ícone com glow */}
      <div className="relative">
        <div className="absolute inset-0 bg-violet-500/20 blur-2xl rounded-full scale-150" />
        <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800">
          <Icon className="w-9 h-9 text-zinc-400" />
        </div>
      </div>

      {/* Texto */}
      <div className="text-center max-w-sm">
        <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
        <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
      </div>

      {/* Ações */}
      <div className="flex flex-col sm:flex-row gap-3">
        {action && (
          <button
            onClick={action.onClick}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-all hover:shadow-lg hover:shadow-violet-500/20"
          >
            {action.icon && <action.icon className="w-4 h-4" />}
            {action.label}
          </button>
        )}
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium transition-colors"
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}
