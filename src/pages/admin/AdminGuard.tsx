// src/pages/admin/AdminGuard.tsx
// Protege rotas de admin — apenas email autorizado pode acessar

import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? '').split(',');

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAdmin(user ? ADMIN_EMAILS.includes(user.email ?? '') : false);
    });
  }, []);

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
