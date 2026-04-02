import { useEffect, useMemo, useState } from "react";
import { MousePointerClick, Eye, Activity, BadgePercent } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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

const BioLinkAnalyticsPage = () => {
  const { workspace } = useWorkspace();
  const [events, setEvents] = useState<EventRow[]>([]);

  useEffect(() => {
    if (!workspace?.id) return;
    void supabase
      .from("public_page_events")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(1000)
      .then(({ data }) => setEvents((data || []) as EventRow[]));
  }, [workspace?.id]);

  const summary = useMemo(() => {
    const visits = events.filter((event) => event.event_type === "page_view").length;
    const clicks = events.filter((event) => event.event_type === "block_click" || event.event_type === "cta_conversion").length;
    const forms = events.filter((event) => event.event_type === "form_submit").length;
    const ctr = visits > 0 ? `${((clicks / visits) * 100).toFixed(1)}%` : "0%";
    return { visits, clicks, forms, ctr };
  }, [events]);

  const chartData = useMemo(() => {
    const byDay = new Map<string, { day: string; views: number; clicks: number }>();
    events.forEach((event) => {
      const day = new Date(event.created_at).toISOString().slice(0, 10);
      const current = byDay.get(day) || { day, views: 0, clicks: 0 };
      if (event.event_type === "page_view") current.views += 1;
      if (event.event_type === "block_click" || event.event_type === "cta_conversion") current.clicks += 1;
      byDay.set(day, current);
    });
    return Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));
  }, [events]);

  const blocks = useMemo(() => {
    const grouped = new Map<string, { block: string; clicks: number }>();
    events.forEach((event) => {
      const key = event.block_id || event.block_type || "header";
      const current = grouped.get(key) || { block: event.block_type || "cta", clicks: 0 };
      if (event.event_type === "block_click" || event.event_type === "cta_conversion") current.clicks += 1;
      grouped.set(key, current);
    });
    return Array.from(grouped.values()).sort((a, b) => b.clicks - a.clicks);
  }, [events]);

  const utmRows = useMemo(() => {
    const grouped = new Map<string, { source: string; visits: number }>();
    events.forEach((event) => {
      if (event.event_type !== "page_view") return;
      const source = event.utm_source || "direct";
      grouped.set(source, { source, visits: (grouped.get(source)?.visits || 0) + 1 });
    });
    return Array.from(grouped.values()).sort((a, b) => b.visits - a.visits);
  }, [events]);

  return (
    <div className="page-inner space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Visitas", value: summary.visits, icon: Eye },
          { label: "Cliques", value: summary.clicks, icon: MousePointerClick },
          { label: "Conversões", value: summary.forms, icon: Activity },
          { label: "CTR", value: summary.ctr, icon: BadgePercent },
        ].map((card) => (
          <div key={card.label} className="rounded-3xl border border-[var(--border)] bg-[var(--surface-card)] p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{card.label}</p>
              <card.icon size={16} className="text-[var(--workspace-brand)]" />
            </div>
            <p className="mt-4 text-3xl font-semibold text-[var(--text-primary)]">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-card)] p-5">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Série temporal</p>
            <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">Visitas vs cliques</h3>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="views" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="clicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="views" stroke="#2563eb" fill="url(#views)" />
                <Area type="monotone" dataKey="clicks" stroke="#f97316" fill="url(#clicks)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-card)] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Top blocos</p>
            <div className="mt-4 space-y-3">
              {blocks.slice(0, 6).map((item) => (
                <div key={`${item.block}-${item.clicks}`} className="flex items-center justify-between rounded-2xl border border-[var(--border)] px-4 py-3">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{item.block}</span>
                  <span className="text-sm text-[var(--text-muted)]">{item.clicks} cliques</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-card)] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">UTM source</p>
            <div className="mt-4 space-y-3">
              {utmRows.slice(0, 6).map((item) => (
                <div key={item.source} className="flex items-center justify-between rounded-2xl border border-[var(--border)] px-4 py-3">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{item.source}</span>
                  <span className="text-sm text-[var(--text-muted)]">{item.visits} visitas</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BioLinkAnalyticsPage;
