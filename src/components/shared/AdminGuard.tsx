import React from 'react';
import { Navigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { SwSpinner } from '@/components/shared/SwComponents';
import { ShieldAlert } from 'lucide-react';

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { profile, isLoading, error } = useProfile();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="flex flex-col items-center gap-4">
          <SwSpinner className="w-10 h-10 text-[#a855f7]" />
          <p className="text-stone-500 text-sm animate-pulse">Verificando credenciais SimLab...</p>
        </div>
      </div>
    );
  }

  if (error || !profile?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="mx-auto w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <ShieldAlert size={40} className="text-red-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Acesso Restrito</h1>
            <p className="text-stone-400 text-sm leading-relaxed">
              Você não possui privilégios de administrador global para acessar este módulo. 
              Sua tentativa de acesso foi registrada no cofre de segurança.
            </p>
          </div>
          <div className="pt-4">
            <Navigate to="/" replace />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
