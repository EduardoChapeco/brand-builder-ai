/**
 * src/pages/admin/AdminUsersPage.tsx
 * SDD-1.0 — Gestão global de usuários
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { SwCard, SwBadge } from "@/components/shared/SwComponents";
import { Users, Search, ShieldAlert } from "lucide-react";

export default function AdminUsersPage() {
  const { data: userMemberships, isLoading } = useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      // Retorna todos os membros do workspace para dar visibilidade de quem está em que workspace
      const { data, error } = await supabase
        .from("workspace_members")
        .select("id, user_id, role, joined_at, workspaces(name, slug)")
        .order("joined_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Users className="text-[#a855f7]" size={28} /> Usuários da Plataforma
          </h1>
          <p className="text-stone-400">Verifique os vínculos de usuários com os workspaces.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
          <input type="text" placeholder="Buscar ID do usuário..." className="bg-[#111] border border-[#222] rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#a855f7] transition-colors" />
        </div>
      </div>

      <SwCard glass className="p-4 bg-yellow-500/10 border-yellow-500/20 text-yellow-200 flex items-center gap-3">
        <ShieldAlert size={20} className="shrink-0" />
        <p className="text-sm">Por limitações de segurança e design do Supabase Auth, o objeto auth.users real não é acessível diretamente via API pública. Estamos listando as <strong>filiações de membros</strong> (workspace_members) para auditoria.</p>
      </SwCard>

      <SwCard glass className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-stone-500">Carregando permissões...</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#111] border-b border-[#222] text-stone-400 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="p-4">User ID (Auth)</th>
                <th className="p-4">Workspace Vinculado</th>
                <th className="p-4">Role</th>
                <th className="p-4">Data do Vínculo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {userMemberships?.map((mem) => (
                <tr key={mem.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-mono text-stone-400 text-xs">{mem.user_id}</td>
                  <td className="p-4 font-bold text-white">{(mem.workspaces as unknown as {name: string, slug: string})?.name}</td>
                  <td className="p-4">
                    <SwBadge variant={mem.role === "owner" ? "accent" : mem.role === "admin" ? "ghost" : "draft"}>{mem.role}</SwBadge>
                  </td>
                  <td className="p-4 text-stone-500">
                    {new Date(mem.joined_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SwCard>
    </div>
  );
}
