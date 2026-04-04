/**
 * src/pages/admin/AdminDashboardPage.tsx
 * SDD-1.0 — Painel Central do Admin com métricas reais do banco
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { SwCard, SwBadge } from "@/components/shared/SwComponents";
import { Activity, LayoutDashboard, Users, ShieldCheck, AlertTriangle, Key } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboardPage() {
  const nav = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin_dashboard_stats"],
    queryFn: async () => {
      const [ws, users, pubs, logs, keys] = await Promise.all([
        supabase.from("workspaces").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("publications").select("id", { count: "exact", head: true }),
        supabase.from("system_logs").select("id", { count: "exact", head: true }).eq("resolved", false).eq("level", "error"),
        supabase.from("admin_api_keys").select("id", { count: "exact", head: true }),
      ]);
      return {
        workspaces: ws.count ?? 0,
        users: users.count ?? 0,
        publications: pubs.count ?? 0,
        errors: logs.count ?? 0,
        keys: keys.count ?? 0,
      };
    },
  });

  const cards = [
    { label: "Workspaces", value: isLoading ? "..." : stats?.workspaces ?? 0, icon: LayoutDashboard, href: "/admin/workspaces" },
    { label: "Usuários Totais", value: isLoading ? "..." : stats?.users ?? 0, icon: Users, href: "/admin/usuarios" },
    { label: "Publicações", value: isLoading ? "..." : stats?.publications ?? 0, icon: ShieldCheck, href: "/admin/workspaces" },
    { label: "Erros Ativos", value: isLoading ? "..." : stats?.errors ?? 0, icon: AlertTriangle, color: stats && stats.errors > 0 ? "text-rose-400" : "text-emerald-400", href: "/admin/logs" },
  ];


  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <Activity className="text-[#a855f7]" size={32} /> Admin Dashboard
        </h1>
        <p className="text-stone-400">Visão geral da plataforma Simwork em tempo real.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <SwCard key={i} glass className={`p-5 ${c.href ? "cursor-pointer hover:border-white/10 transition-colors" : ""}`}
            onClick={c.href ? () => nav(c.href!) : undefined}>
            <div className="text-stone-500 mb-3 flex items-center gap-2">
              <c.icon size={16} /> <span className="text-[10px] font-bold uppercase tracking-widest">{c.label}</span>
            </div>
            <p className={`text-3xl font-bold ${c.color || "text-white"}`}>{String(c.value)}</p>
          </SwCard>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SwCard glass className="p-6">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Key size={16} /> Acesso Rápido</h3>
          <div className="space-y-2">
            {[
              { label: "Gerenciar Chaves de IA", href: "/admin/chaves-ia", badge: "Activo" },
              { label: "Logs do Sistema", href: "/admin/logs", badge: "Debug" },
              { label: "Usuários", href: "/admin/usuarios", badge: "Config" },
              { label: "Workspaces", href: "/admin/workspaces", badge: "Config" },
            ].map((item, i) => (
              <button key={i} onClick={() => nav(item.href)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left">
                <span className="text-sm text-stone-300">{item.label}</span>
                <SwBadge variant="draft">{item.badge}</SwBadge>
              </button>
            ))}
          </div>
        </SwCard>
        <SwCard glass className="p-6">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Users size={16} /> Informações do Sistema</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-stone-500">Projeto Supabase</span><span className="text-stone-300 font-mono text-xs">xhdoupxnpjbzkzuhucpp</span></div>
            <div className="flex justify-between"><span className="text-stone-500">Versão SDD</span><span className="text-stone-300">1.0</span></div>
            <div className="flex justify-between"><span className="text-stone-500">Deploy</span><span className="text-stone-300">Cloudflare Pages</span></div>
            <div className="flex justify-between"><span className="text-stone-500">Auth Provider</span><span className="text-stone-300">Supabase Auth</span></div>
          </div>
        </SwCard>
      </div>
    </div>
  );
}
