import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, X } from "lucide-react";

export interface FinancialFilterValues {
  entity_id: string;
  status: string;
  natureza_financeira_id: string;
  centro_custo_id: string;
  data_baixa_inicio: string;
  data_baixa_fim: string;
  data_lancamento_inicio: string;
  data_lancamento_fim: string;
  data_vencimento_inicio: string;
  data_vencimento_fim: string;
}

const emptyFilters: FinancialFilterValues = {
  entity_id: "", status: "",
  natureza_financeira_id: "", centro_custo_id: "",
  data_baixa_inicio: "", data_baixa_fim: "",
  data_lancamento_inicio: "", data_lancamento_fim: "",
  data_vencimento_inicio: "", data_vencimento_fim: "",
};

interface Props {
  filters: FinancialFilterValues;
  onFiltersChange: (f: FinancialFilterValues) => void;
  entities: { id: string; label: string }[];
  entityLabel: string;
  natures?: { id: string; codigo: string; descricao: string }[];
  costCenters?: { id: string; codigo: string; descricao: string }[];
}

export function FinancialFilters({ filters, onFiltersChange, entities, entityLabel, natures = [], costCenters = [] }: Props) {
  const [open, setOpen] = useState(false);
  const hasFilters = Object.values(filters).some(v => v !== "");

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
            {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Filtros {hasFilters && <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-2xs ml-1">!</span>}
          </Button>
        </CollapsibleTrigger>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => onFiltersChange(emptyFilters)}>
            <X className="h-3 w-3 mr-1" />Limpar
          </Button>
        )}
      </div>
      <CollapsibleContent className="mt-2">
        <div className="flex flex-wrap gap-3 p-3 border rounded-md bg-muted/20">
          <div className="space-y-1 min-w-[160px]">
            <Label className="text-2xs">{entityLabel}</Label>
            <Select value={filters.entity_id} onValueChange={v => onFiltersChange({ ...filters, entity_id: v })}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>{entities.map(e => <SelectItem key={e.id} value={e.id} className="text-xs">{e.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[120px]">
            <Label className="text-2xs">Status</Label>
            <Select value={filters.status} onValueChange={v => onFiltersChange({ ...filters, status: v })}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ABERTO" className="text-xs">Aberto</SelectItem>
                <SelectItem value="PAGO" className="text-xs">Pago</SelectItem>
                <SelectItem value="CANCELADO" className="text-xs">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {natures.length > 0 && (
            <div className="space-y-1 min-w-[180px]">
              <Label className="text-2xs">Natureza Financeira</Label>
              <Select value={filters.natureza_financeira_id} onValueChange={v => onFiltersChange({ ...filters, natureza_financeira_id: v })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>{natures.map(n => <SelectItem key={n.id} value={n.id} className="text-xs">{n.codigo} - {n.descricao}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {costCenters.length > 0 && (
            <div className="space-y-1 min-w-[180px]">
              <Label className="text-2xs">Centro de Custo</Label>
              <Select value={filters.centro_custo_id} onValueChange={v => onFiltersChange({ ...filters, centro_custo_id: v })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>{costCenters.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.codigo} - {c.descricao}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-2xs">Vencimento (De - Até)</Label>
            <div className="flex gap-1">
              <Input type="date" className="h-7 text-xs w-[130px]" value={filters.data_vencimento_inicio} onChange={e => onFiltersChange({ ...filters, data_vencimento_inicio: e.target.value })} />
              <Input type="date" className="h-7 text-xs w-[130px]" value={filters.data_vencimento_fim} onChange={e => onFiltersChange({ ...filters, data_vencimento_fim: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-2xs">Lançamento (De - Até)</Label>
            <div className="flex gap-1">
              <Input type="date" className="h-7 text-xs w-[130px]" value={filters.data_lancamento_inicio} onChange={e => onFiltersChange({ ...filters, data_lancamento_inicio: e.target.value })} />
              <Input type="date" className="h-7 text-xs w-[130px]" value={filters.data_lancamento_fim} onChange={e => onFiltersChange({ ...filters, data_lancamento_fim: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-2xs">Baixa (De - Até)</Label>
            <div className="flex gap-1">
              <Input type="date" className="h-7 text-xs w-[130px]" value={filters.data_baixa_inicio} onChange={e => onFiltersChange({ ...filters, data_baixa_inicio: e.target.value })} />
              <Input type="date" className="h-7 text-xs w-[130px]" value={filters.data_baixa_fim} onChange={e => onFiltersChange({ ...filters, data_baixa_fim: e.target.value })} />
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function applyFinancialFilters<T extends {
  status: string;
  data_vencimento: string;
  data_baixa: string | null;
  data_lancamento?: string;
  fornecedor_id?: string;
  cliente_id?: string;
  natureza_financeira_id?: string | null;
  centro_custo_id?: string | null;
  suppliers?: { razao_social: string } | null;
  customers?: { razao_social: string } | null;
}>(data: T[], filters: FinancialFilterValues, entityField: "fornecedor_id" | "cliente_id"): T[] {
  return data.filter(r => {
    if (filters.entity_id && (r as any)[entityField] !== filters.entity_id) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.natureza_financeira_id && r.natureza_financeira_id !== filters.natureza_financeira_id) return false;
    if (filters.centro_custo_id && r.centro_custo_id !== filters.centro_custo_id) return false;
    if (filters.data_vencimento_inicio && r.data_vencimento < filters.data_vencimento_inicio) return false;
    if (filters.data_vencimento_fim && r.data_vencimento > filters.data_vencimento_fim) return false;
    if (filters.data_baixa_inicio && (!r.data_baixa || r.data_baixa < filters.data_baixa_inicio)) return false;
    if (filters.data_baixa_fim && (!r.data_baixa || r.data_baixa > filters.data_baixa_fim)) return false;
    if (filters.data_lancamento_inicio && (r as any).data_lancamento && (r as any).data_lancamento < filters.data_lancamento_inicio) return false;
    if (filters.data_lancamento_fim && (r as any).data_lancamento && (r as any).data_lancamento > filters.data_lancamento_fim) return false;
    return true;
  });
}

export { emptyFilters };
