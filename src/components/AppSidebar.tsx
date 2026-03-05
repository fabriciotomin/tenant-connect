import { useLocation } from "react-router-dom";
import { useTenantPath } from "@/hooks/useTenantSlug";
import {
  LayoutDashboard, ShoppingCart, Package, Store, DollarSign, Wrench,
  BarChart3, Users, Settings, FileText, Building2, ChevronRight, Boxes,
  FolderTree, ArrowDownUp, ClipboardList, Receipt, CreditCard, Landmark,
  UserCheck, FileSpreadsheet, ShoppingBag, TrendingUp, Wallet, CalendarDays,
  Hash, Ruler,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton,
  SidebarHeader, SidebarFooter, SidebarSeparator,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTenant } from "@/contexts/TenantContext";
import { usePermissions } from "@/hooks/usePermissions";

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  /** Permission module name required to see this item */
  permission?: string;
  children?: { title: string; url: string; icon: any; permission?: string }[];
}

const mainItems: MenuItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
];

const moduleItems: MenuItem[] = [
  {
    title: "Compras", url: "/compras", icon: ShoppingCart,
    children: [
      { title: "Pedidos", url: "/compras/pedidos", icon: ClipboardList, permission: "Compras - Pedidos" },
      { title: "Entradas (NF-e)", url: "/compras/entradas", icon: Receipt, permission: "Compras - Entradas (NF-e)" },
    ],
  },
  {
    title: "Estoque", url: "/estoque", icon: Package,
    children: [
      { title: "Itens", url: "/estoque/itens", icon: Boxes, permission: "Estoque - Itens" },
      { title: "Grupos", url: "/estoque/grupos", icon: FolderTree, permission: "Estoque - Grupos" },
      { title: "Movimentações", url: "/estoque/movimentacoes", icon: ArrowDownUp, permission: "Estoque - Movimentações" },
    ],
  },
  {
    title: "Comercial", url: "/comercial", icon: Store,
    children: [
      { title: "Orçamentos", url: "/comercial/orcamentos", icon: FileSpreadsheet, permission: "Comercial - Orçamentos" },
      { title: "Pedidos de Venda", url: "/comercial/pedidos-venda", icon: ShoppingBag, permission: "Comercial - Pedidos de Venda" },
      { title: "Doc. Saída (NF-e)", url: "/comercial/documentos-saida", icon: Receipt, permission: "Comercial - Doc. Saída (NF-e)" },
    ],
  },
  {
    title: "Serviços", url: "/servicos", icon: Wrench,
    children: [
      { title: "Ordens de Serviço", url: "/servicos/ordens", icon: CalendarDays, permission: "Serviços - Ordens de Serviço" },
      { title: "Agenda", url: "/servicos/agenda", icon: CalendarDays, permission: "Serviços - Agenda" },
    ],
  },
  {
    title: "Financeiro", url: "/financeiro", icon: DollarSign,
    children: [
      { title: "Contas a Pagar", url: "/financeiro/pagar", icon: CreditCard, permission: "Financeiro - Contas a Pagar" },
      { title: "Contas a Receber", url: "/financeiro/receber", icon: Landmark, permission: "Financeiro - Contas a Receber" },
      { title: "Extrato Bancário", url: "/financeiro/movimentacao-bancaria", icon: Wallet, permission: "Financeiro - Extrato Bancário" },
    ],
  },
  {
    title: "Controladoria", url: "/controladoria", icon: BarChart3,
    children: [
      { title: "DRE", url: "/controladoria/dre", icon: TrendingUp, permission: "Controladoria - DRE" },
      { title: "Fluxo de Caixa", url: "/controladoria/fluxo-caixa", icon: Wallet, permission: "Controladoria - Fluxo de Caixa" },
    ],
  },
];

