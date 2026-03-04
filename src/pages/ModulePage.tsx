import { useLocation } from "react-router-dom";

const moduleTitles: Record<string, string> = {
  "/": "Dashboard",
  "/compras": "Compras",
  "/estoque": "Estoque",
  "/comercial": "Comercial",
  "/financeiro": "Financeiro",
  "/servicos": "Serviços",
  "/controladoria": "Controladoria",
  "/cadastros": "Cadastros",
  "/usuarios": "Usuários",
  "/empresas": "Empresas",
  "/configuracoes": "Configurações",
};

export default function ModulePage({ title }: { title?: string }) {
  const location = useLocation();
  const pageTitle = title || moduleTitles[location.pathname] || "Módulo";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">{pageTitle}</h1>
        <p className="text-xs text-muted-foreground">
          Módulo em desenvolvimento
        </p>
      </div>
      <div className="border border-dashed rounded-lg p-8 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Conteúdo do módulo "{pageTitle}" será implementado nas próximas fases.
        </p>
      </div>
    </div>
  );
}
