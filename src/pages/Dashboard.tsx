import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserProfile } from "@/hooks/useUserProfile";
import { ShoppingCart, Package, Store, DollarSign, Wrench, BarChart3 } from "lucide-react";

const modules = [
  { title: "Compras", icon: ShoppingCart, description: "Pedidos e entradas", color: "text-primary" },
  { title: "Estoque", icon: Package, description: "Movimentações e kardex", color: "text-accent" },
  { title: "Comercial", icon: Store, description: "Vendas e NF-e", color: "text-warning" },
  { title: "Financeiro", icon: DollarSign, description: "Contas a pagar/receber", color: "text-success" },
  { title: "Serviços", icon: Wrench, description: "Ordens de serviço", color: "text-muted-foreground" },
  { title: "Controladoria", icon: BarChart3, description: "DRE e fluxo de caixa", color: "text-destructive" },
];

export default function Dashboard() {
  const { profile, isAdminGlobal } = useUserProfile();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-xs text-muted-foreground">
          Bem-vindo, {profile?.nome || "Usuário"}
          {isAdminGlobal && " — Admin Global"}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {modules.map((mod) => (
          <Card key={mod.title} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="p-3 pb-1">
              <mod.icon className={`h-5 w-5 ${mod.color}`} />
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <CardTitle className="text-xs font-medium">{mod.title}</CardTitle>
              <p className="text-2xs text-muted-foreground mt-0.5">{mod.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm">Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-2xs text-muted-foreground">Em breve — KPIs financeiros</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm">Estoque</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-2xs text-muted-foreground">Em breve — Alertas de estoque baixo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm">Vendas</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-2xs text-muted-foreground">Em breve — Gráfico de vendas</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
