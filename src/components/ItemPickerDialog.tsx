import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";

export interface PickedItem {
  item_id: string;
  quantidade: number;
  valor_unitario: number;
}

interface ItemPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (items: PickedItem[]) => void;
  excludeIds?: string[];
}

export function ItemPickerDialog({ open, onOpenChange, onConfirm, excludeIds = [] }: ItemPickerDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: ["items_picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("id, codigo, descricao, unidade_medida, saldo_estoque, preco_venda, item_groups(descricao)")
        .eq("ativo", true)
        .order("codigo");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    if (!search) return items;
    const s = search.toLowerCase();
    return items.filter(
      (i) =>
        i.codigo.toLowerCase().includes(s) ||
        i.descricao.toLowerCase().includes(s) ||
        (i.item_groups as any)?.descricao?.toLowerCase().includes(s)
    );
  }, [items, search]);

  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds]);

  function handleToggle(id: string, checked: boolean) {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(id);
      if (!(id in quantities)) setQuantities(q => ({ ...q, [id]: "" }));
    } else {
      next.delete(id);
    }
    setSelectedIds(next);
  }

  function handleConfirm() {
    const result: PickedItem[] = Array.from(selectedIds).map(id => {
      const item = items.find(i => i.id === id);
      return {
        item_id: id,
        quantidade: parseFloat(quantities[id] || "1") || 1,
        valor_unitario: item?.preco_venda || 0,
      };
    });
    onConfirm(result);
    setSelectedIds(new Set());
    setQuantities({});
    setSearch("");
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      setSelectedIds(new Set());
      setQuantities({});
      setSearch("");
    }
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-sm">Selecionar Itens</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, descrição ou grupo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <div className="max-h-[50vh] overflow-auto border rounded-md">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="w-8 p-1.5"></th>
                  <th className="text-left p-1.5">Código</th>
                  <th className="text-left p-1.5">Descrição</th>
                  <th className="text-left p-1.5 w-16">Unidade</th>
                  <th className="text-right p-1.5 w-20">Estoque</th>
                  <th className="text-right p-1.5 w-20">Qtde</th>
                  <th className="text-right p-1.5 w-24">Vlr Unit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-muted-foreground">
                      Nenhum item encontrado.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => {
                    const alreadyAdded = excludeSet.has(item.id);
                    const isSelected = selectedIds.has(item.id);
                    return (
                      <tr
                        key={item.id}
                        className={`border-t hover:bg-muted/30 ${alreadyAdded ? "opacity-40" : ""}`}
                      >
                        <td className="p-1.5 text-center">
                          <Checkbox
                            checked={isSelected}
                            disabled={alreadyAdded}
                            onCheckedChange={(checked) => handleToggle(item.id, !!checked)}
                          />
                        </td>
                        <td className="p-1.5 font-mono">{item.codigo}</td>
                        <td className="p-1.5 truncate max-w-[200px]">{item.descricao}</td>
                        <td className="p-1.5">{item.unidade_medida || "UN"}</td>
                        <td className="p-1.5 text-right">{Number(item.saldo_estoque).toFixed(0)}</td>
                        <td className="p-1">
                          <Input
                            type="number"
                            min="0"
                            step="0.0001"
                            inputMode="decimal"
                            className="h-7 text-xs text-right w-full"
                            value={quantities[item.id] ?? ""}
                            disabled={alreadyAdded || !isSelected}
                            onChange={(e) => setQuantities(q => ({ ...q, [item.id]: e.target.value }))}
                          />
                        </td>
                        <td className="p-1.5 text-right text-muted-foreground">
                          R$ {Number(item.preco_venda).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {filtered.length} item(ns) • {selectedIds.size} selecionado(s)
            </span>
            <Button size="sm" disabled={selectedIds.size === 0} onClick={handleConfirm}>
              Adicionar Selecionados
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
