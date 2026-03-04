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

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  children?: { title: string; url: string; icon: any }[];
}

const mainItems: MenuItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
];

const moduleItems: MenuItem[] = [
  {
    title: "Compras", url: "/compras", icon: ShoppingCart,
    children: [
      { title: "Pedidos", url: "/compras/pedidos", icon: ClipboardList },
      { title: "Entradas (NF-e)", url: "/compras/entradas", icon: Receipt },
    ],
  },
  {
    title: "Estoque", url: "/estoque", icon: Package,
    children: [
      { title: "Itens", url: "/estoque/itens", icon: Boxes },
      { title: "Grupos", url: "/estoque/grupos", icon: FolderTree },
      { title: "Movimentações", url: "/estoque/movimentacoes", icon: ArrowDownUp },
    ],
  },
  {
    title: "Comercial", url: "/comercial", icon: Store,
    children: [
      { title: "Orçamentos", url: "/comercial/orcamentos", icon: FileSpreadsheet },
      { title: "Pedidos de Venda", url: "/comercial/pedidos-venda", icon: ShoppingBag },
      { title: "Doc. Saída (NF-e)", url: "/comercial/documentos-saida", icon: Receipt },
    ],
  },
  {
    title: "Serviços", url: "/servicos", icon: Wrench,
    children: [
      { title: "Ordens de Serviço", url: "/servicos/ordens", icon: CalendarDays },
      { title: "Agenda", url: "/servicos/agenda", icon: CalendarDays },
    ],
  },
  {
    title: "Financeiro", url: "/financeiro", icon: DollarSign,
    children: [
      { title: "Contas a Pagar", url: "/financeiro/pagar", icon: CreditCard },
      { title: "Contas a Receber", url: "/financeiro/receber", icon: Landmark },
      { title: "Extrato Bancário", url: "/financeiro/movimentacao-bancaria", icon: Wallet },
    ],
  },
  {
    title: "Controladoria", url: "/controladoria", icon: BarChart3,
    children: [
      { title: "DRE", url: "/controladoria/dre", icon: TrendingUp },
      { title: "Fluxo de Caixa", url: "/controladoria/fluxo-caixa", icon: Wallet },
    ],
  },
];

const registerItems: MenuItem[] = [
  {
    title: "Cadastros", url: "/cadastros", icon: FileText,
    children: [
      { title: "Clientes", url: "/cadastros/clientes", icon: UserCheck },
      { title: "Fornecedores", url: "/cadastros/fornecedores", icon: Building2 },
      { title: "Formas Pagamento", url: "/cadastros/formas-pagamento", icon: CreditCard },
      { title: "Cond. Pagamento", url: "/cadastros/condicoes-pagamento", icon: CalendarDays },
      { title: "Nat. Financeiras", url: "/cadastros/naturezas", icon: FolderTree },
      { title: "Centros de Custo", url: "/cadastros/centros-custo", icon: BarChart3 },
      { title: "Bancos", url: "/cadastros/bancos", icon: Landmark },
      { title: "Séries de Documento", url: "/cadastros/series", icon: Hash },
      { title: "Unid. Medida", url: "/cadastros/unidades-medida", icon: Ruler },
    ],
  },
  { title: "Usuários", url: "/usuarios", icon: Users },
  { title: "Empresas", url: "/empresas", icon: Building2 },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const tenantPath = useTenantPath();
  const { tenant } = useTenant();

  const isActive = (path: string) => {
    const full = tenantPath(path);
    return path === "/" ? location.pathname === full : location.pathname.startsWith(full);
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
        <SidebarGroup>
          <SidebarGroupLabel className="text-2xs uppercase tracking-wider text-sidebar-foreground/50">Módulos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{moduleItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-2xs uppercase tracking-wider text-sidebar-foreground/50">Administração</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{registerItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <div className="text-2xs text-sidebar-foreground/40">v1.0.0</div>
      </SidebarFooter>
    </Sidebar>
  );
}
