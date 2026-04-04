/**
 * src/pages/admin/AdminWorkspacesPage.tsx
 * SDD-1.0 — Gestão global de workspaces da plataforma
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { SwCard, SwBadge } from "@/components/shared/SwComponents";
import { LayoutDashboard, Users, Search } from "lucide-react";
import type { Workspace } from "@/types/app.types";

export default function AdminWorkspacesPage() {
  const { data: workspaces, isLoading } = useQuery({
    queryKey: ["admin_workspaces"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("*, members:workspace_members(count)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <LayoutDashboard className="text-[#a855f7]" size={28} /> Global Workspaces
          </h1>
          <p className="text-stone-400">Monitoramento de todos os tenants (SaaS).</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
          <input type="text" placeholder="Buscar workspace..." className="bg-[#111] border border-[#222] rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#a855f7] transition-colors" />
        </div>
      </div>

      <SwCard glass className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-stone-500">Carregando tenants...</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#111] border-b border-[#222] text-stone-400 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="p-4">Workspace</th>
                <th className="p-4">Slug</th>
                <th className="p-4">Plano</th>
                <th className="p-4">Status</th>
                <th className="p-4">Membros</th>
                <th className="p-4">Criado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {workspaces?.map((ws) => (
                <tr key={ws.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-bold text-white">{ws.name}</td>
                  <td className="p-4 font-mono text-stone-400">{ws.slug}</td>
                  <td className="p-4">
                    <SwBadge variant={ws.plan === "starter" ? "draft" : "accent"}>{ws.plan}</SwBadge>
                  </td>
                  <td className="p-4">
                    <SwBadge variant={ws.status === "active" ? "ghost" : "error"}>{ws.status}</SwBadge>
                  </td>
                  <td className="p-4 text-stone-400 flex items-center gap-2">
                    <Users size={14}/> {ws.members?.[0]?.count || 0}
                  </td>
                  <td className="p-4 text-stone-500">
                    {new Date(ws.created_at).toLocaleDateString()}
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
