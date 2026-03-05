import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Card, CardContent } from "@/components/ui/card";
import { Building2 } from "lucide-react";

/**
 * Landing page at "/".
 * Priority: URL > Session > Manual selection.
 * 
 * - If not authenticated → redirect to /auth
 * - If user has a single tenant → auto-redirect to /t/:slug
 * - If admin_global with multiple tenants → show selection list
 * - Uses RPC resolve_tenant_by_slug (SECURITY DEFINER) to avoid RLS issues
 */
export default function SelectTenant() {
  const { user, loading: authLoading } = useAuth();
  const { profile, isAdminGlobal, loading: profileLoading } = useUserProfile();
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || profileLoading) return;

    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    const fetchAndRedirect = async () => {
      // For regular users: resolve their tenant slug and redirect immediately
      if (!isAdminGlobal && profile?.tenant_id) {
        // Use direct query — RLS allows user to see their own empresa
        const { data } = await supabase
          .from("empresas")
          .select("slug")
          .eq("id", profile.tenant_id)
          .is("deleted_at", null)
          .single();

        if (data?.slug) {
          navigate(`/t/${data.slug}`, { replace: true });
          return;
        }
      }

      // For admin_global: fetch all active empresas
      if (isAdminGlobal) {
        const { data } = await supabase
          .from("empresas")
          .select("id, slug, razao_social, nome_fantasia, status")
          .is("deleted_at", null)
          .order("razao_social");

        const list = data || [];

        if (list.length === 1) {
          navigate(`/t/${list[0].slug}`, { replace: true });
          return;
        }

        setEmpresas(list);
      }

      setLoading(false);
    };

    fetchAndRedirect();
  }, [user, authLoading, profileLoading, isAdminGlobal, profile]);

  if (authLoading || profileLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-4">
        <div className="text-center space-y-2">
          <Building2 className="h-10 w-10 mx-auto text-primary" />
          <h1 className="text-xl font-semibold">Selecione a Empresa</h1>
          <p className="text-sm text-muted-foreground">Escolha a empresa que deseja acessar</p>
        </div>
        <div className="space-y-2">
          {empresas.map((e) => (
            <Card
              key={e.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/t/${e.slug}`)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{e.razao_social}</p>
                  {e.nome_fantasia && (
                    <p className="text-xs text-muted-foreground">{e.nome_fantasia}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {empresas.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              Nenhuma empresa disponível.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
