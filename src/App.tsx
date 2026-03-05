import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { TenantProvider } from "@/contexts/TenantContext";
import { AppLayout } from "@/components/AppLayout";
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

/**
 * PublicRoute for tenant-scoped auth pages (/t/:slug/auth).
 * If user is already logged in, redirects to tenant dashboard.
 * NEVER redirects to "/" — always preserves the tenant slug.
 */
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

  // If user is logged in and we have a slug, redirect to tenant dashboard
  if (user && slug) {
    return <Navigate to={`/t/${slug}`} replace />;
  }

  return <>{children}</>;
}

/**
 * PublicRoute for global auth (/auth).
 * If user is logged in, redirects to "/" (SelectTenant will handle).
 */
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Global auth (no tenant) - redirects to select tenant */}
          <Route path="/auth" element={<GlobalPublicRoute><Auth /></GlobalPublicRoute>} />
          
          {/* Tenant-scoped auth — TenantProvider resolves slug via RPC */}
          <Route path="/t/:slug/auth" element={
            <TenantProvider>
              <TenantPublicRoute>
                <Auth />
              </TenantPublicRoute>
            </TenantProvider>
          } />

          {/* Select tenant page (for admin_global or redirect) */}
          <Route path="/" element={<SelectTenant />} />

          {/* Tenant-scoped routes */}
          <Route path="/t/:slug" element={
            <TenantProvider>
              <TenantGate>
                <AppLayout />
              </TenantGate>
            </TenantProvider>
          }>
            <Route index element={<Dashboard />} />

            {/* Estoque */}
            <Route path="estoque/itens" element={<ItemsPage />} />
            <Route path="estoque/grupos" element={<ItemGroupsPage />} />
            <Route path="estoque/movimentacoes" element={<StockMovementsPage />} />

            {/* Compras */}
            <Route path="compras/pedidos" element={<PurchaseOrdersPage />} />
            <Route path="compras/entradas" element={<InboundDocumentsPage />} />

            {/* Comercial */}
            <Route path="comercial/orcamentos" element={<QuotationsPage />} />
            <Route path="comercial/pedidos-venda" element={<SalesOrdersPage />} />
            <Route path="comercial/documentos-saida" element={<OutboundDocumentsPage />} />

            {/* Serviços */}
            <Route path="servicos/ordens" element={<ServiceOrdersPage />} />
            <Route path="servicos/agenda" element={<AgendaPage />} />

            {/* Financeiro */}
            <Route path="financeiro/pagar" element={<AccountsPayablePage />} />
            <Route path="financeiro/receber" element={<AccountsReceivablePage />} />
            <Route path="financeiro/bancos" element={<BanksPage />} />
            <Route path="financeiro/movimentacao-bancaria" element={<BankStatementPage />} />
            {/* Controladoria */}
            <Route path="controladoria/dre" element={<DREPage />} />
            <Route path="controladoria/fluxo-caixa" element={<CashFlowPage />} />

            {/* Cadastros */}
            <Route path="cadastros/fornecedores" element={<SuppliersPage />} />
            <Route path="cadastros/clientes" element={<CustomersPage />} />
            <Route path="cadastros/formas-pagamento" element={<PaymentMethodsPage />} />
            <Route path="cadastros/condicoes-pagamento" element={<PaymentConditionsPage />} />
            <Route path="cadastros/naturezas" element={<FinancialNaturesPage />} />
            <Route path="cadastros/centros-custo" element={<CostCentersPage />} />
            <Route path="cadastros/bancos" element={<BanksPage />} />
            <Route path="cadastros/series" element={<DocumentSeriesPage />} />
            <Route path="cadastros/unidades-medida" element={<UnidadesMedidaPage />} />

            {/* Admin */}
            <Route path="empresas" element={<EmpresasPage />} />
            <Route path="usuarios" element={<UsersPage />} />
            <Route path="configuracoes" element={<ModulePage title="Configurações" />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
