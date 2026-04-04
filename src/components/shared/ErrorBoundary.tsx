/**
 * SW-033: ErrorBoundary — Captura erros React e exibe ErrorBadge
 * Obrigatório envolver todos os módulos principais
 */

import React from 'react';
import { logError } from '@/lib/errorLogger';
import { ErrorBadge } from './ErrorBadge';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  module?: string;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorCode: string;
  errorMessage: string;
  errorDetail?: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorCode: '',
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): State {
    const module = 'render';
    return {
      hasError: true,
      errorCode: `ERR_${module.toUpperCase()}_BOUNDARY_001`,
      errorMessage: error.message || 'Erro inesperado no módulo',
      errorDetail: error.stack,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const module = this.props.module ?? 'render';
    logError({
      code: `ERR_${module.toUpperCase()}_BOUNDARY_001`,
      module,
      message: error.message,
      detail: {
        stack: error.stack,
        componentStack: info.componentStack,
      },
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorCode: '', errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-zinc-300 font-medium mb-1">Erro inesperado no módulo</p>
          <div className="mt-4 w-full max-w-md">
            <ErrorBadge
              code={this.state.errorCode}
              message={this.state.errorMessage}
              detail={this.state.errorDetail}
              onRetry={this.handleRetry}
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
