import { useEffect, useMemo, useState } from "react";
import { Download, Mail, MessageSquare, CalendarDays, Users2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Row = Record<string, unknown>;

const Table = ({ rows, columns }: { rows: Row[]; columns: Array<{ key: string; label: string }> }) => (
  <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-card)]">
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-[var(--surface-2)] text-left text-[var(--text-muted)]">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 font-medium">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={String(row.id || rowIndex)} className="border-t border-[var(--border)]">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-[var(--text-primary)]">
                  {String(row[column.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-center text-[var(--text-muted)]" colSpan={columns.length}>
                Sem dados neste momento.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  </div>
);

const BioLinkCRMPage = () => {
  const { workspace } = useWorkspace();
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
      { label: "Contatos", value: contacts.length, icon: Users2 },
      { label: "Mensagens", value: messages.length, icon: MessageSquare },
      { label: "Agendamentos", value: bookings.length, icon: CalendarDays },
      { label: "Downloads", value: downloads.length, icon: Download },
      { label: "E-mails", value: contacts.filter((item) => item.primary_email).length, icon: Mail },
    ],
    [bookings.length, contacts, downloads.length, messages.length],
  );

  return (
    <div className="page-inner space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="rounded-3xl border border-[var(--border)] bg-[var(--surface-card)] p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{card.label}</p>
              <card.icon size={16} className="text-[var(--workspace-brand)]" />
            </div>
            <p className="mt-4 text-3xl font-semibold text-[var(--text-primary)]">{card.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="contacts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contacts">Contatos</TabsTrigger>
          <TabsTrigger value="messages">Mensagens</TabsTrigger>
          <TabsTrigger value="bookings">Agendamentos</TabsTrigger>
          <TabsTrigger value="events">Eventos</TabsTrigger>
          <TabsTrigger value="downloads">Downloads</TabsTrigger>
        </TabsList>
        <TabsContent value="contacts">
          <Table rows={contacts} columns={[{ key: "name", label: "Nome" }, { key: "primary_email", label: "Email" }, { key: "phone", label: "Telefone" }, { key: "status", label: "Status" }, { key: "created_at", label: "Data" }]} />
        </TabsContent>
        <TabsContent value="messages">
          <Table rows={messages} columns={[{ key: "subject", label: "Assunto" }, { key: "status", label: "Status" }, { key: "created_at", label: "Data" }, { key: "body", label: "Mensagem" }]} />
        </TabsContent>
        <TabsContent value="bookings">
          <Table rows={bookings} columns={[{ key: "service_name", label: "Serviço" }, { key: "scheduled_at", label: "Agendado para" }, { key: "status", label: "Status" }, { key: "created_at", label: "Criado" }]} />
        </TabsContent>
        <TabsContent value="events">
          <Table rows={events} columns={[{ key: "event_name", label: "Evento" }, { key: "event_date", label: "Data" }, { key: "status", label: "Status" }, { key: "created_at", label: "Inscrição" }]} />
        </TabsContent>
        <TabsContent value="downloads">
          <Table rows={downloads} columns={[{ key: "asset_name", label: "Asset" }, { key: "asset_url", label: "URL" }, { key: "created_at", label: "Data" }]} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BioLinkCRMPage;
