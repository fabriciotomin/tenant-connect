import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput, EventClickArg, DateSelectArg, EventDropArg } from "@fullcalendar/core";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  RASCUNHO: "#3b82f6",
  CONFIRMADO: "#22c55e",
  FATURADO: "#a855f7",
  CANCELADO: "#ef4444",
};

const statusLabels: Record<string, string> = {
  RASCUNHO: "Aberta",
  CONFIRMADO: "Concluída",
  FATURADO: "Faturada",
  CANCELADO: "Cancelada",
};

export default function AgendaPage() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    customer_id: "",
    data_inicio: "",
    hora_inicio: "",
    data_fim: "",
    hora_fim: "",
  });

  // Filters
  const [filterCustomer, setFilterCustomer] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: orders = [] } = useQuery({
    queryKey: ["service_orders_agenda"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_orders")
        .select("*, customers(razao_social)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers_select_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, razao_social")
        .eq("ativo", true)
        .order("razao_social");
      if (error) throw error;
      return data;
    },
  });

  const filteredOrders = useMemo(() => {
    return orders.filter((o: any) => {
      if (filterCustomer !== "all" && o.customer_id !== filterCustomer) return false;
      if (filterStatus !== "all" && o.status !== filterStatus) return false;
      return true;
    });
  }, [orders, filterCustomer, filterStatus]);

  const events: EventInput[] = useMemo(() => {
    return filteredOrders
      .filter((o: any) => o.data_inicio && o.hora_inicio)
      .map((o: any) => {
        const start = `${o.data_inicio}T${o.hora_inicio}`;
        const end = o.data_fim && o.hora_fim ? `${o.data_fim}T${o.hora_fim}` : undefined;
        return {
          id: o.id,
          title: (o as any).customers?.razao_social || "OS sem cliente",
          start,
          end,
          backgroundColor: statusColors[o.status] || "#6b7280",
          borderColor: statusColors[o.status] || "#6b7280",
          extendedProps: { status: o.status, order: o },
        };
      });
  }, [filteredOrders]);

  const updateMutation = useMutation({
    mutationFn: async (params: { id: string; data: Record<string, any> }) => {
      const { error } = await supabase
        .from("service_orders")
        .update(params.data)
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_orders_agenda"] });
      queryClient.invalidateQueries({ queryKey: ["service_orders"] });
      toast.success("OS atualizada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("Sem tenant");
      if (!form.customer_id) throw new Error("Cliente obrigatório");
      const { error } = await supabase.from("service_orders").insert({
        tenant_id: tenant.id,
        customer_id: form.customer_id,
        data_inicio: form.data_inicio || null,
        hora_inicio: form.hora_inicio || null,
        data_fim: form.data_fim || null,
        hora_fim: form.hora_fim || null,
        valor_total: 0,
        created_by: user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_orders_agenda"] });
      queryClient.invalidateQueries({ queryKey: ["service_orders"] });
      setDialogOpen(false);
      resetForm();
      toast.success("OS criada pela agenda");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) throw new Error("Sem OS");
      const { error } = await supabase.from("service_orders").update({
        customer_id: form.customer_id,
        data_inicio: form.data_inicio || null,
        hora_inicio: form.hora_inicio || null,
        data_fim: form.data_fim || null,
        hora_fim: form.hora_fim || null,
      }).eq("id", editingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_orders_agenda"] });
      queryClient.invalidateQueries({ queryKey: ["service_orders"] });
      setDialogOpen(false);
      setEditingId(null);
      resetForm();
      toast.success("OS atualizada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => setForm({ customer_id: "", data_inicio: "", hora_inicio: "", data_fim: "", hora_fim: "" });

  const handleDateSelect = useCallback((info: DateSelectArg) => {
    setEditingId(null);
    const startDate = format(info.start, "yyyy-MM-dd");
    const startTime = format(info.start, "HH:mm");
    const endDate = info.end ? format(info.end, "yyyy-MM-dd") : startDate;
    const endTime = info.end ? format(info.end, "HH:mm") : "";
    setForm({ customer_id: "", data_inicio: startDate, hora_inicio: startTime, data_fim: endDate, hora_fim: endTime });
    setDialogOpen(true);
  }, []);

  const handleEventClick = useCallback((info: EventClickArg) => {
    const o = info.event.extendedProps.order;
    if (o.status === "CANCELADO" || o.status === "FATURADO" || o.status === "CONFIRMADO") {
      toast.info("OS não pode ser editada neste status.");
      return;
    }
    setEditingId(o.id);
    setForm({
      customer_id: o.customer_id || "",
      data_inicio: o.data_inicio || "",
      hora_inicio: o.hora_inicio?.substring(0, 5) || "",
      data_fim: o.data_fim || "",
      hora_fim: o.hora_fim?.substring(0, 5) || "",
    });
    setDialogOpen(true);
  }, []);

  const handleEventDrop = useCallback((info: EventDropArg) => {
    const o = info.event.extendedProps.order;
    if (o.status !== "RASCUNHO") {
      toast.error("Só é possível mover OS com status Aberta.");
      info.revert();
      return;
    }
    const newStart = info.event.start;
    const newEnd = info.event.end;
    if (!newStart) { info.revert(); return; }
    const data: Record<string, any> = {
      data_inicio: format(newStart, "yyyy-MM-dd"),
      hora_inicio: format(newStart, "HH:mm:ss"),
    };
    if (newEnd) {
      data.data_fim = format(newEnd, "yyyy-MM-dd");
      data.hora_fim = format(newEnd, "HH:mm:ss");
    }
    updateMutation.mutate({ id: o.id, data });
  }, [updateMutation]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Agenda de Serviços</h1>
        <p className="text-xs text-muted-foreground">Visualize e gerencie ordens de serviço no calendário.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-end">
        <div className="space-y-1">
          <Label className="text-xs">Cliente</Label>
          <Select value={filterCustomer} onValueChange={setFilterCustomer}>
            <SelectTrigger className="h-8 text-xs w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos</SelectItem>
              {customers.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.razao_social}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos</SelectItem>
              <SelectItem value="RASCUNHO" className="text-xs">Aberta</SelectItem>
              <SelectItem value="CONFIRMADO" className="text-xs">Concluída</SelectItem>
              <SelectItem value="FATURADO" className="text-xs">Faturada</SelectItem>
              <SelectItem value="CANCELADO" className="text-xs">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          {Object.entries(statusLabels).map(([k, v]) => (
            <Badge key={k} className="text-2xs" style={{ backgroundColor: statusColors[k], color: "#fff" }}>{v}</Badge>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-card border rounded-lg p-3 agenda-calendar">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          locale="pt-br"
          slotMinTime="07:00:00"
          slotMaxTime="20:00:00"
          allDaySlot={false}
          selectable
          editable
          eventResizableFromStart
          events={events}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={(info) => {
            const o = info.event.extendedProps.order;
            if (o.status !== "RASCUNHO") {
              toast.error("Só é possível redimensionar OS com status Aberta.");
              info.revert();
              return;
            }
            const s = info.event.start;
            const e = info.event.end;
            if (!s) { info.revert(); return; }
            const data: Record<string, any> = {
              data_inicio: format(s, "yyyy-MM-dd"),
              hora_inicio: format(s, "HH:mm:ss"),
            };
            if (e) {
              data.data_fim = format(e, "yyyy-MM-dd");
              data.hora_fim = format(e, "HH:mm:ss");
            }
            updateMutation.mutate({ id: o.id, data });
          }}
          height="auto"
          buttonText={{
            today: "Hoje",
            month: "Mês",
            week: "Semana",
            day: "Dia",
          }}
        />
      </div>

      {/* Dialog Create/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">{editingId ? "Editar OS" : "Nova OS via Agenda"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); editingId ? saveMutation.mutate() : createMutation.mutate(); }} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Cliente *</Label>
              <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.razao_social}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Data Início</Label>
                <Input type="date" className="h-8 text-xs" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hora Início</Label>
                <Input type="time" className="h-8 text-xs" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Data Fim</Label>
                <Input type="date" className="h-8 text-xs" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hora Fim</Label>
                <Input type="time" className="h-8 text-xs" value={form.hora_fim} onChange={(e) => setForm({ ...form, hora_fim: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setDialogOpen(false); setEditingId(null); resetForm(); }}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={createMutation.isPending || saveMutation.isPending}>
                {(createMutation.isPending || saveMutation.isPending) ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
