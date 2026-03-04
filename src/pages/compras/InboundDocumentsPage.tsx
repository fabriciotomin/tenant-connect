import { useState, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Trash2, CheckCircle, XCircle, Upload, Link2, Eye } from "lucide-react";
import { ItemPickerDialog, PickedItem } from "@/components/ItemPickerDialog";
import { useFinancialClassification } from "@/hooks/useFinancialClassification";
import { XmlImportDialog } from "@/components/compras/XmlImportDialog";

const statusColors: Record<string, string> = {
  PENDENTE: "bg-yellow-100 text-yellow-800",
  PROCESSADO: "bg-green-100 text-green-800",
  CANCELADO: "bg-red-100 text-red-800",
};

interface InboundDoc {
  id: string;
  numero: string | null;
  serie: string | null;
  chave_acesso: string | null;
  valor_total: number;
  status: string;
  created_at: string;
  fornecedor_id: string;
  purchase_order_id: string | null;
  condicao_pagamento_id: string | null;
  suppliers?: { razao_social: string } | null;
  purchase_orders?: { numero_sequencial: number } | null;
}

interface DocItem {
  id?: string;
  item_id: string;
  quantidade: number;
  valor_unitario: number;
  impostos: number;
  items?: { codigo: string; descricao: string; unidade_medida?: string } | null;
}

interface PurchaseOrder {
  id: string;
  numero_sequencial: number;
  status: string;
  fornecedor_id: string;
  fornecedor_nome: string;
  condicao_pagamento_id: string | null;
  valor_frete: number;
}

interface ManualItem {
  item_id: string;
  codigo: string;
  descricao: string;
  unidade_medida: string;
  quantidade: string;
  valor_unitario: string;
  impostos: string;
  frete_item: string;
  natureza_financeira_id: string;
  centro_custo_id: string;
}

