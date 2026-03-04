import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, addDays } from "date-fns";

export default function CashFlowPage() {
  const today = new Date().toISOString().split("T")[0];
  const futureDefault = addDays(new Date(), 90).toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(futureDefault);

  const { data: receivables = [] } = useQuery({
    queryKey: ["cashflow_receivables", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts_receivable")
        .select("id, valor, data_vencimento, status, documento_origem, customers(razao_social)")
        .gte("data_vencimento", startDate)
        .lte("data_vencimento", endDate)
        .neq("status", "CANCELADO")
        .order("data_vencimento");
      if (error) throw error;
      return data;
    },
  });

  const { data: payables = [] } = useQuery({
    queryKey: ["cashflow_payables", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts_payable")
        .select("id, valor, data_vencimento, status, descricao, suppliers:supplier_id(razao_social)")
        .gte("data_vencimento", startDate)
        .lte("data_vencimento", endDate)
        .neq("status", "CANCELADO")
        .order("data_vencimento");
      if (error) throw error;
      return data;
    },
  });

  const totalReceber = receivables.reduce((s, r: any) => s + Number(r.valor), 0);
  const totalPagar = payables.reduce((s, r: any) => s + Number(r.valor), 0);
  const totalReceberAberto = receivables.filter((r: any) => r.status === "ABERTO").reduce((s, r: any) => s + Number(r.valor), 0);
  const totalPagarAberto = payables.filter((r: any) => r.status === "ABERTO" || r.status === "pendente").reduce((s, r: any) => s + Number(r.valor), 0);
  const saldoProjetado = totalReceberAberto - totalPagarAberto;

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = { ABERTO: "bg-yellow-100 text-yellow-800", PAGO: "bg-green-100 text-green-800", pendente: "bg-yellow-100 text-yellow-800", pago: "bg-green-100 text-green-800" };
    return <Badge className={`text-2xs ${colors[status] || ""}`}>{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Fluxo de Caixa</h1>
        <p className="text-xs text-muted-foreground">Projeção de entradas e saídas por período</p>
      </div>

      <div className="flex gap-3 items-end">
        <div className="space-y-1.5">
          <Label className="text-xs">De</Label>
          <Input type="date" className="h-8 text-xs w-40" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Até</Label>
          <Input type="date" className="h-8 text-xs w-40" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-green-600">A Receber (Aberto)</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-bold text-green-600">{fmt(totalReceberAberto)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-destructive">A Pagar (Aberto)</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-bold text-destructive">{fmt(totalPagarAberto)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Saldo Projetado</CardTitle></CardHeader>
          <CardContent><p className={`text-lg font-bold ${saldoProjetado >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(saldoProjetado)}</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Contas a Receber</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Vencimento</TableHead>
                  <TableHead className="text-xs">Origem</TableHead>
                  <TableHead className="text-xs">Valor</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivables.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{format(new Date(r.data_vencimento), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="text-xs">{r.documento_origem || "—"}</TableCell>
                    <TableCell className="text-xs">{fmt(Number(r.valor))}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                  </TableRow>
                ))}
                {receivables.length === 0 && <TableRow><TableCell colSpan={4} className="text-xs text-center text-muted-foreground">Nenhum título</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Contas a Pagar</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Vencimento</TableHead>
                  <TableHead className="text-xs">Descrição</TableHead>
                  <TableHead className="text-xs">Valor</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payables.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{format(new Date(r.data_vencimento), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="text-xs">{r.descricao || "—"}</TableCell>
                    <TableCell className="text-xs">{fmt(Number(r.valor))}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                  </TableRow>
                ))}
                {payables.length === 0 && <TableRow><TableCell colSpan={4} className="text-xs text-center text-muted-foreground">Nenhum título</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
