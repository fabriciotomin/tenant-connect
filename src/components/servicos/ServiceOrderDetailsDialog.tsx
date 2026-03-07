import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

const statusColors: Record<string, string> = {
  RASCUNHO: "bg-yellow-100 text-yellow-800",
  CONFIRMADO: "bg-blue-100 text-blue-800",
  FATURADO: "bg-green-100 text-green-800",
  CANCELADO: "bg-red-100 text-red-800",
};

interface Props {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServiceOrderDetailsDialog({ orderId, open, onOpenChange }: Props) {
  const { data: order } = useQuery({
    queryKey: ["service_order_detail", orderId],
    enabled: !!orderId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_orders")
        .select("*, customers(razao_social), payment_conditions:condicao_pagamento_id(descricao)")
        .eq("id", orderId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["service_order_items_detail", orderId],
    enabled: !!orderId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_order_items")
        .select("*, items(codigo, descricao, tipo_item)")
        .eq("service_order_id", orderId!);
      if (error) throw error;
      return data;
    },
  });

  if (!order) return null;

  const o = order as any;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">Detalhes da Ordem de Serviço</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-muted-foreground">ID:</span>
              <p className="font-mono">{o.id.slice(0, 8)}...</p>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <div><Badge className={`text-2xs ${statusColors[o.status] || ""}`}>{o.status}</Badge></div>
            </div>
            <div>
              <span className="text-muted-foreground">Cliente:</span>
              <p className="font-medium">{o.customers?.razao_social || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Cond. Pagamento:</span>
              <p>{(o.payment_conditions as any)?.descricao || "—"}</p>
            </div>
          </div>

          <div className="border-t pt-3">
            <h4 className="font-medium mb-2">Agendamento</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-muted-foreground">Data Início:</span>
                <p>{o.data_inicio ? format(parseISO(o.data_inicio), "dd/MM/yyyy") : "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Hora Início:</span>
                <p>{o.hora_inicio || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Data Fim:</span>
                <p>{o.data_fim ? format(parseISO(o.data_fim), "dd/MM/yyyy") : "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Hora Fim:</span>
                <p>{o.hora_fim || "—"}</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-3">
            <h4 className="font-medium mb-2">Itens / Serviços</h4>
            {items.length === 0 ? (
              <p className="text-muted-foreground">Nenhum item.</p>
            ) : (
              <div className="space-y-1">
                {items.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center border rounded px-2 py-1.5 bg-muted/30">
                    <span className="truncate flex-1">
                      {item.items?.codigo} - {item.items?.descricao}
                      <Badge variant="outline" className="ml-2 text-2xs">{item.items?.tipo_item}</Badge>
                    </span>
                    <span className="ml-2 whitespace-nowrap">
                      {Number(item.quantidade).toFixed(2)} × R$ {Number(item.valor_unitario).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t pt-3 flex justify-between font-medium">
            <span>Valor Total:</span>
            <span>R$ {Number(o.valor_total).toFixed(2)}</span>
          </div>

          <div className="border-t pt-3 grid grid-cols-2 gap-3 text-muted-foreground">
            <div>
              <span>Criado em:</span>
              <p>{format(new Date(o.created_at), "dd/MM/yyyy HH:mm")}</p>
            </div>
            <div>
              <span>Atualizado em:</span>
              <p>{format(new Date(o.updated_at), "dd/MM/yyyy HH:mm")}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
