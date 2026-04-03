import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MousePointerClick, Eye, Activity, BadgePercent, ChevronLeft, TrendingUp, Globe, Zap } from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

type EventRow = {
  id: string;
  created_at: string;
  event_type: string;
  block_type: string | null;
  block_id: string | null;
  target_url: string | null;
  slug: string;
  utm_source: string | null;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111] border border-[#333] rounded-2xl p-3 text-xs shadow-2xl">
      <p className="text-stone-400 mb-2 font-mono">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-stone-300">{p.name}:</span>
          <span className="text-white font-bold">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function BioLinkAnalyticsPage() {
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!workspace?.id) return;
    setIsLoading(true);
    void supabase
      .from("public_page_events")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(1000)
      .then(({ data }) => {
        setEvents((data || []) as EventRow[]);
        setIsLoading(false);
      });
  }, [workspace?.id]);

  const summary = useMemo(() => {
    const visits = events.filter((e) => e.event_type === "page_view").length;
    const clicks = events.filter((e) => e.event_type === "block_click" || e.event_type === "cta_conversion").length;
    const forms = events.filter((e) => e.event_type === "form_submit").length;
    const ctr = visits > 0 ? ((clicks / visits) * 100).toFixed(1) + "%" : "0%";
    return { visits, clicks, forms, ctr };
  }, [events]);

  const chartData = useMemo(() => {
    const byDay = new Map<string, { day: string; views: number; clicks: number }>();
    events.forEach((e) => {
      const day = new Date(e.created_at).toISOString().slice(0, 10);
      const curr = byDay.get(day) || { day, views: 0, clicks: 0 };
      if (e.event_type === "page_view") curr.views += 1;
      if (e.event_type === "block_click" || e.event_type === "cta_conversion") curr.clicks += 1;
      byDay.set(day, curr);
    });
    return Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));
  }, [events]);

  const topBlocks = useMemo(() => {
    const grouped = new Map<string, { block: string; clicks: number }>();
    events.forEach((e) => {
      const key = e.block_id || e.block_type || "header";
      const curr = grouped.get(key) || { block: e.block_type || "cta", clicks: 0 };
      if (e.event_type === "block_click" || e.event_type === "cta_conversion") curr.clicks += 1;
      grouped.set(key, curr);
    });
    return Array.from(grouped.values()).sort((a, b) => b.clicks - a.clicks).slice(0, 8);
  }, [events]);

  const utmRows = useMemo(() => {
    const grouped = new Map<string, { source: string; visits: number }>();
    events.forEach((e) => {
      if (e.event_type !== "page_view") return;
      const source = e.utm_source || "direct";
      grouped.set(source, { source, visits: (grouped.get(source)?.visits || 0) + 1 });
    });
    return Array.from(grouped.values()).sort((a, b) => b.visits - a.visits).slice(0, 8);
  }, [events]);

  const metricCards = [
    { label: "Page Views", value: isLoading ? "—" : summary.visits, icon: Eye, color: "#3b82f6", suffix: "" },
    { label: "Link Clicks", value: isLoading ? "—" : summary.clicks, icon: MousePointerClick, color: "#a855f7", suffix: "" },
    { label: "Form Leads", value: isLoading ? "—" : summary.forms, icon: Activity, color: "#10b981", suffix: "" },
    { label: "Click Through Rate", value: isLoading ? "—" : summary.ctr, icon: BadgePercent, color: "#f59e0b", suffix: "" },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white font-sans overflow-hidden">

      {/* Topbar */}
      <div className="h-[72px] border-b border-[#1f1f1f] bg-black/60 backdrop-blur-2xl flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('../biolink')} className="p-2 border border-[#222] rounded-full hover:bg-white/10 transition-colors text-stone-400 hover:text-white">
            <ChevronLeft size={16}/>
          </button>
          <div>
            <h1 className="text-sm font-bold bg-gradient-to-r from-white to-stone-400 bg-clip-text text-transparent">Analytics Dashboard</h1>
            <p className="text-[10px] text-stone-500 tracking-widest uppercase font-mono mt-0.5">BioLink Performance Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-[#111] border border-[#222] rounded-full text-xs font-mono text-stone-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"/>
            {events.length} eventos analisados
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-8">
        <div className="max-w-[1400px] mx-auto space-y-8">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metricCards.map((card) => (
              <div key={card.label} className="relative overflow-hidden bg-[#0a0a0a] border border-[#1f1f1f] rounded-[28px] p-6 group hover:border-[#333] transition-all">
                {/* Glow */}
                <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-10 pointer-events-none" style={{ background: card.color, filter: "blur(30px)" }} />
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">{card.label}</p>
                  <div className="p-2 rounded-xl" style={{ background: card.color + "20" }}>
                    <card.icon size={14} style={{ color: card.color }} />
                  </div>
                </div>
                <p className="text-3xl font-light text-white font-mono">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Chart + Breakdowns */}
          <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">

            {/* Area Chart */}
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-[28px] p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1">Série temporal</p>
                  <h2 className="text-lg font-semibold text-white">Visitas vs Cliques</h2>
                </div>
                <TrendingUp size={16} className="text-stone-600" />
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="views" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="clicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#a855f7" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="1 8" stroke="#1f1f1f" vertical={false} />
                    <XAxis dataKey="day" stroke="#333" tick={{ fill: "#555", fontSize: 10, fontFamily: "monospace" }} />
                    <YAxis stroke="#333" tick={{ fill: "#555", fontSize: 10 }} width={28} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="views" name="Views" stroke="#3b82f6" fill="url(#views)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="clicks" name="Cliques" stroke="#a855f7" fill="url(#clicks)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right Breakdowns */}
            <div className="space-y-6">

              {/* Top Blocks */}
              <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-[28px] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Zap size={14} className="text-[#f59e0b]"/> Top Blocos</h3>
                </div>
                <div className="space-y-2">
                  {topBlocks.length === 0 ? (
                    <p className="text-xs text-stone-500 py-4 text-center">Nenhum clique registrado ainda.</p>
                  ) : topBlocks.map((item, i) => (
                    <div key={`${item.block}-${i}`} className="flex items-center justify-between px-3 py-2.5 bg-[#111] border border-[#222] rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-stone-600 w-4 text-right">{i + 1}</span>
                        <span className="text-xs font-medium text-stone-300 capitalize">{item.block}</span>
                      </div>
                      <span className="text-xs font-bold text-[#a855f7] font-mono">{item.clicks}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* UTM Sources */}
              <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-[28px] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Globe size={14} className="text-[#3b82f6]"/> Origem do Tráfego</h3>
                </div>
                <div className="space-y-2">
                  {utmRows.length === 0 ? (
                    <p className="text-xs text-stone-500 py-4 text-center">Nenhuma visita registrada ainda.</p>
                  ) : utmRows.map((item) => (
                    <div key={item.source} className="flex items-center justify-between px-3 py-2.5 bg-[#111] border border-[#222] rounded-xl">
                      <span className="text-xs font-medium text-stone-300 capitalize">{item.source}</span>
                      <span className="text-xs font-bold text-[#3b82f6] font-mono">{item.visits}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
