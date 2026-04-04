/**
 * SW-033: LoadingOverlay + ModuleSkeleton — Estados de carregamento
 */

import React from 'react';

// ─── LoadingOverlay ────────────────────────────────────────────

export function LoadingOverlay({ message = 'Carregando...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-b-violet-300/30 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
        <p className="text-zinc-300 text-sm font-medium">{message}</p>
      </div>
    </div>
  );
}

// ─── ModuleSkeleton ────────────────────────────────────────────

export function ModuleSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="w-10 h-10 bg-zinc-800 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div
              className="h-4 bg-zinc-800 rounded"
              style={{ width: `${60 + (i % 3) * 15}%` }}
            />
            <div
              className="h-3 bg-zinc-800/60 rounded"
              style={{ width: `${40 + (i % 2) * 20}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── CardSkeleton ──────────────────────────────────────────────

export function CardSkeleton() {
  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 animate-pulse">
      <div className="h-4 bg-zinc-800 rounded w-1/3 mb-3" />
      <div className="h-3 bg-zinc-800/60 rounded w-2/3 mb-2" />
      <div className="h-3 bg-zinc-800/60 rounded w-1/2" />
    </div>
  );
}

// ─── GridSkeleton ──────────────────────────────────────────────

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// ─── InlineLoader ──────────────────────────────────────────────

export function InlineLoader() {
  return (
    <div className="flex items-center gap-2 text-zinc-400 text-sm">
      <div className="w-4 h-4 rounded-full border-2 border-zinc-600 border-t-violet-400 animate-spin" />
      <span>Carregando...</span>
    </div>
  );
}
