import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { TenantProvider } from "@/contexts/TenantContext";
import { AppLayout } from "@/components/AppLayout";
import { PermissionGuard } from "@/components/PermissionGuard";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import SelectTenant from "./pages/SelectTenant";
import TenantGate from "./pages/TenantGate";

// Cadastros
import SuppliersPage from "./pages/cadastros/SuppliersPage";
import CustomersPage from "./pages/cadastros/CustomersPage";
import PaymentMethodsPage from "./pages/cadastros/PaymentMethodsPage";
import PaymentConditionsPage from "./pages/cadastros/PaymentConditionsPage";
import FinancialNaturesPage from "./pages/cadastros/FinancialNaturesPage";
import CostCentersPage from "./pages/cadastros/CostCentersPage";
import DocumentSeriesPage from "./pages/cadastros/DocumentSeriesPage";
import UnidadesMedidaPage from "./pages/cadastros/UnidadesMedidaPage";

// Estoque
import ItemsPage from "./pages/estoque/ItemsPage";
import ItemGroupsPage from "./pages/estoque/ItemGroupsPage";
import StockMovementsPage from "./pages/estoque/StockMovementsPage";

// Compras
import PurchaseOrdersPage from "./pages/compras/PurchaseOrdersPage";
import InboundDocumentsPage from "./pages/compras/InboundDocumentsPage";

// Comercial
import OutboundDocumentsPage from "./pages/comercial/OutboundDocumentsPage";
import QuotationsPage from "./pages/comercial/QuotationsPage";
import SalesOrdersPage from "./pages/comercial/SalesOrdersPage";

// Serviços
import ServiceOrdersPage from "./pages/servicos/ServiceOrdersPage";
import AgendaPage from "./pages/servicos/AgendaPage";

// Financeiro
import AccountsPayablePage from "./pages/financeiro/AccountsPayablePage";
import AccountsReceivablePage from "./pages/financeiro/AccountsReceivablePage";
import BanksPage from "./pages/financeiro/BanksPage";
import BankStatementPage from "./pages/financeiro/BankStatementPage";

// Controladoria
import DREPage from "./pages/controladoria/DREPage";
import CashFlowPage from "./pages/controladoria/CashFlowPage";

// Admin
import EmpresasPage from "./pages/admin/EmpresasPage";
import UsersPage from "./pages/admin/UsersPage";

import ModulePage from "./pages/ModulePage";

const queryClient = new QueryClient();

function TenantPublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { slug } = useParams<{ slug: string }>();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (user && slug) {
    return <Navigate to={`/t/${slug}`} replace />;
  }

  return <>{children}</>;
}

function GlobalPublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/** Helper to wrap a page with PermissionGuard */
function P({ module, children }: { module: string; children: React.ReactNode }) {
  return <PermissionGuard module={module}>{children}</PermissionGuard>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <Routes>
          <Route path="/auth" element={<GlobalPublicRoute><Auth /></GlobalPublicRoute>} />
          
          <Route path="/t/:slug/auth" element={
            <TenantProvider>
              <TenantPublicRoute>
                <Auth />
              </TenantPublicRoute>
            </TenantProvider>
          } />

          <Route path="/" element={<SelectTenant />} />

          <Route path="/t/:slug" element={
            <TenantProvider>
              <TenantGate>
                <AppLayout />
              </TenantGate>
            </TenantProvider>
          }>
            <Route index element={<Dashboard />} />

            {/* Estoque */}
            <Route path="estoque/itens" element={<P module="Estoque - Itens"><ItemsPage /></P>} />
            <Route path="estoque/grupos" element={<P module="Estoque - Grupos"><ItemGroupsPage /></P>} />
            <Route path="estoque/movimentacoes" element={<P module="Estoque - Movimentações"><StockMovementsPage /></P>} />

            {/* Compras */}
            <Route path="compras/pedidos" element={<P module="Compras - Pedidos"><PurchaseOrdersPage /></P>} />
            <Route path="compras/entradas" element={<P module="Compras - Entradas (NF-e)"><InboundDocumentsPage /></P>} />

            {/* Comercial */}
            <Route path="comercial/orcamentos" element={<P module="Comercial - Orçamentos"><QuotationsPage /></P>} />
            <Route path="comercial/pedidos-venda" element={<P module="Comercial - Pedidos de Venda"><SalesOrdersPage /></P>} />
            <Route path="comercial/documentos-saida" element={<P module="Comercial - Doc. Saída (NF-e)"><OutboundDocumentsPage /></P>} />

            {/* Serviços */}
            <Route path="servicos/ordens" element={<P module="Serviços - Ordens de Serviço"><ServiceOrdersPage /></P>} />
            <Route path="servicos/agenda" element={<P module="Serviços - Agenda"><AgendaPage /></P>} />

            {/* Financeiro */}
            <Route path="financeiro/pagar" element={<P module="Financeiro - Contas a Pagar"><AccountsPayablePage /></P>} />
            <Route path="financeiro/receber" element={<P module="Financeiro - Contas a Receber"><AccountsReceivablePage /></P>} />
            <Route path="financeiro/bancos" element={<P module="Cadastros - Bancos"><BanksPage /></P>} />
            <Route path="financeiro/movimentacao-bancaria" element={<P module="Financeiro - Extrato Bancário"><BankStatementPage /></P>} />

            {/* Controladoria */}
            <Route path="controladoria/dre" element={<P module="Controladoria - DRE"><DREPage /></P>} />
            <Route path="controladoria/fluxo-caixa" element={<P module="Controladoria - Fluxo de Caixa"><CashFlowPage /></P>} />

            {/* Cadastros */}
            <Route path="cadastros/fornecedores" element={<P module="Cadastros - Fornecedores"><SuppliersPage /></P>} />
            <Route path="cadastros/clientes" element={<P module="Cadastros - Clientes"><CustomersPage /></P>} />
            <Route path="cadastros/formas-pagamento" element={<P module="Cadastros - Formas de Pagamento"><PaymentMethodsPage /></P>} />
            <Route path="cadastros/condicoes-pagamento" element={<P module="Cadastros - Cond. Pagamento"><PaymentConditionsPage /></P>} />
            <Route path="cadastros/naturezas" element={<P module="Cadastros - Nat. Financeiras"><FinancialNaturesPage /></P>} />
            <Route path="cadastros/centros-custo" element={<P module="Cadastros - Centros de Custo"><CostCentersPage /></P>} />
            <Route path="cadastros/bancos" element={<P module="Cadastros - Bancos"><BanksPage /></P>} />
            <Route path="cadastros/series" element={<P module="Cadastros - Séries de Documento"><DocumentSeriesPage /></P>} />
            <Route path="cadastros/unidades-medida" element={<P module="Cadastros - Unid. Medida"><UnidadesMedidaPage /></P>} />

            {/* Admin */}
            <Route path="empresas" element={<P module="Administração - Usuários"><EmpresasPage /></P>} />
            <Route path="usuarios" element={<P module="Administração - Usuários"><UsersPage /></P>} />
            <Route path="configuracoes" element={<ModulePage title="Configurações" />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
