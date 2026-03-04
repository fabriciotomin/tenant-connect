import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.36-alpha/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NFeItem {
  cProd: string;
  xProd: string;
  NCM: string;
  CFOP: string;
  quantidade: number;
  valor_unitario: number;
  icms: number;
  ipi: number;
  pis: number;
  cofins: number;
  impostos_total: number;
}

interface NFeData {
  emitente: {
    cnpj: string;
    razao_social: string;
    nome_fantasia: string;
  };
  numero: string;
  serie: string;
  chave_acesso: string;
  data_emissao: string;
  valor_total: number;
  itens: NFeItem[];
}

class NFeParseError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "NFeParseError";
    this.status = status;
  }
}

function removeNamespaces(xml: string): string {
  let s = xml.replace(/xmlns="[^"]*"/g, "");
  s = s.replace(/xmlns:[\w.-]+="[^"]*"/g, "");
  s = s.replace(/<(\/?)[\w.-]+:/g, "<$1");
  return s;
}

function getTagText(parent: any, tag: string): string {
  if (!parent) return "";
  const el = parent.getElementsByTagName(tag)[0];
  return el?.textContent?.trim() || "";
}

function parseDecimal(value: string): number {
  const normalized = (value || "").trim().replace(/\s+/g, "").replace(",", ".");
  const num = Number.parseFloat(normalized);
  return Number.isFinite(num) ? num : 0;
}

function parseNFeXml(xmlContent: string): NFeData {
  const xmlNoBom = xmlContent.replace(/^\uFEFF/, "").trim();
  const xmlNoDecl = xmlNoBom.replace(/<\?xml[^?]*\?>/i, "").trim();
  const xmlString = removeNamespaces(xmlNoDecl);

  console.log("[parse-nfe-xml] XML length after cleanup:", xmlString.length);
  console.log("[parse-nfe-xml] XML preview (500 chars):", xmlString.slice(0, 500));

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/html");

  if (!xmlDoc) {
    throw new NFeParseError("Falha ao parsear XML.");
  }

  // deno-dom parseFromString with text/html wraps in <html><body>...
  // We need to find our tags inside the body
  const body = xmlDoc.body || xmlDoc.documentElement;

  // Detect root element name
  const firstTag = xmlString.match(/<(\w+)[\s>]/)?.[1] || "";
  console.log("[parse-nfe-xml] Root tag detected:", firstTag);

  if (["procEventoNFe", "retEnvEvento", "retEvento"].includes(firstTag)) {
    throw new NFeParseError("XML de evento não é permitido. Envie XML da NF-e autorizada.");
  }
  if (firstTag === "resNFe") {
    throw new NFeParseError("XML resumido (resNFe) não é permitido. Envie XML completo da NF-e autorizada.");
  }
  if (firstTag !== "NFe" && firstTag !== "nfeProc") {
    throw new NFeParseError(`XML inválido: estrutura não reconhecida (root: ${firstTag}).`);
  }

  // Find infNFe
  const infNFeNodes = body.getElementsByTagName("infnfe");
  const infNFe = infNFeNodes[0];

  if (!infNFe) {
    // Try case-sensitive variations
    const alt = body.getElementsByTagName("infNFe")[0];
    if (!alt) {
      throw new NFeParseError("XML inválido: bloco <infNFe> não encontrado.");
    }
  }

  const inf = infNFe || body.getElementsByTagName("infNFe")[0];

  const emit = inf.getElementsByTagName("emit")[0];
  const ide = inf.getElementsByTagName("ide")[0];

  const emitCnpj = getTagText(emit, "cnpj") || getTagText(emit, "cpf") || "";
  const emitRazao = getTagText(emit, "xnome") || "";
  const emitFantasia = getTagText(emit, "xfant") || "";

  const numero = getTagText(ide, "nnf") || "";
  const serie = getTagText(ide, "serie") || "";
  const dhEmi = getTagText(ide, "dhemi") || getTagText(ide, "demi") || "";
  const dataEmissao = dhEmi ? dhEmi.substring(0, 10) : new Date().toISOString().substring(0, 10);

  // Access key from Id attribute or protNFe
  const infId = inf.getAttribute("id") || inf.getAttribute("Id") || "";
  const chaveById = infId.startsWith("NFe") ? infId.slice(3) : infId;
  const protNFe = body.getElementsByTagName("protnfe")[0];
  const chaveByProt = getTagText(protNFe, "chnfe") || "";
  const chaveAcesso = chaveById || chaveByProt;

  console.log("[parse-nfe-xml] Emitente:", emitRazao || "(vazio)", "| NF:", numero, "| Série:", serie);

  // Items
  const detNodes = Array.from(inf.getElementsByTagName("det"));
  console.log("[parse-nfe-xml] Itens encontrados:", detNodes.length);

  const itens: NFeItem[] = detNodes.map((det: any, index: number) => {
    try {
      const prod = det.getElementsByTagName("prod")[0];
      const imposto = det.getElementsByTagName("imposto")[0];

      const quantidade = parseDecimal(getTagText(prod, "qcom") || getTagText(prod, "qtrib") || "0");
      const valorUnitario = parseDecimal(getTagText(prod, "vuncom") || getTagText(prod, "vuntrib") || "0");

      const icms = parseDecimal(getTagText(imposto, "vicms") || "0");
      const ipi = parseDecimal(getTagText(imposto, "vipi") || "0");
      const pis = parseDecimal(getTagText(imposto, "vpis") || "0");
      const cofins = parseDecimal(getTagText(imposto, "vcofins") || "0");

      return {
        cProd: getTagText(prod, "cprod") || "",
        xProd: getTagText(prod, "xprod") || `Item ${index + 1}`,
        NCM: getTagText(prod, "ncm") || "",
        CFOP: getTagText(prod, "cfop") || "",
        quantidade,
        valor_unitario: valorUnitario,
        icms, ipi, pis, cofins,
        impostos_total: icms + ipi + pis + cofins,
      };
    } catch (e) {
      console.error(`[parse-nfe-xml] Erro item ${index}:`, e);
      return { cProd: "", xProd: `Item ${index + 1} (erro)`, NCM: "", CFOP: "", quantidade: 0, valor_unitario: 0, icms: 0, ipi: 0, pis: 0, cofins: 0, impostos_total: 0 };
    }
  });

  const icmsTot = inf.getElementsByTagName("icmstot")[0];
  const valorTotal = parseDecimal(getTagText(icmsTot, "vnf") || "0");

  console.log("[parse-nfe-xml] Parse OK. Total:", valorTotal, "| Itens:", itens.length);

  return {
    emitente: { cnpj: emitCnpj, razao_social: emitRazao, nome_fantasia: emitFantasia },
    numero, serie, chave_acesso: chaveAcesso, data_emissao: dataEmissao,
    valor_total: valorTotal, itens,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: true, message: "Body da requisição não é um JSON válido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { xml_content } = body;

    if (!xml_content || typeof xml_content !== "string") {
      return new Response(
        JSON.stringify({ error: true, message: "Campo xml_content é obrigatório e deve ser uma string." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (xml_content.trim().length < 50) {
      return new Response(
        JSON.stringify({ error: true, message: "Conteúdo XML muito curto para ser uma NF-e válida." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = parseNFeXml(xml_content);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    const status = error instanceof NFeParseError ? error.status : 500;
    const message = error?.message || "Erro desconhecido ao processar XML";

    console.error("[parse-nfe-xml] ERRO:", { status, message, stack: error?.stack || null });

    return new Response(
      JSON.stringify({ error: true, message, stack: error?.stack || null }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