const registerItems: MenuItem[] = [
  {
    title: "Cadastros", url: "/cadastros", icon: FileText,
    children: [
      { title: "Clientes", url: "/cadastros/clientes", icon: UserCheck, permission: "Cadastros - Clientes" },
      { title: "Fornecedores", url: "/cadastros/fornecedores", icon: Building2, permission: "Cadastros - Fornecedores" },
      { title: "Formas Pagamento", url: "/cadastros/formas-pagamento", icon: CreditCard, permission: "Cadastros - Formas de Pagamento" },
      { title: "Cond. Pagamento", url: "/cadastros/condicoes-pagamento", icon: CalendarDays, permission: "Cadastros - Cond. Pagamento" },
      { title: "Nat. Financeiras", url: "/cadastros/naturezas", icon: FolderTree, permission: "Cadastros - Nat. Financeiras" },
      { title: "Centros de Custo", url: "/cadastros/centros-custo", icon: BarChart3, permission: "Cadastros - Centros de Custo" },
      { title: "Bancos", url: "/cadastros/bancos", icon: Landmark, permission: "Cadastros - Bancos" },
      { title: "Séries de Documento", url: "/cadastros/series", icon: Hash, permission: "Cadastros - Séries de Documento" },
      { title: "Unid. Medida", url: "/cadastros/unidades-medida", icon: Ruler, permission: "Cadastros - Unid. Medida" },
    ],
  },
  { title: "Usuários", url: "/usuarios", icon: Users, permission: "Administração - Usuários" },
  { title: "Empresas", url: "/empresas", icon: Building2, permission: "Administração - Usuários" },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const tenantPath = useTenantPath();
  const { tenant } = useTenant();
  const { canView, loading: permLoading } = usePermissions();

  const isActive = (path: string) => {
    const full = tenantPath(path);
    return path === "/" ? location.pathname === full : location.pathname.startsWith(full);
  };

  /** Filter children by permission, then hide parent if no children remain */
  const filterByPermission = (items: MenuItem[]): MenuItem[] => {
    return items
      .map((item) => {
        if (item.children) {
          const visibleChildren = item.children.filter(
            (c) => !c.permission || canView(c.permission)
          );
          if (visibleChildren.length === 0) return null;
          return { ...item, children: visibleChildren };
        }
        // Top-level item with permission check
        if (item.permission && !canView(item.permission)) return null;
        return item;
      })
      .filter(Boolean) as MenuItem[];
  };

  const renderItem = (item: MenuItem) => {
    if (item.children) {
      const isOpen = item.children.some((c) => isActive(c.url));
      return (
        <Collapsible key={item.title} defaultOpen={isOpen}>
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton className="flex items-center gap-2 text-xs w-full">
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.title}</span>
                <ChevronRight className="h-3 w-3 transition-transform group-data-[state=open]:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.children.map((child) => (
                  <SidebarMenuSubItem key={child.url}>
                    <SidebarMenuSubButton asChild isActive={isActive(child.url)}>
                      <NavLink to={tenantPath(child.url)} className="flex items-center gap-2 text-xs" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                        <child.icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{child.title}</span>
                      </NavLink>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={isActive(item.url)}>
          <NavLink to={tenantPath(item.url)} end={item.url === "/"} className="flex items-center gap-2 text-xs" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.title}</span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  // Don't filter while permissions are loading to avoid flash
  const visibleModules = permLoading ? moduleItems : filterByPermission(moduleItems);
  const visibleRegisters = permLoading ? registerItems : filterByPermission(registerItems);

  return (
    <Sidebar>
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-sidebar-primary flex items-center justify-center">
            <Building2 className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-sidebar-foreground">
              {tenant?.nome_fantasia || tenant?.razao_social || "ERP Commerce"}
            </span>
            <span className="text-2xs text-sidebar-foreground/60">
              {tenant?.slug || "Multi-Tenant"}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>{mainItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {visibleModules.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-2xs uppercase tracking-wider text-sidebar-foreground/50">Módulos</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{visibleModules.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {visibleRegisters.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-2xs uppercase tracking-wider text-sidebar-foreground/50">Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{visibleRegisters.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-3">
        <div className="text-2xs text-sidebar-foreground/40">v1.0.0</div>
      </SidebarFooter>
    </Sidebar>
  );
}