export default function InboundDocumentsPage() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { natures, costCenters } = useFinancialClassification();

  const [openManual, setOpenManual] = useState(false);
  const [openXml, setOpenXml] = useState(false);
  const [openFromPO, setOpenFromPO] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [openItemPicker, setOpenItemPicker] = useState(false);
  const [confirmDialogId, setConfirmDialogId] = useState<string | null>(null);
  const [cancelDialogId, setCancelDialogId] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<InboundDoc | null>(null);
  const [xmlParsing, setXmlParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual form
  const [form, setForm] = useState({
    fornecedor_id: "",
    condicao_pagamento_id: "",
    numero: "",
    serie: "",
    data_emissao: new Date().toISOString().split("T")[0],
    frete_total: "0",
    frete_modo: "ratear" as "ratear" | "manual",
  });

  const [newItems, setNewItems] = useState<ManualItem[]>([]);

  // XML parsed data
  const [xmlData, setXmlData] = useState<any>(null);
  const [xmlForm, setXmlForm] = useState({
    fornecedor_id: "",
    condicao_pagamento_id: "",
    forma_pagamento_id: "",
    create_supplier: false,
  });
  const [xmlItemMappings, setXmlItemMappings] = useState<{ item_id: string; quantidade: string; valor_unitario: string; impostos: string }[]>([]);

  // PO selection
  const [selectedPOId, setSelectedPOId] = useState("");
  const [poCondicao, setPoCondicao] = useState("");
  const [poFiscal, setPoFiscal] = useState({ data_emissao: new Date().toISOString().split("T")[0], serie: "", numero: "" });
  const [poItems, setPoItems] = useState<{ item_id: string; quantidade: string; valor_unitario: string; impostos: string; item_codigo?: string; item_descricao?: string }[]>([]);

  // ---- Queries ----
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["inbound_documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inbound_documents")
        .select("*, suppliers(razao_social), purchase_orders(numero_sequencial)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as InboundDoc[];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers_select_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, razao_social, cnpj")
        .eq("ativo", true)
        .order("razao_social");
      if (error) throw error;
      return data;
    },
  });

  const { data: paymentConditions = [] } = useQuery({
    queryKey: ["payment_conditions_select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_conditions")
        .select("id, descricao, numero_parcelas, dias_entre_parcelas")
        .order("descricao");
      if (error) throw error;
      return data;
    },
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["formas_pagamento_select_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("formas_pagamento")
        .select("id, nome, tipo")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ["items_select_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("id, codigo, descricao, saldo_estoque, custo_medio, unidade_medida, natureza_financeira_id, centro_custo_id")
        .eq("ativo", true)
        .order("codigo");
      if (error) throw error;
      return data;
    },
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["purchase_orders_open", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_purchase_orders_with_pending_balance", { p_tenant_id: tenant!.id });
      if (error) throw error;
      return (data || []) as PurchaseOrder[];
    },
  });

  const { data: docItems = [] } = useQuery({
    queryKey: ["inbound_doc_items", selectedDoc?.id],
    enabled: !!selectedDoc,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inbound_document_items")
        .select("*, items(codigo, descricao, unidade_medida)")
        .eq("inbound_document_id", selectedDoc!.id);
      if (error) throw error;
      return data as DocItem[];
    },
  });

  const { data: docPayables = [] } = useQuery({
    queryKey: ["doc_payables", selectedDoc?.id],
    enabled: !!selectedDoc && selectedDoc.status === "PROCESSADO",
    queryFn: async () => {
      const docRef = "NF-E-" + (selectedDoc!.numero || selectedDoc!.id);
      const { data, error } = await supabase
        .from("accounts_payable")
        .select("id, valor, data_vencimento, status, documento_origem")
        .like("documento_origem", docRef + "%");
      if (error) throw error;
      return data;
    },
  });

  // ---- Computed: frete rateado ----
  const freteTotal = parseFloat(form.frete_total || "0");

  const itemSubtotals = useMemo(() => {
    return newItems.map((item) => {
      const qty = parseFloat(item.quantidade || "0");
      const price = parseFloat(item.valor_unitario || "0");
      return qty * price;
    });
  }, [newItems]);

  const totalItensValue = useMemo(() => itemSubtotals.reduce((a, b) => a + b, 0), [itemSubtotals]);

  const computedFretePerItem = useMemo(() => {
    if (form.frete_modo !== "ratear" || freteTotal <= 0 || totalItensValue <= 0) {
      return newItems.map(() => 0);
    }
    return itemSubtotals.map((sub) => (sub / totalItensValue) * freteTotal);
  }, [form.frete_modo, freteTotal, totalItensValue, itemSubtotals, newItems]);

  const grandTotal = useMemo(() => {
    return newItems.reduce((sum, item, idx) => {
      const qty = parseFloat(item.quantidade || "0");
      const price = parseFloat(item.valor_unitario || "0");
      const imp = parseFloat(item.impostos || "0");
      const frete = form.frete_modo === "ratear" ? computedFretePerItem[idx] : parseFloat(item.frete_item || "0");
      return sum + qty * price + imp + frete;
    }, 0);
  }, [newItems, form.frete_modo, computedFretePerItem]);

  // ---- Mutations ----
  const createDocMutation = useMutation({
    mutationFn: async (params: {
      fornecedor_id: string;
      condicao_pagamento_id: string;
      forma_pagamento_id?: string;
      numero: string;
      serie: string;
      data_emissao?: string;
      chave_acesso?: string;
      purchase_order_id?: string;
      items: { item_id: string; quantidade: number; valor_unitario: number; impostos: number; natureza_financeira_id?: string; centro_custo_id?: string }[];
      supplier_item_mappings?: { supplier_id: string; supplier_item_description: string; supplier_item_code: string; item_id: string }[];
    }) => {
      if (!tenant?.id) throw new Error("Sem tenant");
      if (!params.fornecedor_id) throw new Error("Fornecedor obrigatório");
      if (params.items.length === 0) throw new Error("Adicione ao menos um item");

      // Validate uniqueness per fornecedor + serie + numero
      if (params.serie && params.numero) {
        const { data: existing } = await supabase
          .from("inbound_documents")
          .select("id")
          .eq("tenant_id", tenant.id)
          .eq("fornecedor_id", params.fornecedor_id)
          .eq("serie", params.serie)
          .eq("numero", params.numero)
          .neq("status", "CANCELADO" as any)
          .limit(1);
        if (existing && existing.length > 0) {
          throw new Error(`Já existe um documento deste fornecedor com Série ${params.serie} e Número ${params.numero}.`);
        }
      }

      const valorTotal = params.items.reduce(
        (sum, i) => sum + i.quantidade * i.valor_unitario + i.impostos, 0
      );

      const { data: doc, error: docError } = await supabase
        .from("inbound_documents")
        .insert({
          tenant_id: tenant.id,
          fornecedor_id: params.fornecedor_id,
          condicao_pagamento_id: params.condicao_pagamento_id || null,
          forma_pagamento_id: params.forma_pagamento_id || null,
          numero: params.numero || null,
          serie: params.serie || null,
          data_emissao: params.data_emissao || new Date().toISOString().split("T")[0],
          chave_acesso: params.chave_acesso || null,
          purchase_order_id: params.purchase_order_id || null,
          valor_total: valorTotal,
          created_by: user?.id,
        } as any)
        .select("id")
        .single();
      if (docError) throw docError;

      const itemsToInsert = params.items.map((i) => ({
        inbound_document_id: doc.id,
        item_id: i.item_id,
        quantidade: i.quantidade,
        valor_unitario: i.valor_unitario,
        impostos: i.impostos,
        natureza_financeira_id: (i as any).natureza_financeira_id || null,
        centro_custo_id: (i as any).centro_custo_id || null,
      }));

      const { error: itemsError } = await supabase
        .from("inbound_document_items")
        .insert(itemsToInsert);
      if (itemsError) throw itemsError;

      // Save supplier item mappings for future auto-matching
      if (params.supplier_item_mappings && params.supplier_item_mappings.length > 0 && tenant?.id) {
        const mappingsToUpsert = params.supplier_item_mappings
          .filter((mapping) => mapping.item_id && (mapping.supplier_item_description || mapping.supplier_item_code))
          .map((mapping) => ({
            tenant_id: tenant.id,
            supplier_id: mapping.supplier_id,
            supplier_item_description: (mapping.supplier_item_description || mapping.supplier_item_code).trim(),
            supplier_item_code: mapping.supplier_item_code?.trim() || null,
            item_id: mapping.item_id,
          }));

        if (mappingsToUpsert.length > 0) {
          const { error: mappingsError } = await supabase
            .from("supplier_item_mappings")
            .upsert(mappingsToUpsert, { onConflict: "tenant_id,supplier_id,supplier_item_description" });

          if (mappingsError) throw mappingsError;
        }
      }

      return doc.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbound_documents"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_orders_open"] });
      setOpenManual(false);
      setOpenXml(false);
      setOpenFromPO(false);
      resetForm();
      toast.success("Documento de entrada criado com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const confirmMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.rpc("confirmar_documento_entrada", {
        p_document_id: docId,
        p_user_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbound_documents"] });
      queryClient.invalidateQueries({ queryKey: ["items_select"] });
      queryClient.invalidateQueries({ queryKey: ["accounts_payable"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_orders_open"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
      setConfirmDialogId(null);
      setOpenDetail(false);
      toast.success("Documento confirmado! Estoque movimentado, contas a pagar geradas.");
    },
    onError: (e: any) => toast.error(`Erro ao confirmar: ${e.message}`),
  });

  const cancelPendenteMutation = useMutation({
    mutationFn: async (docId: string) => {
      // Delete items first so trigger recalculates PO status
      const { error: delErr } = await supabase
        .from("inbound_document_items")
        .delete()
        .eq("inbound_document_id", docId);
      if (delErr) throw delErr;

      const { error } = await supabase
        .from("inbound_documents")
        .update({ status: "CANCELADO" as any, updated_by: user?.id })
        .eq("id", docId)
        .eq("status", "PENDENTE" as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbound_documents"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_orders_open"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
      setCancelDialogId(null);
      setOpenDetail(false);
      toast.success("Documento pendente cancelado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancelConfirmadoMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.rpc("cancelar_documento_entrada", {
        p_document_id: docId,
        p_user_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbound_documents"] });
      queryClient.invalidateQueries({ queryKey: ["items_select"] });
      queryClient.invalidateQueries({ queryKey: ["accounts_payable"] });
      setCancelDialogId(null);
      setOpenDetail(false);
      toast.success("Documento cancelado com estorno de estoque e financeiro");
    },
    onError: (e: any) => toast.error(`Erro ao cancelar: ${e.message}`),
  });

  const addItemToDoc = useMutation({
    mutationFn: async ({ docId, item }: { docId: string; item: { item_id: string; quantidade: number; valor_unitario: number; impostos: number } }) => {
      const { error } = await supabase.from("inbound_document_items").insert({
        inbound_document_id: docId, ...item,
      });
      if (error) throw error;

      const { data: allDocItems } = await supabase
        .from("inbound_document_items")
        .select("quantidade, valor_unitario, impostos")
        .eq("inbound_document_id", docId);

      const newTotal = (allDocItems || []).reduce(
        (sum, i) => sum + i.quantidade * i.valor_unitario + i.impostos, 0
      );
      await supabase.from("inbound_documents").update({ valor_total: newTotal }).eq("id", docId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbound_doc_items"] });
      queryClient.invalidateQueries({ queryKey: ["inbound_documents"] });
      toast.success("Item adicionado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeItemFromDoc = useMutation({
    mutationFn: async ({ itemId, docId }: { itemId: string; docId: string }) => {
      const { error } = await supabase.from("inbound_document_items").delete().eq("id", itemId);
      if (error) throw error;

      const { data: allDocItems } = await supabase
        .from("inbound_document_items")
        .select("quantidade, valor_unitario, impostos")
        .eq("inbound_document_id", docId);

      const newTotal = (allDocItems || []).reduce(
        (sum, i) => sum + i.quantidade * i.valor_unitario + i.impostos, 0
      );
      await supabase.from("inbound_documents").update({ valor_total: newTotal }).eq("id", docId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbound_doc_items"] });
      queryClient.invalidateQueries({ queryKey: ["inbound_documents"] });
      toast.success("Item removido");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ---- XML Import ----
  async function handleXmlUpload(file: File) {
    setXmlParsing(true);
    try {
      const xmlContent = await file.text();
      const { data, error } = await supabase.functions.invoke("parse-nfe-xml", {
        body: { xml_content: xmlContent },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setXmlData(data);

      const cnpjClean = (data.emitente.cnpj || "").replace(/\D/g, "");
      const found = suppliers.find(
        (s) => (s.cnpj || "").replace(/\D/g, "") === cnpjClean
      );

      setXmlForm({
        fornecedor_id: found?.id || "",
        condicao_pagamento_id: "",
        forma_pagamento_id: "",
        create_supplier: false,
      });

      setXmlItemMappings(
        data.itens.map((xi: any) => ({
          item_id: "",
          quantidade: String(xi.quantidade),
          valor_unitario: String(xi.valor_unitario),
          impostos: String(xi.impostos_total || 0),
        }))
      );

      if (!found) {
        toast.info(`Fornecedor CNPJ ${cnpjClean} não encontrado. Crie manualmente ou selecione um existente.`);
      }

      setOpenXml(true);
    } catch (err: any) {
      toast.error(`Erro ao processar XML: ${err.message}`);
    } finally {
      setXmlParsing(false);
    }
  }

  // (XML supplier creation and submission handled by XmlImportDialog)

  // ---- PO Import ----
  async function loadPOItems(poId: string) {
    setSelectedPOId(poId);
    const po = purchaseOrders.find((p) => p.id === poId);
    setPoCondicao(po?.condicao_pagamento_id || "");

    const { data, error } = await supabase
      .rpc("get_po_pending_items", { p_purchase_order_id: poId });

    if (error) {
      toast.error(error.message);
      return;
    }

    setPoItems(
      (data || []).map((pi: any) => ({
        item_id: pi.item_id,
        quantidade: String(pi.quantidade_pendente),
        valor_unitario: String(pi.valor_unitario),
        impostos: String(pi.impostos || 0),
        item_codigo: pi.item_codigo,
        item_descricao: pi.item_descricao,
      }))
    );
  }

  async function submitFromPO() {
    const po = purchaseOrders.find((p) => p.id === selectedPOId);
    if (!po) return;

    if (!poFiscal.data_emissao || !poFiscal.serie.trim() || !poFiscal.numero.trim()) {
      toast.error("Preencha Data de Emissão, Série e Número da NF antes de criar o documento.");
      return;
    }

    // Validate uniqueness per fornecedor
    if (tenant?.id) {
      const { data: existing } = await supabase
        .from("inbound_documents")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("fornecedor_id", po.fornecedor_id)
        .eq("serie", poFiscal.serie.trim())
        .eq("numero", poFiscal.numero.trim())
        .neq("status", "CANCELADO" as any)
        .limit(1);
      if (existing && existing.length > 0) {
        toast.error(`Já existe um documento deste fornecedor com Série ${poFiscal.serie.trim()} e Número ${poFiscal.numero.trim()}.`);
        return;
      }
    }

    const mappedItems = poItems
      .filter((m) => parseFloat(m.quantidade) > 0)
      .map((m) => ({
        item_id: m.item_id,
        quantidade: parseFloat(m.quantidade),
        valor_unitario: parseFloat(m.valor_unitario),
        impostos: parseFloat(m.impostos || "0"),
      }));

    createDocMutation.mutate({
      fornecedor_id: po.fornecedor_id,
      condicao_pagamento_id: poCondicao,
      numero: poFiscal.numero.trim(),
      serie: poFiscal.serie.trim(),
      data_emissao: poFiscal.data_emissao,
      purchase_order_id: selectedPOId,
      items: mappedItems,
    });
  }

  function resetForm() {
    setForm({ fornecedor_id: "", condicao_pagamento_id: "", numero: "", serie: "", data_emissao: new Date().toISOString().split("T")[0], frete_total: "0", frete_modo: "ratear" });
    setNewItems([]);
    setXmlData(null);
    setXmlForm({ fornecedor_id: "", condicao_pagamento_id: "", forma_pagamento_id: "", create_supplier: false });
    setXmlItemMappings([]);
    setSelectedPOId("");
    setPoItems([]);
    setPoCondicao("");
    setPoFiscal({ data_emissao: new Date().toISOString().split("T")[0], serie: "", numero: "" });
  }

  // ---- Item Picker Handler ----
  const handlePickerConfirm = useCallback((pickedItems: PickedItem[]) => {
    const itemsToAdd: ManualItem[] = pickedItems.map((p) => {
      const item = allItems.find((i) => i.id === p.item_id);
      return {
        item_id: p.item_id,
        codigo: item?.codigo || "",
        descricao: item?.descricao || "",
        unidade_medida: item?.unidade_medida || "UN",
        quantidade: String(p.quantidade),
        valor_unitario: String(p.valor_unitario),
        impostos: "0",
        frete_item: "0",
        natureza_financeira_id: (item as any)?.natureza_financeira_id || "",
        centro_custo_id: (item as any)?.centro_custo_id || "",
      };
    });
    setNewItems((prev) => [...prev, ...itemsToAdd]);
    setOpenItemPicker(false);
  }, [allItems]);

  function updateNewItem(index: number, field: keyof ManualItem, value: string) {
    setNewItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function removeNewItem(index: number) {
    setNewItems((prev) => prev.filter((_, i) => i !== index));
  }

  const calcTotal = (list: { quantidade: string; valor_unitario: string; impostos: string }[]) =>
    list.reduce(
      (sum, i) => sum + parseFloat(i.quantidade || "0") * parseFloat(i.valor_unitario || "0") + parseFloat(i.impostos || "0"),
      0
    );

  // Detail inline add
  const [detailNewItem, setDetailNewItem] = useState({
    item_id: "", quantidade: "1", valor_unitario: "0", impostos: "0",
  });
  const [detailPickerOpen, setDetailPickerOpen] = useState(false);

  function submitManual() {
    const mappedItems = newItems
      .filter((i) => i.item_id)
      .map((item, idx) => {
        const qty = parseFloat(item.quantidade || "0");
        const price = parseFloat(item.valor_unitario || "0");
        const imp = parseFloat(item.impostos || "0");
        const frete = form.frete_modo === "ratear" ? computedFretePerItem[idx] : parseFloat(item.frete_item || "0");
        // Incorporate freight into unit cost for stock costing
        const valorUnitWithFrete = qty > 0 ? price + frete / qty : price;
        return {
          item_id: item.item_id,
          quantidade: qty,
          valor_unitario: valorUnitWithFrete,
          impostos: imp,
        };
      });

    createDocMutation.mutate({
      fornecedor_id: form.fornecedor_id,
      condicao_pagamento_id: form.condicao_pagamento_id,
      numero: form.numero,
      serie: form.serie,
      data_emissao: form.data_emissao,
      items: mappedItems,
    });
  }

  // Existing items IDs for picker exclusion
  const existingItemIds = useMemo(() => newItems.map((i) => i.item_id), [newItems]);

  // ---- Columns ----
  const columns = [
    { key: "numero", label: "Número NF", render: (r: InboundDoc) => r.numero || "—" },
    { key: "serie", label: "Série", render: (r: InboundDoc) => r.serie || "—" },
    { key: "fornecedor", label: "Fornecedor", render: (r: InboundDoc) => r.suppliers?.razao_social || "—" },
    { key: "pedido_compra", label: "Pedido", render: (r: InboundDoc) => r.purchase_orders?.numero_sequencial ? `PC-${r.purchase_orders.numero_sequencial}` : "—" },
    { key: "status", label: "Status", render: (r: InboundDoc) => <Badge className={`text-2xs ${statusColors[r.status] || ""}`}>{r.status}</Badge> },
    { key: "valor_total", label: "Valor Total", render: (r: InboundDoc) => `R$ ${Number(r.valor_total).toFixed(2)}` },
    { key: "created_at", label: "Criado em", render: (r: InboundDoc) => format(new Date(r.created_at), "dd/MM/yyyy") },
    {
      key: "acoes", label: "Ações", render: (r: InboundDoc) => {
        const isPending = r.status === "PENDENTE";
        const canCancel = r.status !== "CANCELADO";
        return (
          <div className="flex gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Detalhes" onClick={(e) => { e.stopPropagation(); setSelectedDoc(r); setOpenDetail(true); }}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" title="Confirmar" disabled={!isPending} onClick={(e) => { e.stopPropagation(); setConfirmDialogId(r.id); }}>
              <CheckCircle className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Cancelar" disabled={!canCancel} onClick={(e) => { e.stopPropagation(); setCancelDialogId(r.id); }}>
              <XCircle className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Documentos de Entrada (NF-e)</h1>
        <p className="text-xs text-muted-foreground">
          Ao confirmar: movimenta estoque (entrada), gera contas a pagar automaticamente
        </p>
      </div>

      {/* Hidden file input for XML */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleXmlUpload(file);
          e.target.value = "";
        }}
      />

      <DataTable
        columns={columns}
        data={docs}
        loading={isLoading}
        searchPlaceholder="Buscar documento..."
        addLabel="Novo Documento"
        onAdd={() => setOpenManual(true)}
        filterFn={(r, s) =>
          (r.suppliers?.razao_social || "").toLowerCase().includes(s) ||
          (r.numero || "").toLowerCase().includes(s) ||
          r.status.toLowerCase().includes(s)
        }
        extraActions={
          <>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={xmlParsing}>
              <Upload className="h-3.5 w-3.5" />
              {xmlParsing ? "Processando..." : "Importar XML"}
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => {
              setOpenFromPO(true); setSelectedPOId(""); setPoItems([]);
              setPoFiscal({ data_emissao: new Date().toISOString().split("T")[0], serie: "", numero: "" });
            }}>
              <Link2 className="h-3.5 w-3.5" />
              A partir de Pedido de Compra
            </Button>
          </>
        }
      />

      {/* ========== MANUAL CREATE DIALOG ========== */}
      <Dialog open={openManual} onOpenChange={setOpenManual}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] flex flex-col">
          <DialogHeader><DialogTitle className="text-sm">Novo Documento de Entrada (Manual)</DialogTitle></DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1">
            {/* Header fields */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Fornecedor *</Label>
                <Select value={form.fornecedor_id} onValueChange={(v) => setForm({ ...form, fornecedor_id: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs">{s.razao_social}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cond. Pagamento</Label>
                <Select value={form.condicao_pagamento_id} onValueChange={(v) => setForm({ ...form, condicao_pagamento_id: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="À vista (30 dias)" /></SelectTrigger>
                  <SelectContent>{paymentConditions.map((p) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.descricao} ({p.numero_parcelas}x)</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data Emissão</Label>
                <Input className="h-8 text-xs" type="date" value={form.data_emissao} onChange={(e) => setForm({ ...form, data_emissao: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Número NF</Label>
                <Input className="h-8 text-xs" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="Número" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Série</Label>
                <Input className="h-8 text-xs" value={form.serie} onChange={(e) => setForm({ ...form, serie: e.target.value })} placeholder="1" />
              </div>
            </div>

            {/* Frete section */}
            <div className="border rounded-md p-3 space-y-2 bg-muted/20">
              <Label className="text-xs font-semibold">Frete</Label>
              <div className="grid grid-cols-2 gap-3 items-end">
                <div className="space-y-1.5">
                  <Label className="text-2xs text-muted-foreground">Valor Total do Frete (R$)</Label>
                  <Input
                    className="h-8 text-xs"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.frete_total}
                    onChange={(e) => setForm({ ...form, frete_total: e.target.value })}
                  />
                </div>
                <RadioGroup
                  value={form.frete_modo}
                  onValueChange={(v) => setForm({ ...form, frete_modo: v as "ratear" | "manual" })}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="ratear" id="frete-ratear" />
                    <Label htmlFor="frete-ratear" className="text-2xs cursor-pointer">Ratear automático</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="manual" id="frete-manual" />
                    <Label htmlFor="frete-manual" className="text-2xs cursor-pointer">Manual por item</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* Items section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Itens do Documento</Label>
                <Button type="button" variant="outline" size="sm" className="h-7 text-2xs" onClick={() => setOpenItemPicker(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Selecionar Itens
                </Button>
              </div>

              {newItems.length === 0 && (
                <p className="text-xs text-muted-foreground py-6 text-center border rounded-md border-dashed">
                  Nenhum item adicionado. Clique em "Selecionar Itens" para começar.
                </p>
              )}

              {newItems.length > 0 && (
                <div className="border rounded-md overflow-hidden">
                  {/* Header */}
                  <div className={`grid ${form.frete_modo === "manual" ? "grid-cols-[1fr_60px_70px_90px_70px_70px_80px_32px]" : "grid-cols-[1fr_60px_70px_90px_70px_80px_80px_32px]"} gap-1 px-2 py-1.5 bg-muted/50 text-2xs font-medium text-muted-foreground`}>
                    <span>Item</span>
                    <span>UN</span>
                    <span className="text-right">Qtd</span>
                    <span className="text-right">Vlr Unit</span>
                    <span className="text-right">Impostos</span>
                    {form.frete_modo === "manual" && <span className="text-right">Frete</span>}
                    <span className="text-right">Frete Rat.</span>
                    <span className="text-right">Total</span>
                    <span></span>
                  </div>
                  {/* Rows */}
                  {newItems.map((item, idx) => {
                    const qty = parseFloat(item.quantidade || "0");
                    const price = parseFloat(item.valor_unitario || "0");
                    const imp = parseFloat(item.impostos || "0");
                    const freteItem = form.frete_modo === "ratear" ? computedFretePerItem[idx] : parseFloat(item.frete_item || "0");
                    const totalItem = qty * price + imp + freteItem;

                    return (
                      <div key={item.item_id + idx}>
                      <div
                        className={`grid ${form.frete_modo === "manual" ? "grid-cols-[1fr_60px_70px_90px_70px_70px_80px_32px]" : "grid-cols-[1fr_60px_70px_90px_70px_80px_80px_32px]"} gap-1 px-2 py-1 items-center border-t text-2xs`}
                      >
                        <span className="truncate" title={`${item.codigo} - ${item.descricao}`}>
                          <span className="font-mono">{item.codigo}</span> {item.descricao}
                        </span>
                        <span className="text-muted-foreground">{item.unidade_medida}</span>
                        <Input
                          className="h-6 text-2xs text-right p-1"
                          type="number"
                          min="0.001"
                          step="0.01"
                          value={item.quantidade}
                          onChange={(e) => updateNewItem(idx, "quantidade", e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const next = e.currentTarget.parentElement?.querySelector<HTMLInputElement>('input[type="number"]:nth-of-type(2)');
                              if (!next) {
                                // Focus next row's quantity
                                const allInputs = document.querySelectorAll<HTMLInputElement>('[data-field="valor_unitario"]');
                                allInputs[idx]?.focus();
                              }
                            }
                          }}
                        />
                        <Input
                          className="h-6 text-2xs text-right p-1"
                          type="number"
                          min="0"
                          step="0.01"
                          data-field="valor_unitario"
                          value={item.valor_unitario}
                          onChange={(e) => updateNewItem(idx, "valor_unitario", e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const allInputs = document.querySelectorAll<HTMLInputElement>('[data-field="impostos"]');
                              allInputs[idx]?.focus();
                            }
                          }}
                        />
                        <Input
                          className="h-6 text-2xs text-right p-1"
                          type="number"
                          min="0"
                          step="0.01"
                          data-field="impostos"
                          value={item.impostos}
                          onChange={(e) => updateNewItem(idx, "impostos", e.target.value)}
                        />
                        {form.frete_modo === "manual" ? (
                          <Input
                            className="h-6 text-2xs text-right p-1"
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.frete_item}
                            onChange={(e) => updateNewItem(idx, "frete_item", e.target.value)}
                          />
                        ) : (
                          <span className="text-right text-muted-foreground">
                            {computedFretePerItem[idx]?.toFixed(2) || "0.00"}
                          </span>
                        )}
                        <span className="text-right font-medium">
                          {totalItem.toFixed(2)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive"
                          onClick={() => removeNewItem(idx)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-1 px-2 pb-1">
                        <Select value={item.natureza_financeira_id} onValueChange={(v) => updateNewItem(idx, "natureza_financeira_id", v)}>
                          <SelectTrigger className="h-6 text-2xs"><SelectValue placeholder="Natureza Financeira" /></SelectTrigger>
                          <SelectContent>{natures.map(n => <SelectItem key={n.id} value={n.id} className="text-2xs">{n.codigo} - {n.descricao}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={item.centro_custo_id} onValueChange={(v) => updateNewItem(idx, "centro_custo_id", v)}>
                          <SelectTrigger className="h-6 text-2xs"><SelectValue placeholder="Centro de Custo" /></SelectTrigger>
                          <SelectContent>{costCenters.map(c => <SelectItem key={c.id} value={c.id} className="text-2xs">{c.codigo} - {c.descricao}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      </div>
                    );
                  })}
                  {/* Footer totals */}
                  <div className={`grid ${form.frete_modo === "manual" ? "grid-cols-[1fr_60px_70px_90px_70px_70px_80px_32px]" : "grid-cols-[1fr_60px_70px_90px_70px_80px_80px_32px]"} gap-1 px-2 py-1.5 border-t bg-muted/30 text-2xs font-semibold`}>
                    <span>{newItems.length} item(ns)</span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    {form.frete_modo === "manual" && <span></span>}
                    <span className="text-right">Frete: {freteTotal.toFixed(2)}</span>
                    <span className="text-right">R$ {grandTotal.toFixed(2)}</span>
                    <span></span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setOpenManual(false); resetForm(); }}>Cancelar</Button>
              <Button
                size="sm"
                disabled={createDocMutation.isPending || !form.fornecedor_id || newItems.length === 0}
                onClick={submitManual}
              >
                {createDocMutation.isPending ? "Salvando..." : "Criar Documento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Item Picker for manual entry */}
      <ItemPickerDialog
        open={openItemPicker}
        onOpenChange={setOpenItemPicker}
        onConfirm={handlePickerConfirm}
        excludeIds={existingItemIds}
      />

      {/* ========== XML IMPORT DIALOG ========== */}
      <XmlImportDialog
        open={openXml}
        onOpenChange={(o) => { setOpenXml(o); if (!o) { setXmlData(null); setXmlItemMappings([]); } }}
        xmlData={xmlData}
        suppliers={suppliers}
        allItems={allItems}
        paymentConditions={paymentConditions}
        paymentMethods={paymentMethods}
        submitting={createDocMutation.isPending}
        onSubmit={(params) => {
          createDocMutation.mutate({
            fornecedor_id: params.fornecedor_id,
            condicao_pagamento_id: params.condicao_pagamento_id,
            forma_pagamento_id: params.forma_pagamento_id,
            numero: params.numero,
            serie: params.serie,
            data_emissao: params.data_emissao,
            chave_acesso: params.chave_acesso,
            purchase_order_id: params.purchase_order_id,
            items: params.items,
            supplier_item_mappings: params.supplier_item_mappings,
          });
        }}
      />

      {/* ========== FROM PO DIALOG ========== */}
      <Dialog open={openFromPO} onOpenChange={(o) => { setOpenFromPO(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-sm">Gerar a partir de Pedido de Compra</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Pedido de Compra *</Label>
              <Select value={selectedPOId} onValueChange={(v) => loadPOItems(v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione um PO..." /></SelectTrigger>
                <SelectContent>
                  {purchaseOrders.map((po) => (
                    <SelectItem key={po.id} value={po.id} className="text-xs">
                      PC-{po.numero_sequencial} — {po.fornecedor_nome || "—"} [{po.status}]
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPOId && (
              <>
                {/* Fiscal fields */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Data Emissão *</Label>
                    <Input className="h-8 text-xs" type="date" value={poFiscal.data_emissao} onChange={(e) => setPoFiscal({ ...poFiscal, data_emissao: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Série *</Label>
                    <Input className="h-8 text-xs" value={poFiscal.serie} onChange={(e) => setPoFiscal({ ...poFiscal, serie: e.target.value })} placeholder="1" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Número NF *</Label>
                    <Input className="h-8 text-xs" value={poFiscal.numero} onChange={(e) => setPoFiscal({ ...poFiscal, numero: e.target.value })} placeholder="000001" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cond. Pagamento</Label>
                    <Select value={poCondicao} onValueChange={setPoCondicao}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="À vista (30 dias)" /></SelectTrigger>
                      <SelectContent>{paymentConditions.map((p) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.descricao} ({p.numero_parcelas}x)</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Itens do Pedido (ajuste qtd para entrega parcial)</Label>
                  {poItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_80px_100px_80px] gap-2 items-end">
                      <div className="text-2xs py-1">{item.item_codigo} - {item.item_descricao}</div>
                      <Input className="h-7 text-2xs" type="number" min="0" step="0.01" value={item.quantidade} onChange={(e) => {
                        const updated = [...poItems];
                        updated[idx] = { ...updated[idx], quantidade: e.target.value };
                        setPoItems(updated);
                      }} />
                      <Input className="h-7 text-2xs" type="number" value={item.valor_unitario} onChange={(e) => {
                        const updated = [...poItems];
                        updated[idx] = { ...updated[idx], valor_unitario: e.target.value };
                        setPoItems(updated);
                      }} />
                      <Input className="h-7 text-2xs" type="number" value={item.impostos} onChange={(e) => {
                        const updated = [...poItems];
                        updated[idx] = { ...updated[idx], impostos: e.target.value };
                        setPoItems(updated);
                      }} />
                    </div>
                  ))}
                  {poItems.length > 0 && <div className="text-right text-xs font-semibold">Total: R$ {calcTotal(poItems).toFixed(2)}</div>}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setOpenFromPO(false)}>Cancelar</Button>
                  <Button size="sm" onClick={submitFromPO} disabled={createDocMutation.isPending || poItems.length === 0 || !poFiscal.serie.trim() || !poFiscal.numero.trim() || !poFiscal.data_emissao}>
                    {createDocMutation.isPending ? "Salvando..." : "Criar Documento"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== DETAIL DIALOG ========== */}
      <Dialog open={openDetail} onOpenChange={(open) => { setOpenDetail(open); if (!open) setSelectedDoc(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              Documento {selectedDoc?.numero || selectedDoc?.id.slice(0, 8)}
              {selectedDoc && <Badge className={`text-2xs ${statusColors[selectedDoc.status] || ""}`}>{selectedDoc.status}</Badge>}
            </DialogTitle>
          </DialogHeader>
          {selectedDoc && (
            <Tabs defaultValue="dados" className="space-y-3">
              <TabsList className="h-8">
                <TabsTrigger value="dados" className="text-xs h-7">Dados Gerais</TabsTrigger>
                <TabsTrigger value="itens" className="text-xs h-7">Itens</TabsTrigger>
                {selectedDoc.status === "PROCESSADO" && <TabsTrigger value="financeiro" className="text-xs h-7">Financeiro</TabsTrigger>}
              </TabsList>

              <TabsContent value="dados">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-muted-foreground">Fornecedor:</span> {selectedDoc.suppliers?.razao_social}</div>
                  <div><span className="text-muted-foreground">Número:</span> {selectedDoc.numero || "—"}</div>
                  <div><span className="text-muted-foreground">Série:</span> {selectedDoc.serie || "—"}</div>
                  <div><span className="text-muted-foreground">Chave:</span> {selectedDoc.chave_acesso ? selectedDoc.chave_acesso.slice(0, 20) + "..." : "—"}</div>
                  <div><span className="text-muted-foreground">PO:</span> {selectedDoc.purchase_order_id ? selectedDoc.purchase_order_id.slice(0, 8) + "..." : "—"}</div>
                  <div><span className="text-muted-foreground">Total:</span> R$ {Number(selectedDoc.valor_total).toFixed(2)}</div>
                </div>
              </TabsContent>

              <TabsContent value="itens">
                <div className="space-y-2">
                  <div className="border rounded">
                    <table className="w-full text-2xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-1.5">Item</th>
                          <th className="text-left p-1.5">UN</th>
                          <th className="text-right p-1.5">Qtd</th>
                          <th className="text-right p-1.5">Vlr Unit</th>
                          <th className="text-right p-1.5">Impostos</th>
                          <th className="text-right p-1.5">Subtotal</th>
                          {selectedDoc.status === "PENDENTE" && <th className="p-1.5 w-8"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {docItems.map((di) => (
                          <tr key={di.id} className="border-t">
                            <td className="p-1.5">{di.items?.codigo} - {di.items?.descricao}</td>
                            <td className="p-1.5">{(di.items as any)?.unidade_medida || "UN"}</td>
                            <td className="text-right p-1.5">{di.quantidade}</td>
                            <td className="text-right p-1.5">R$ {Number(di.valor_unitario).toFixed(2)}</td>
                            <td className="text-right p-1.5">R$ {Number(di.impostos).toFixed(2)}</td>
                            <td className="text-right p-1.5">R$ {(di.quantidade * di.valor_unitario + di.impostos).toFixed(2)}</td>
                            {selectedDoc.status === "PENDENTE" && (
                              <td className="p-1.5">
                                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => removeItemFromDoc.mutate({ itemId: di.id!, docId: selectedDoc.id })}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </td>
                            )}
                          </tr>
                        ))}
                        {docItems.length === 0 && <tr><td colSpan={7} className="text-center p-4 text-muted-foreground">Nenhum item</td></tr>}
                      </tbody>
                    </table>
                  </div>

                  {/* Add item via picker on detail */}
                  {selectedDoc.status === "PENDENTE" && (
                    <div className="border-t pt-3">
                      <Button variant="outline" size="sm" className="text-2xs" onClick={() => setDetailPickerOpen(true)}>
                        <Plus className="h-3 w-3 mr-1" /> Adicionar Itens
                      </Button>
                      <ItemPickerDialog
                        open={detailPickerOpen}
                        onOpenChange={setDetailPickerOpen}
                        onConfirm={(pickedItems) => {
                          pickedItems.forEach((p) => {
                            addItemToDoc.mutate({
                              docId: selectedDoc.id,
                              item: { item_id: p.item_id, quantidade: p.quantidade, valor_unitario: p.valor_unitario, impostos: 0 },
                            });
                          });
                          setDetailPickerOpen(false);
                        }}
                        excludeIds={docItems.map((d) => d.item_id)}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>

              {selectedDoc.status === "PROCESSADO" && (
                <TabsContent value="financeiro">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Parcelas Geradas (Contas a Pagar)</Label>
                    <div className="border rounded">
                      <table className="w-full text-2xs">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-1.5">Documento</th>
                            <th className="text-right p-1.5">Valor</th>
                            <th className="text-right p-1.5">Vencimento</th>
                            <th className="text-left p-1.5">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {docPayables.map((p) => (
                            <tr key={p.id} className="border-t">
                              <td className="p-1.5">{p.documento_origem}</td>
                              <td className="text-right p-1.5">R$ {Number(p.valor).toFixed(2)}</td>
                              <td className="text-right p-1.5">{format(new Date(p.data_vencimento), "dd/MM/yyyy")}</td>
                              <td className="p-1.5"><Badge className={`text-2xs ${p.status === "ABERTO" ? "bg-yellow-100 text-yellow-800" : p.status === "PAGO" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{p.status}</Badge></td>
                            </tr>
                          ))}
                          {docPayables.length === 0 && <tr><td colSpan={4} className="text-center p-4 text-muted-foreground">Nenhuma parcela encontrada</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>
              )}

              {/* Actions */}
              {(selectedDoc.status === "PENDENTE" || selectedDoc.status === "PROCESSADO") && (
                <div className="flex gap-2 pt-2 border-t">
                  {selectedDoc.status === "PENDENTE" && (
                    <Button size="sm" className="text-xs" onClick={() => setConfirmDialogId(selectedDoc.id)} disabled={docItems.length === 0}>
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />Confirmar Documento
                    </Button>
                  )}
                  <Button variant="destructive" size="sm" className="text-xs" onClick={() => setCancelDialogId(selectedDoc.id)}>
                    <XCircle className="h-3.5 w-3.5 mr-1" />{selectedDoc.status === "PROCESSADO" ? "Cancelar (Admin)" : "Cancelar Documento"}
                  </Button>
                </div>
              )}
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* CONFIRM DIALOG */}
      <AlertDialog open={!!confirmDialogId} onOpenChange={() => setConfirmDialogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Confirmar Documento de Entrada?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Esta ação irá:<br />
              • Movimentar estoque (ENTRADA)<br />
              • Atualizar custo médio dos itens<br />
              • Gerar contas a pagar (parcelado se condição definida)<br />
              • Atualizar status do Pedido de Compra (se vinculado)<br />
              <br />Esta operação não pode ser desfeita facilmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="text-xs" onClick={() => confirmDialogId && confirmMutation.mutate(confirmDialogId)} disabled={confirmMutation.isPending}>
              {confirmMutation.isPending ? "Confirmando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CANCEL DIALOG */}
      <AlertDialog open={!!cancelDialogId} onOpenChange={() => setCancelDialogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Cancelar Documento?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              {docs.find((d) => d.id === cancelDialogId)?.status === "PROCESSADO"
                ? "Documento PROCESSADO: o cancelamento reverterá movimentações de estoque e cancelará contas a pagar abertas. Somente Admin Global pode fazer isso."
                : "O documento pendente será cancelado sem gerar movimentações."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!cancelDialogId) return;
                const doc = docs.find((d) => d.id === cancelDialogId);
                if (doc?.status === "PROCESSADO") {
                  cancelConfirmadoMutation.mutate(cancelDialogId);
                } else {
                  cancelPendenteMutation.mutate(cancelDialogId);
                }
              }}
            >
              Cancelar Documento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
