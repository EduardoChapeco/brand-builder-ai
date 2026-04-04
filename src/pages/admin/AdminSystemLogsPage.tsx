/**
 * src/pages/admin/AdminSystemLogsPage.tsx
 * SDD-1.0 — Visualização de logs do sistema (Central de Diagnóstico)
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { SwCard, SwBadge } from "@/components/shared/SwComponents";
import { AlertCircle, Code, Server, Terminal } from "lucide-react";
import type { SystemLog } from "@/types/app.types";

export default function AdminSystemLogsPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin_system_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as SystemLog[];
    },
  });

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Terminal className="text-[#a855f7]" size={28} /> System Logs
          </h1>
          <p className="text-stone-400">Diagnóstico central da arquitetura SDD-1.0.</p>
        </div>
      </div>

      <SwCard glass className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-stone-500">Gravando logs...</div>
        ) : logs?.length === 0 ? (
          <div className="p-8 text-center text-stone-500">Nenhum log registrado.</div>
        ) : (
          <div className="divide-y divide-[#222]">
            {logs?.map((log) => (
              <div key={log.id} className="p-4 hover:bg-[#111] transition-colors flex items-start gap-4">
                <div className="mt-1">
                  {log.level === "error" || log.level === "critical" ? (
                    <AlertCircle className="text-red-500" size={18} />
                  ) : log.level === "warning" ? (
                    <AlertCircle className="text-yellow-500" size={18} />
                  ) : (
                    <Server className="text-stone-500" size={18} />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-white">{log.code}</span>
                    <SwBadge variant={log.level === "error" ? "error" : "ghost"}>{log.module}</SwBadge>
                    <span className="text-xs text-stone-500">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-stone-300">{log.message}</p>
                  {log.detail && Object.keys(log.detail).length > 0 && (
                    <div className="mt-2 bg-black/50 p-2 rounded border border-[#222] font-mono text-[10px] text-stone-400 overflow-x-auto">
                      <pre>{JSON.stringify(log.detail, null, 2)}</pre>
                    </div>
                  )}
                </div>
                <div className="text-right text-xs text-stone-500 space-y-1">
                  {log.workspace_id && <div className="flex items-center gap-1 justify-end"><Code size={12}/> ws</div>}
                  <div className={log.resolved ? "text-emerald-500" : "text-yellow-500"}>
                    {log.resolved ? "Resolvido" : "Aberto"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SwCard>
    </div>
  );
}
