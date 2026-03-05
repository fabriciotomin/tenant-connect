import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { LogOut, User, Building2, ChevronDown } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppLayout() {
  const { signOut } = useAuth();
  const { profile, isAdminGlobal } = useUserProfile();
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas_switch"],
    enabled: isAdminGlobal,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, slug, razao_social, nome_fantasia, status")
        .is("deleted_at", null)
        .order("razao_social");
      if (error) throw error;
      return data;
    },
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const handleSwitchTenant = async (newSlug: string) => {
    const target = empresas.find((e) => e.slug === newSlug);
    if (target && profile) {
      try {
        // Update profile tenant_id BEFORE navigation so RLS is correct
        await supabase
          .from("profiles")
          .update({ tenant_id: target.id })
          .eq("id", profile.id);
      } catch (e) {
        console.warn("tenant switch profile update:", e);
      }
      // Clear all cached queries to prevent cross-tenant data leaks
      queryClient.clear();
    }
    navigate(`/t/${newSlug}`, { replace: true });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-10 border-b flex items-center justify-between px-2 bg-card shrink-0">
            <div className="flex items-center gap-1">
              <SidebarTrigger className="h-7 w-7" />
              {isAdminGlobal && empresas.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs ml-1">
                      <Building2 className="h-3.5 w-3.5" />
                      <span className="max-w-[150px] truncate">
                        {tenant?.nome_fantasia || tenant?.razao_social || "Empresa"}
                      </span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 max-h-64 overflow-auto">
                    {empresas.map((e) => (
                      <DropdownMenuItem
                        key={e.id}
                        className={`text-xs ${e.slug === tenant?.slug ? "bg-accent font-medium" : ""}`}
                        onClick={() => handleSwitchTenant(e.slug)}
                      >
                        {e.nome_fantasia || e.razao_social}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
                    <User className="h-3.5 w-3.5" />
                    <span className="max-w-[120px] truncate">{profile?.nome || "Usuário"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
                    {profile?.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-xs text-destructive">
                    <LogOut className="h-3.5 w-3.5 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
