/**
 * SW-031: ErrorBadge — Componente de exibição de erros com código único
 * NUNCA use strings genéricas. Sempre use código de erro canônico (ERR_MODULO_TIPO_NNN)
 */

import React from 'react';
import { AlertTriangle, Copy, RefreshCw } from 'lucide-react';

export interface ErrorBadgeProps {
  code: string;          // Ex: ERR_BIOLINK_LOAD_001
  message: string;       // Mensagem amigável em pt-BR
  detail?: string;       // Detalhe técnico (opcional, colapso por padrão)
  onRetry?: () => void;  // Ação de retry (opcional)
  variant?: 'inline' | 'full' | 'toast';
}

export function ErrorBadge({
  code,
  message,
  detail,
  onRetry,
  variant = 'inline',
}: ErrorBadgeProps) {
  const [showDetail, setShowDetail] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`[${code}] ${message}${detail ? `\n${detail}` : ''}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === 'full') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 p-8">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <div className="text-center max-w-md">
          <p className="text-sm font-mono text-red-400 mb-1">{code}</p>
          <p className="text-white font-medium text-lg mb-2">{message}</p>
          {detail && (
            <button
              onClick={() => setShowDetail(v => !v)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showDetail ? 'Ocultar detalhes' : 'Ver detalhes técnicos'}
            </button>
          )}
          {showDetail && detail && (
            <pre className="mt-3 p-3 bg-zinc-900 rounded-lg text-xs text-zinc-400 text-left overflow-auto max-h-32">
              {detail}
            </pre>
          )}
        </div>
        <div className="flex gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar Novamente
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors"
          >
            <Copy className="w-4 h-4" />
            {copied ? 'Copiado!' : 'Copiar Erro'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
            {code}
          </span>
          <span className="text-sm text-zinc-300">{message}</span>
        </div>
        {detail && (
          <>
            <button
              onClick={() => setShowDetail(v => !v)}
              className="text-xs text-zinc-500 hover:text-zinc-400 mt-1 transition-colors"
            >
              {showDetail ? '▲ ocultar' : '▼ detalhes'}
            </button>
            {showDetail && (
              <pre className="mt-1 text-xs text-zinc-500 truncate">{detail}</pre>
            )}
          </>
        )}
      </div>
      <div className="flex gap-1 flex-shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            title="Tentar novamente"
            className="p-1 text-zinc-400 hover:text-violet-400 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={handleCopy}
          title="Copiar erro"
          className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
