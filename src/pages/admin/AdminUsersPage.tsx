/**
 * src/pages/admin/AdminUsersPage.tsx
 * SDD-1.0 — Gestão global de usuários via profiles
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { SwCard, SwBadge } from "@/components/shared/SwComponents";
import { Users, Search } from "lucide-react";

export default function AdminUsersPage() {
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Users className="text-[#a855f7]" size={28} /> Gestão de Usuários
          </h1>
          <p className="text-stone-400 font-medium opacity-60">Controle global de acessos e permissões administrativas.</p>
        </div>
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-[#a855f7] transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Buscar usuário..." 
            className="bg-[#0a0a0b] border border-white/5 rounded-full py-2.5 pl-10 pr-6 text-sm text-white focus:outline-none focus:border-[#a855f7]/50 transition-all w-64 focus:w-80" 
          />
        </div>
      </div>

      <SwCard glass className="p-0 overflow-hidden border-white/5 bg-white/[0.02]">
        {isLoading ? (
          <div className="p-20 text-center">
             <div className="animate-spin w-8 h-8 border-2 border-[#a855f7] border-t-transparent rounded-full mx-auto mb-6" />
             <p className="text-stone-500 text-xs font-bold uppercase tracking-widest opacity-50">Sincronizando base de dados...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.03] border-b border-white/5 text-stone-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="p-5">Usuário</th>
                  <th className="p-5">E-mail</th>
                  <th className="p-5 text-center">Status Admin</th>
                  <th className="p-5 text-right">Criado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users?.map((user) => (
                  <tr key={user.id} className="hover:bg-white/[0.04] transition-colors group">
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/5 flex items-center justify-center text-xs font-bold text-white shadow-inner group-hover:scale-105 transition-transform">
                          {user.full_name?.slice(0, 2).toUpperCase() || "??"}
                        </div>
                        <div>
                          <p className="font-bold text-white group-hover:text-[#a855f7] transition-colors leading-tight">
                            {user.full_name || "Sem Nome"}
                          </p>
                          <p className="text-[10px] text-stone-600 font-mono mt-1">{user.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-stone-400 font-mono text-xs">{user.email}</td>
                    <td className="p-5 text-center">
                      <SwBadge variant={user.is_admin ? "accent" : "draft"} className={user.is_admin ? "shadow-[0_0_10px_rgba(59,130,246,0.2)]" : ""}>
                        {user.is_admin ? "Global Admin" : "User"}
                      </SwBadge>
                    </td>
                    <td className="p-5 text-right text-stone-500 font-medium">
                      {new Date(user.created_at).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SwCard>
    </div>
  );
}
