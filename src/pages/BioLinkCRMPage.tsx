import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Mail, MessageSquare, CalendarDays, Users2, ChevronLeft, Search, Filter, MoreVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

type Row = Record<string, unknown>;

const GlassTable = ({ rows, columns }: { rows: Row[]; columns: Array<{ key: string; label: string }> }) => (
  <div className="overflow-hidden rounded-[24px] border border-[#222] bg-[#111]/50 backdrop-blur-md">
    <div className="overflow-x-auto no-scrollbar">
      <table className="min-w-full text-sm">
        <thead className="border-b border-[#222] bg-black/40">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-widest">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1f1f1f]">
          {rows.map((row, rowIndex) => (
            <tr key={String(row.id || rowIndex)} className="transition-colors hover:bg-white/5">
              {columns.map((column) => (
                <td key={column.key} className="px-6 py-4 text-stone-300 font-medium whitespace-nowrap">
                  {String(row[column.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="px-6 py-12 text-center text-stone-500" colSpan={columns.length}>
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full border border-dashed border-[#333] flex items-center justify-center"><Search size={20} className="text-stone-600"/></div>
                  <p>Sem registros encontrados neste filtro.</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

type CrmTab = "contacts" | "messages" | "bookings" | "events" | "downloads";

export default function BioLinkCRMPage() {
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  
  const [activeTab, setActiveTab] = useState<CrmTab>("contacts");
  const [contacts, setContacts] = useState<Row[]>([]);
  const [messages, setMessages] = useState<Row[]>([]);
  const [bookings, setBookings] = useState<Row[]>([]);
  const [events, setEvents] = useState<Row[]>([]);
  const [downloads, setDownloads] = useState<Row[]>([]);

  useEffect(() => {
    if (!workspace?.id) return;
    void Promise.all([
      supabase.from("crm_contacts").select("*").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("crm_messages").select("*").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("crm_bookings").select("*").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("crm_event_registrations").select("*").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("crm_downloads").select("*").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(100),
    ]).then(([contactsRes, messagesRes, bookingsRes, eventsRes, downloadsRes]) => {
      setContacts((contactsRes.data || []) as Row[]);
      setMessages((messagesRes.data || []) as Row[]);
      setBookings((bookingsRes.data || []) as Row[]);
      setEvents((eventsRes.data || []) as Row[]);
      setDownloads((downloadsRes.data || []) as Row[]);
    });
  }, [workspace?.id]);

  const cards = useMemo(
    () => [
      { id: "contacts", label: "Audience Base", value: contacts.length, icon: Users2, color: "text-[#3b82f6]" },
      { id: "messages", label: "Inbox Messages", value: messages.length, icon: MessageSquare, color: "text-[#a855f7]" },
      { id: "bookings", label: "Active Bookings", value: bookings.length, icon: CalendarDays, color: "text-[#10b981]" },
      { id: "events", label: "Event Regs", value: events.length, icon: CalendarDays, color: "text-[#f59e0b]" },
      { id: "downloads", label: "Asset Downloads", value: downloads.length, icon: Download, color: "text-[#ec4899]" },
    ],
    [bookings.length, contacts.length, downloads.length, events.length, messages.length]
  );

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white font-sans overflow-hidden">
      
      {/* Topbar */}
      <div className="h-[72px] border-b border-[#1f1f1f] bg-black/60 backdrop-blur-2xl flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('../biolink')} className="p-2 border border-[#222] rounded-full hover:bg-white/10 transition-colors text-stone-400 hover:text-white">
            <ChevronLeft size={16}/>
          </button>
          <div>
             <h1 className="text-sm font-bold bg-gradient-to-r from-white to-stone-400 bg-clip-text text-transparent">Centro de Relacionamento (CRM)</h1>
             <p className="text-[10px] text-stone-500 tracking-widest uppercase font-mono mt-0.5">Visão Unificada do BioLink</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
            <input placeholder="Buscar no CRM..." className="w-64 bg-[#111] border border-[#222] rounded-full text-xs text-white px-9 py-2 outline-none focus:border-[#3b82f6] transition-colors" />
          </div>
          <button className="px-4 py-2 bg-[#111] border border-[#222] rounded-full text-xs font-bold text-stone-300 hover:text-white flex items-center gap-2"><Filter size={14}/> Filtrar</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full max-w-[1440px] mx-auto p-8 flex flex-col gap-8">
        
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {cards.map((card) => (
            <button key={card.id} onClick={() => setActiveTab(card.id as CrmTab)} className={`flex flex-col text-left rounded-[24px] border border-[#222] p-5 transition-all w-full ${activeTab === card.id ? 'bg-[#111] ring-1 ring-[#3b82f6] shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'bg-[#0a0a0a] hover:bg-[#111]'}`}>
              <div className="flex items-center justify-between w-full mb-4">
                <p className="text-[10px] uppercase font-bold tracking-widest text-stone-500">{card.label}</p>
                <card.icon size={16} className={card.color} />
              </div>
              <p className="text-3xl font-light text-white font-mono">{card.value}</p>
            </button>
          ))}
        </div>

        {/* Selected Data View */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a] border border-[#1f1f1f] rounded-[32px] p-2">
           <div className="px-6 py-5 flex items-center justify-between border-b border-[#1f1f1f]">
             <h2 className="text-sm font-bold text-white capitalize">{activeTab} Details</h2>
             <button className="p-2 text-stone-500 hover:text-white transition-colors"><MoreVertical size={16}/></button>
           </div>
           
           <div className="p-4 flex-1">
             {activeTab === "contacts" && (
                <GlassTable rows={contacts} columns={[{ key: "name", label: "Nome" }, { key: "primary_email", label: "E-mail Principal" }, { key: "phone", label: "Telefone" }, { key: "status", label: "Status" }, { key: "created_at", label: "Data de Criação" }]} />
             )}
             {activeTab === "messages" && (
                <GlassTable rows={messages} columns={[{ key: "subject", label: "Tópico / Assunto" }, { key: "status", label: "Status de Leitura" }, { key: "created_at", label: "Data" }, { key: "body", label: "Conteúdo" }]} />
             )}
             {activeTab === "bookings" && (
                <GlassTable rows={bookings} columns={[{ key: "service_name", label: "Serviço Retido" }, { key: "scheduled_at", label: "Data Agendada" }, { key: "status", label: "Status" }, { key: "created_at", label: "Criado Em" }]} />
             )}
             {activeTab === "events" && (
                <GlassTable rows={events} columns={[{ key: "event_name", label: "Nome do Evento" }, { key: "event_date", label: "Data" }, { key: "status", label: "Status Inscrição" }, { key: "created_at", label: "Registro" }]} />
             )}
             {activeTab === "downloads" && (
                <GlassTable rows={downloads} columns={[{ key: "asset_name", label: "Arquivo" }, { key: "asset_url", label: "Link" }, { key: "created_at", label: "Data Download" }]} />
             )}
           </div>
        </div>

      </div>

    </div>
  );
}
